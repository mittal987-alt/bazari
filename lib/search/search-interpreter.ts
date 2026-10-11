/**
 * Bazari Intelligent Query Understanding & Search Interpreter (Phase 7)
 *
 * Interprets natural language shopping requests into a validated, typed search object.
 * - Multi-provider AI architecture (Mistral primary -> Gemini fallback)
 * - Deterministic fallback parser (100% offline, zero network dependencies)
 * - Strict server-side validation (AI can never execute arbitrary DB queries)
 * - Transparent clarification prompts for ambiguous or missing location queries.
 */

import { getMistralClient, getGeminiClient } from "@/lib/ai/marketplace-agent";
import { withRetry, extractErrorInfo } from "@/lib/ai/resilience";
import {
  normalizeText,
  extractSearchTokens,
  parsePrice,
  extractCondition,
  extractBrand,
  inferCategory,
} from "./search-normalization";

export type SearchIntent =
  | "search"
  | "compare"
  | "alternatives"
  | "price_check"
  | "clarify";

export interface InterpretedSearchQuery {
  intent: SearchIntent;
  query: string;
  category?: string;
  brand?: string;
  condition?: "new" | "used" | "refurbished";
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  nearMe?: boolean;
  referenceListingId?: string;
  sortBy?: "relevance" | "price_low" | "price_high" | "trending" | "newest";
  clarificationQuestion?: string;
  confidence: number;
  provider: "mistral" | "gemini" | "deterministic";
  tokens: string[];
  attributes?: Record<string, string>;
}

export interface SearchInterpretOptions {
  activeListingId?: string;
  userCity?: string;
  forceDeterministic?: boolean;
}

const VALID_CATEGORIES = [
  "Electronics",
  "Mobiles",
  "Vehicles",
  "Bikes",
  "Furniture",
  "Fashion",
  "Books",
  "Sports",
  "Services",
  "Other",
];

/**
 * Validates and sanitizes an interpreted search query to ensure no illegal
 * parameters or arbitrary DB bypass can occur.
 */
export function sanitizeInterpretedQuery(
  raw: Partial<InterpretedSearchQuery>,
  provider: "mistral" | "gemini" | "deterministic"
): InterpretedSearchQuery {
  let intent: SearchIntent = "search";
  if (
    raw.intent &&
    ["search", "compare", "alternatives", "price_check", "clarify"].includes(
      raw.intent
    )
  ) {
    intent = raw.intent;
  }

  // Clean query
  const query = typeof raw.query === "string" ? raw.query.trim().slice(0, 100) : "";

  // Category validation
  let category = typeof raw.category === "string" ? raw.category.trim() : undefined;
  if (category) {
    const matchedCat = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === category!.toLowerCase()
    );
    category = matchedCat || undefined;
  }

  // Price validation
  let minPrice = typeof raw.minPrice === "number" ? Math.max(0, Math.round(raw.minPrice)) : undefined;
  let maxPrice = typeof raw.maxPrice === "number" ? Math.max(0, Math.round(raw.maxPrice)) : undefined;

  if (minPrice !== undefined && isNaN(minPrice)) minPrice = undefined;
  if (maxPrice !== undefined && isNaN(maxPrice)) maxPrice = undefined;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    const temp = minPrice;
    minPrice = maxPrice;
    maxPrice = temp;
  }

  // Condition validation
  let condition = raw.condition;
  if (condition && !["new", "used", "refurbished"].includes(condition)) {
    condition = undefined;
  }

  // Sort validation
  let sortBy = raw.sortBy;
  if (
    sortBy &&
    !["relevance", "price_low", "price_high", "trending", "newest"].includes(sortBy)
  ) {
    sortBy = "relevance";
  }

  // City validation
  const city =
    typeof raw.city === "string" && raw.city.trim().length > 0
      ? raw.city.trim().slice(0, 50)
      : undefined;

  // Reference listing id validation
  const referenceListingId =
    typeof raw.referenceListingId === "string" &&
    /^[a-f\d]{24}$/i.test(raw.referenceListingId.trim())
      ? raw.referenceListingId.trim()
      : undefined;

  const { tokens } = extractSearchTokens(query || "");

  return {
    intent,
    query,
    category,
    brand: typeof raw.brand === "string" ? raw.brand.trim().slice(0, 50) : undefined,
    condition,
    minPrice,
    maxPrice,
    city,
    nearMe: Boolean(raw.nearMe),
    referenceListingId,
    sortBy: sortBy || "relevance",
    clarificationQuestion:
      typeof raw.clarificationQuestion === "string"
        ? raw.clarificationQuestion.trim().slice(0, 200)
        : undefined,
    confidence: typeof raw.confidence === "number" ? Math.min(1, Math.max(0, raw.confidence)) : 0.8,
    provider,
    tokens,
    attributes: raw.attributes || {},
  };
}

/**
 * 100% Deterministic search query interpreter.
 * Runs instantly without network, providing seamless fallback when AI providers are unavailable.
 */
export function interpretQueryDeterministic(
  text: string,
  options: SearchInterpretOptions = {}
): InterpretedSearchQuery {
  const norm = normalizeText(text);

  // Intent detection
  let intent: SearchIntent = "search";
  let clarificationQuestion: string | undefined;

  if (/\b(compare|versus|vs|difference between)\b/i.test(norm)) {
    intent = "compare";
  } else if (/\b(cheaper alternatives?|alternatives?|similar to this|cheaper options?)\b/i.test(norm)) {
    intent = "alternatives";
    if (!options.activeListingId) {
      clarificationQuestion = "Which listing would you like to see cheaper alternatives for?";
    }
  } else if (/\b(fair price|fairness|is this a good deal|worth it|price check)\b/i.test(norm)) {
    intent = "price_check";
  }

  // Near me detection
  const nearMe = /\b(near me|nearby|around here|local|close to me)\b/i.test(norm);
  let city = options.userCity;
  if (nearMe && !city) {
    // Check if city is explicitly mentioned
    const cityMatch = norm.match(/\b(in|at|near)\s+([a-z\s]+?)(?:\s+(?:under|for|with|below)|$)/i);
    if (cityMatch && cityMatch[2] && !["me", "here"].includes(cityMatch[2].trim())) {
      city = cityMatch[2].trim();
    } else {
      clarificationQuestion = clarificationQuestion || "Which city or area should I look near?";
    }
  }

  // Price extraction
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  // "between 10k and 20k" or "from 10000 to 20000"
  const rangeMatch = norm.match(
    /(?:between|from)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)\s*(?:to|and|-)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)/i
  );
  if (rangeMatch) {
    minPrice = parsePrice(rangeMatch[1]);
    maxPrice = parsePrice(rangeMatch[2]);
  } else {
    // "under 50k", "below 30,000", "< 50000"
    const underMatch = norm.match(
      /(?:under|below|less than|max|budget(?: of)?|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)/i
    );
    if (underMatch) {
      maxPrice = parsePrice(underMatch[1]);
    }

    // "above 10k", "over 20,000", "min 5000"
    const aboveMatch = norm.match(
      /(?:above|over|more than|min|at least)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)/i
    );
    if (aboveMatch) {
      minPrice = parsePrice(aboveMatch[1]);
    }
  }

  // Condition
  const condition = extractCondition(norm);

  // Brand
  const brand = extractBrand(norm);

  // Category
  const category = inferCategory(norm);

  // Sort direction
  let sortBy: InterpretedSearchQuery["sortBy"] = "relevance";
  if (/\b(cheapest|lowest price|cheap|price low)\b/i.test(norm)) {
    sortBy = "price_low";
  } else if (/\b(highest price|expensive|premium)\b/i.test(norm)) {
    sortBy = "price_high";
  } else if (/\b(newest|latest|recent)\b/i.test(norm)) {
    sortBy = "newest";
  } else if (/\b(trending|popular)\b/i.test(norm)) {
    sortBy = "trending";
  }

  // Clean remaining text for keyword search
  let cleaned = norm
    .replace(/(?:between|from)\s*(?:₹|rs\.?|inr)?\s*[\d,k.lakhs]+\s*(?:to|and|-)\s*(?:₹|rs\.?|inr)?\s*[\d,k.lakhs]+/gi, "")
    .replace(/(?:under|below|less than|above|over|more than|budget(?: of)?|within)\s*(?:₹|rs\.?|inr)?\s*[\d,k.lakhs]+/gi, "")
    .replace(/\b(find|search|show|get|looking for|want|need|compare|versus|vs|near me|nearby)\b/gi, "")
    .replace(/\b(used|second hand|pre-owned|brand new|refurbished|new in box|good condition|in good condition)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // If cleaned is empty, retain original core terms
  if (!cleaned && (category || brand)) {
    cleaned = [brand, category].filter(Boolean).join(" ");
  }

  return sanitizeInterpretedQuery(
    {
      intent,
      query: cleaned || text.slice(0, 100),
      category,
      brand,
      condition,
      minPrice,
      maxPrice,
      city,
      nearMe,
      referenceListingId: options.activeListingId,
      sortBy,
      clarificationQuestion,
      confidence: 0.85,
    },
    "deterministic"
  );
}

/**
 * AI-assisted search query understanding using hosted Mistral primary with Gemini fallback.
 * Falls back transparently to interpretQueryDeterministic if both providers are unavailable.
 */
export async function interpretSearchQuery(
  rawText: string,
  options: SearchInterpretOptions = {}
): Promise<InterpretedSearchQuery> {
  const text = (rawText || "").trim();
  if (!text) {
    return interpretQueryDeterministic("", options);
  }

  if (options.forceDeterministic) {
    return interpretQueryDeterministic(text, options);
  }

  const systemPrompt = `You are the Bazari Marketplace Intelligent Search Parser.
Convert the buyer's natural language shopping request into a strictly validated JSON search object.

Rules:
1. Extract intent: "search", "compare", "alternatives", "price_check", or "clarify".
2. Extract exact price constraints: minPrice and maxPrice as numbers (handle ₹, Rs, k, Lakhs).
3. Extract category only from: ["Electronics", "Mobiles", "Vehicles", "Bikes", "Furniture", "Fashion", "Books", "Sports", "Services", "Other"].
4. Extract brand, condition ("new" | "used" | "refurbished"), city, nearMe (boolean).
5. Extract pure search keywords in "query" without filler phrases like "find me", "under 50k", etc.
6. NEVER invent missing locations, specifications, or attributes. If a crucial detail is missing or ambiguous (e.g. user says "near me" but location is unknown), provide a polite, concise clarificationQuestion.
7. Return ONLY valid JSON with keys: intent, query, category, brand, condition, minPrice, maxPrice, city, nearMe, sortBy, clarificationQuestion, confidence.`;

  // 1. Try Mistral Primary
  const mistralClient = getMistralClient();
  if (mistralClient) {
    try {
      const response = await withRetry(
        () =>
          mistralClient.chat.complete({
            model: process.env.MISTRAL_AGENT_MODEL || "mistral-small-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Buyer query: "${text}"\nActive Listing ID: ${options.activeListingId || "none"}` },
            ],
            responseFormat: { type: "json_object" },
            temperature: 0.1,
          }),
        { maxRetries: 1 }
      );

      const content = response.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        const parsed = JSON.parse(content);
        return sanitizeInterpretedQuery(
          {
            ...parsed,
            referenceListingId: options.activeListingId,
          },
          "mistral"
        );
      }
    } catch (err) {
      console.warn("[search:interpreter] Mistral failed, trying Gemini fallback:", extractErrorInfo(err).message);
    }
  }

  // 2. Try Gemini Fallback
  const geminiClient = getGeminiClient();
  if (geminiClient) {
    try {
      const response = await withRetry(
        () =>
          geminiClient.models.generateContent({
            model: process.env.GEMINI_AGENT_MODEL || "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nBuyer query: "${text}"\nActive Listing ID: ${options.activeListingId || "none"}`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        { maxRetries: 1 }
      );

      const candidateText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        const parsed = JSON.parse(candidateText);
        return sanitizeInterpretedQuery(
          {
            ...parsed,
            referenceListingId: options.activeListingId,
          },
          "gemini"
        );
      }
    } catch (err) {
      console.warn("[search:interpreter] Gemini also failed, falling back to deterministic parser:", extractErrorInfo(err).message);
    }
  }

  // 3. Fallback to deterministic parser
  return interpretQueryDeterministic(text, options);
}
