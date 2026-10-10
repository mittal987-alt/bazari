/**
 * Bazari Marketplace Agent
 *
 * Gemini function-calling orchestrator with a bounded tool-calling loop.
 * - Maximum MAX_TOOL_ROUNDS rounds of tool calls to prevent infinite loops.
 * - Each tool call is validated before dispatch.
 * - Tool results are returned to Gemini as functionResponse parts.
 * - On provider failure, falls back to keyword search + plain Mistral/Gemini response.
 */

import { GoogleGenAI, Content, Part } from "@google/genai";
import { MARKETPLACE_TOOLS, VALID_TOOL_NAMES, type MarketplaceToolName } from "./marketplace-tool-schemas";
import {
  toolSearchProducts,
  toolGetProductDetails,
  toolCompareProducts,
  toolGetSellerInformation,
  toolEstimatePriceFairness,
  toolGetRecommendations,
  type NormalizedListing,
  type ComparisonResult,
  type SellerInfo,
  type PriceFairnessResult,
  type RankedRecommendation,
} from "./marketplace-tools";

/* ─────────────────────────────────────────────
   Configuration
───────────────────────────────────────────── */

const MAX_TOOL_ROUNDS = 5;
const AGENT_MODEL = "gemini-2.5-flash";
const AGENT_TIMEOUT_MS = 30_000;

/* ─────────────────────────────────────────────
   Public response types
───────────────────────────────────────────── */

export interface AgentProduct {
  _id: string;
  title: string;
  descriptionExcerpt: string;
  price: number;
  category: string;
  locationName: string;
  images: string[];
  listingUrl: string;
  sellerId: string;
  status: string;
  createdAt: string;
  views: number;
  isGroupBuy?: boolean;
  groupBuyPrice?: number;
  score?: number;
  reasons?: string[];
}

export interface AgentComparison {
  listings: AgentProduct[];
  summary: {
    cheapest: string | null;
    mostExpensive: string | null;
    newestListing: string | null;
    oldestListing: string | null;
  };
}

export interface AgentPriceFairness {
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  averageMarketPrice: number | null;
  assessment: "fair" | "below_market" | "above_market" | "insufficient_data";
  percentageDiff: number | null;
  note: string;
}

export interface AgentSellerInfo {
  _id: string;
  name: string;
  averageRating: number;
  reviewCount: number;
  isTrusted: boolean;
  accountAgeDays: number;
}

export interface AgentResponse {
  answer: string;
  products?: AgentProduct[];
  comparison?: AgentComparison;
  priceFairness?: AgentPriceFairness;
  sellerInfo?: AgentSellerInfo;
  suggestions?: string[];
  error?: string;
}

/* ─────────────────────────────────────────────
   Gemini client (lazy)
───────────────────────────────────────────── */

let _gemini: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!_gemini) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");
    _gemini = new GoogleGenAI({ apiKey: key });
  }
  return _gemini;
}

/* ─────────────────────────────────────────────
   Tool dispatcher (validated)
───────────────────────────────────────────── */

async function dispatchTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (!VALID_TOOL_NAMES.has(name)) {
    return { error: `Unknown tool: ${name}`, code: "UNKNOWN_TOOL" };
  }

  const toolName = name as MarketplaceToolName;

  switch (toolName) {
    case "search_products":
      return toolSearchProducts({
        query: typeof args.query === "string" ? args.query : undefined,
        category: typeof args.category === "string" ? args.category : undefined,
        minPrice: typeof args.minPrice === "number" ? args.minPrice : undefined,
        maxPrice: typeof args.maxPrice === "number" ? args.maxPrice : undefined,
        condition: typeof args.condition === "string" ? args.condition : undefined,
        city: typeof args.city === "string" ? args.city : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });

    case "get_product_details":
      if (typeof args.listingId !== "string") {
        return { error: "listingId must be a string", code: "INVALID_ARG" };
      }
      return toolGetProductDetails(args.listingId);

    case "compare_products": {
      const ids = args.listingIds;
      if (!Array.isArray(ids)) {
        return { error: "listingIds must be an array", code: "INVALID_ARG" };
      }
      const stringIds = ids.filter((id): id is string => typeof id === "string");
      if (stringIds.length !== ids.length) {
        return { error: "All listingIds must be strings", code: "INVALID_ARG" };
      }
      return toolCompareProducts(stringIds);
    }

    case "get_seller_information":
      if (typeof args.sellerId !== "string") {
        return { error: "sellerId must be a string", code: "INVALID_ARG" };
      }
      return toolGetSellerInformation(args.sellerId);

    case "estimate_price_fairness":
      if (typeof args.listingId !== "string") {
        return { error: "listingId must be a string", code: "INVALID_ARG" };
      }
      return toolEstimatePriceFairness(args.listingId);

    case "get_recommendations":
      if (typeof args.query !== "string") {
        return { error: "query must be a string", code: "INVALID_ARG" };
      }
      return toolGetRecommendations({
        query: args.query,
        category: typeof args.category === "string" ? args.category : undefined,
        maxPrice: typeof args.maxPrice === "number" ? args.maxPrice : undefined,
        city: typeof args.city === "string" ? args.city : undefined,
      });

    default: {
      const _exhaustive: never = toolName;
      return { error: `Unhandled tool: ${_exhaustive}`, code: "UNKNOWN_TOOL" };
    }
  }
}

/* ─────────────────────────────────────────────
   Result accumulator — collects structured data
   across multiple tool rounds
───────────────────────────────────────────── */

interface AccumulatedResults {
  products: AgentProduct[];
  comparison?: AgentComparison;
  priceFairness?: AgentPriceFairness;
  sellerInfo?: AgentSellerInfo;
}

function accumulateResult(
  result: unknown,
  toolName: MarketplaceToolName,
  accumulated: AccumulatedResults
): void {
  if (!result || typeof result !== "object") return;
  if ("error" in (result as object)) return; // tool error — model will describe it

  switch (toolName) {
    case "search_products": {
      const listings = result as NormalizedListing[];
      listings.forEach((l) => {
        if (!accumulated.products.some((p) => p._id === l._id)) {
          accumulated.products.push({ ...l });
        }
      });
      break;
    }

    case "get_product_details": {
      const l = result as NormalizedListing;
      if (!accumulated.products.some((p) => p._id === l._id)) {
        accumulated.products.push({ ...l });
      }
      break;
    }

    case "compare_products": {
      const comp = result as ComparisonResult;
      accumulated.comparison = {
        listings: comp.listings.map((l) => ({ ...l })),
        summary: comp.summary,
      };
      comp.listings.forEach((l) => {
        if (!accumulated.products.some((p) => p._id === l._id)) {
          accumulated.products.push({ ...l });
        }
      });
      break;
    }

    case "get_seller_information": {
      const seller = result as SellerInfo;
      accumulated.sellerInfo = {
        _id: seller._id,
        name: seller.name,
        averageRating: seller.averageRating,
        reviewCount: seller.reviewCount,
        isTrusted: seller.isTrusted,
        accountAgeDays: seller.accountAgeDays,
      };
      break;
    }

    case "estimate_price_fairness": {
      const fairness = result as PriceFairnessResult;
      accumulated.priceFairness = {
        listingId: fairness.listingId,
        listingTitle: fairness.listingTitle,
        listingPrice: fairness.listingPrice,
        averageMarketPrice: fairness.averageMarketPrice,
        assessment: fairness.assessment,
        percentageDiff: fairness.percentageDiff,
        note: fairness.note,
      };
      break;
    }

    case "get_recommendations": {
      const recs = result as RankedRecommendation[];
      recs.forEach((r) => {
        if (!accumulated.products.some((p) => p._id === r.listing._id)) {
          accumulated.products.push({
            ...r.listing,
            score: r.score,
            reasons: r.reasons,
          });
        }
      });
      break;
    }
  }
}

/* ─────────────────────────────────────────────
   Suggested follow-up questions
───────────────────────────────────────────── */

function buildSuggestions(accumulated: AccumulatedResults, userQuery: string): string[] {
  const suggestions: string[] = [];

  if (accumulated.products.length >= 2 && !accumulated.comparison) {
    suggestions.push("Compare the first two listings for me");
  }
  if (accumulated.products.length > 0 && !accumulated.priceFairness) {
    suggestions.push(`Is the price fair for "${accumulated.products[0].title}"?`);
  }
  if (accumulated.products.length > 0 && accumulated.products[0].sellerId) {
    suggestions.push("Tell me about the seller of the first result");
  }
  if (!userQuery.includes("recommend") && accumulated.products.length === 0) {
    suggestions.push("Show me recommendations in this category");
  }

  return suggestions.slice(0, 3);
}

/* ─────────────────────────────────────────────
   System prompt
───────────────────────────────────────────── */

const SYSTEM_INSTRUCTION = `You are Bazari AI, an intelligent marketplace assistant for Bazari — a second-hand marketplace.

Your capabilities:
- search_products: Search for real listings with filters (price, category, city, condition)
- get_product_details: Get full details of a specific listing
- compare_products: Compare 2-5 listings side by side
- get_seller_information: Get verified public seller reputation data
- estimate_price_fairness: Assess whether a listing's price is competitive
- get_recommendations: Get ranked listing recommendations matching user requirements

Rules you MUST follow:
1. NEVER invent products, prices, seller ratings, availability, or any marketplace data.
2. ONLY use data from tool results. If a tool returns no results, say so clearly.
3. You are READ-ONLY. NEVER create, modify, purchase, or transact on listings.
4. If the user's location is needed and unknown, ask for it politely.
5. Always mention prices in Indian Rupees (₹).
6. If a tool returns an error, explain the issue to the user in plain language.
7. When data is insufficient for a price estimate, say clearly that a reliable estimate is unavailable.
8. Never guarantee that a seller is safe or trustworthy — only share verified facts.
9. Keep responses concise, helpful, and focused on the user's actual question.
10. For follow-up questions referencing earlier results (e.g., "compare the first two"), use the listing IDs from the conversation context.`;

/* ─────────────────────────────────────────────
   Main agent entry point
───────────────────────────────────────────── */

export interface AgentRequest {
  message: string;
  history?: Array<{ role: "user" | "model"; content: string }>;
}

export async function runMarketplaceAgent(
  request: AgentRequest
): Promise<AgentResponse> {
  const timeoutPromise = new Promise<AgentResponse>((_, reject) =>
    setTimeout(() => reject(new Error("Agent request timed out")), AGENT_TIMEOUT_MS)
  );

  return Promise.race([_runAgent(request), timeoutPromise]).catch((err) => {
    console.error("[marketplace-agent] Fatal error:", err);
    return {
      answer:
        "I'm having trouble processing your request right now. Please try again in a moment or browse listings directly.",
      error: "AGENT_ERROR",
    };
  });
}

async function _runAgent(request: AgentRequest): Promise<AgentResponse> {
  const gemini = getGemini();
  const accumulated: AccumulatedResults = { products: [] };

  // Build conversation history as Content[]
  const conversationHistory: Content[] = (request.history || []).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  // Current user turn
  conversationHistory.push({
    role: "user",
    parts: [{ text: request.message }],
  });

  let rounds = 0;
  let finalText = "";

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    let response;
    try {
      response = await gemini.models.generateContent({
        model: AGENT_MODEL,
        contents: conversationHistory,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: MARKETPLACE_TOOLS,
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });
    } catch (geminiErr) {
      console.error("[marketplace-agent] Gemini error:", geminiErr);
      return {
        answer:
          "My AI service is temporarily unavailable. Here are some direct actions you can take: browse the marketplace at /ads or use the search bar above.",
        products: accumulated.products.length > 0 ? accumulated.products : undefined,
        error: "PROVIDER_ERROR",
      };
    }

    // Check for function calls
    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      // No more tool calls — this is the final answer
      finalText = response.text || "";
      break;
    }

    // Add the model's response (with function calls) to history
    const modelParts: Part[] = functionCalls.map((fc) => ({
      functionCall: {
        id: fc.id,
        name: fc.name,
        args: fc.args,
      },
    }));

    conversationHistory.push({
      role: "model",
      parts: modelParts,
    });

    // Execute all requested tool calls and gather responses
    const functionResponseParts: Part[] = [];

    for (const fc of functionCalls) {
      const toolName = fc.name || "";
      const toolArgs = (fc.args || {}) as Record<string, unknown>;

      const toolResult = await dispatchTool(toolName, toolArgs);

      // Accumulate structured data for the response
      if (VALID_TOOL_NAMES.has(toolName)) {
        accumulateResult(toolResult, toolName as MarketplaceToolName, accumulated);
      }

      // Build function response part for Gemini
      functionResponseParts.push({
        functionResponse: {
          id: fc.id,
          name: toolName,
          response: { result: toolResult },
        },
      });
    }

    // Add tool results as a "user" turn (per Gemini function calling protocol)
    conversationHistory.push({
      role: "user",
      parts: functionResponseParts,
    });
  }

  // If we hit max rounds without a text response, ask for summary
  if (!finalText && rounds >= MAX_TOOL_ROUNDS) {
    try {
      const summaryResponse = await gemini.models.generateContent({
        model: AGENT_MODEL,
        contents: [
          ...conversationHistory,
          {
            role: "user",
            parts: [
              {
                text: "Please summarize the search results you found and provide your recommendation to the user.",
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      });
      finalText = summaryResponse.text || "Here are the results I found based on your query.";
    } catch {
      finalText = "Here are the results I found based on your query.";
    }
  }

  if (!finalText) {
    finalText = "I found some results for you. Please see the listings below.";
  }

  const suggestions = buildSuggestions(accumulated, request.message);

  const agentResponse: AgentResponse = {
    answer: finalText,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };

  if (accumulated.products.length > 0) {
    agentResponse.products = accumulated.products;
  }
  if (accumulated.comparison) {
    agentResponse.comparison = accumulated.comparison;
  }
  if (accumulated.priceFairness) {
    agentResponse.priceFairness = accumulated.priceFairness;
  }
  if (accumulated.sellerInfo) {
    agentResponse.sellerInfo = accumulated.sellerInfo;
  }

  return agentResponse;
}
