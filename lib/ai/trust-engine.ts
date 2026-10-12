/**
 * Bazari AI Trust & Fraud Risk Engine (Phase 6)
 *
 * Produces an explainable, deterministic-first risk assessment for listings using:
 * 1. Deterministic signals (duplicate titles, price anomaly, phone numbers, scam keywords, account age)
 * 2. AI narrative explanation (Mistral primary -> Gemini fallback -> pure deterministic)
 *
 * Core principles:
 * - NEVER automatically ban, suspend, or hide a listing based on AI score alone.
 * - All actions require human moderator review.
 * - Risk scores are advisory and fully explainable.
 * - No private seller data is logged.
 * - Server-side only.
 */

import mongoose from "mongoose";
import Ad from "@/models/Ad";
import User from "@/models/User";
import Report from "@/models/Report";
import { connectDB } from "@/lib/db";
import { getMistralClient, getGeminiClient } from "@/lib/ai/marketplace-agent";
import { withRetry, extractErrorInfo } from "@/lib/ai/resilience";

/* -------------------------------------------------
   Types
------------------------------------------------- */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskSignal {
  key: string;
  label: string;
  points: number;
  detail: string;
}

export interface TrustAnalysisResult {
  riskScore: number;
  riskLevel: RiskLevel;
  signals: RiskSignal[];
  moderatorSummary: string;
  buyerNote: string;
  reportCount: number;
  duplicateCount: number;
  aiEnhanced: boolean;
  provider: "mistral" | "gemini" | "deterministic";
  analysedAt: string;
}

export interface TrustAnalysisInput {
  listingId: string;
  skipAI?: boolean;
}

/* -------------------------------------------------
   Constants
------------------------------------------------- */

const SCAM_KEYWORDS = [
  "whatsapp",
  "wire transfer",
  "bank transfer",
  "gift card",
  "advance payment",
  "refundable deposit",
  "western union",
  "moneygram",
  "contact me on",
  "paying first",
  "payment first",
  "no returns",
  "instant delivery",
  "escrow",
  "direct deposit",
  "zelle",
  "cashapp",
  "venmo",
  "click the link",
  "limited time offer",
  "first come first serve",
];

const HIGH_VALUE_BRANDS = [
  "iphone",
  "macbook",
  "rolex",
  "playstation",
  "xbox",
  "canon eos",
  "sony alpha",
  "nintendo switch",
  "airpods",
  "ipad",
];

const PHONE_REGEX =
  /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;

/* -------------------------------------------------
   Deterministic Signal Analysis
------------------------------------------------- */

interface DetectionContext {
  ad: any;
  seller: any;
  reportCount: number;
  duplicateCount: number;
  sellerActiveListingCount: number;
  sellerAccountAgeDays: number;
}

function buildDeterministicSignals(ctx: DetectionContext): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const { ad, reportCount, duplicateCount, sellerActiveListingCount, sellerAccountAgeDays } = ctx;
  const fullText = `${ad.title || ""} ${ad.description || ""}`.toLowerCase();

  // 1. Scam keywords
  const foundKeywords = SCAM_KEYWORDS.filter((kw) => fullText.includes(kw));
  if (foundKeywords.length > 0) {
    signals.push({
      key: "scam_keywords",
      label: "Suspicious payment or contact keywords",
      points: Math.min(foundKeywords.length * 3, 15),
      detail: `Contains: ${foundKeywords.slice(0, 4).join(", ")}`,
    });
  }

  // 2. Phone number in description
  const descCopy = ad.description || "";
  PHONE_REGEX.lastIndex = 0;
  if (PHONE_REGEX.test(descCopy)) {
    signals.push({
      key: "phone_in_description",
      label: "Phone number in description",
      points: 8,
      detail: "Sellers sharing phone numbers may be trying to move conversations off-platform.",
    });
  }

  // 3. ALL-CAPS title
  const titleClean = (ad.title || "").replace(/\s/g, "");
  if (titleClean.length > 5 && titleClean === titleClean.toUpperCase() && /[A-Z]/.test(titleClean)) {
    signals.push({
      key: "all_caps_title",
      label: "Title in ALL CAPS",
      points: 4,
      detail: "All-caps titles are a common spam/scam pattern.",
    });
  }

  // 4. Suspiciously low price for high-value item
  const isHighValue = HIGH_VALUE_BRANDS.some((b) => fullText.includes(b));
  if (isHighValue && ad.price > 0 && ad.price < 2000) {
    signals.push({
      key: "low_price_high_value",
      label: "Suspiciously low price for high-value brand",
      points: 12,
      detail: `Price Rs.${ad.price} is unusually low for a ${ad.category} item from a premium brand.`,
    });
  }

  // 5. Zero price
  if (ad.price === 0) {
    signals.push({
      key: "zero_price",
      label: "Price is zero",
      points: 3,
      detail: "Free listings may be used as lead magnets for scams.",
    });
  }

  // 6. Very short description
  if ((ad.description || "").trim().length < 20) {
    signals.push({
      key: "short_description",
      label: "Description is too short",
      points: 4,
      detail: "Legitimate sellers typically provide more product detail.",
    });
  }

  // 7. User-submitted reports
  if (reportCount >= 3) {
    signals.push({
      key: "multiple_reports",
      label: `${reportCount} user reports filed`,
      points: Math.min(reportCount * 4, 20),
      detail: "Multiple independent users have flagged this listing as suspicious.",
    });
  } else if (reportCount >= 1) {
    signals.push({
      key: "user_reported",
      label: `${reportCount} user report(s) filed`,
      points: reportCount * 2,
      detail: "One or more users have flagged this listing.",
    });
  }

  // 8. Near-duplicate listings from same seller
  if (duplicateCount >= 3) {
    signals.push({
      key: "duplicate_listings",
      label: `${duplicateCount} near-duplicate titles from same seller`,
      points: 10,
      detail: "Mass-posting identical listings is a common spam behaviour.",
    });
  } else if (duplicateCount >= 2) {
    signals.push({
      key: "possible_duplicate",
      label: `${duplicateCount} near-duplicate listings detected`,
      points: 5,
      detail: "Similar titles from the same seller may indicate spam.",
    });
  }

  // 9. New account with many listings
  if (sellerAccountAgeDays < 7 && sellerActiveListingCount >= 5) {
    signals.push({
      key: "new_account_bulk_listings",
      label: "New account with many listings",
      points: 10,
      detail: `Account is ${sellerAccountAgeDays} day(s) old with ${sellerActiveListingCount} active listings.`,
    });
  } else if (sellerAccountAgeDays < 3) {
    signals.push({
      key: "very_new_account",
      label: "Seller account is less than 3 days old",
      points: 5,
      detail: "Very new accounts have no established trust history on the platform.",
    });
  }

  // 10. No images
  if (!ad.images || ad.images.length === 0) {
    signals.push({
      key: "no_images",
      label: "No images uploaded",
      points: 3,
      detail: "Listings without photos are harder to verify.",
    });
  }

  return signals;
}

function computeRiskScore(signals: RiskSignal[]): number {
  return Math.min(Math.round(signals.reduce((s, sig) => s + sig.points, 0)), 100);
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 60) return "critical";
  if (score >= 35) return "high";
  if (score >= 15) return "medium";
  return "low";
}

function buildDeterministicNarrative(
  signals: RiskSignal[],
  riskLevel: RiskLevel,
  score: number
): { moderatorSummary: string; buyerNote: string } {
  if (signals.length === 0) {
    return {
      moderatorSummary: "No risk signals detected. This listing passes all automated checks.",
      buyerNote: "This listing passed our automated trust checks. Always use in-platform messaging and meet safely.",
    };
  }
  const topSignals = [...signals]
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((s) => s.label)
    .join("; ");

  const moderatorSummary =
    `Risk score: ${score}/100 (${riskLevel.toUpperCase()}). ` +
    `Top signals: ${topSignals}. ` +
    `This is an advisory assessment only. A human moderator must review before any action.`;

  const buyerNoteMap: Record<RiskLevel, string> = {
    low: "This listing passed our automated trust checks.",
    medium: "We noticed a few unusual patterns in this listing. Please use in-platform messaging and never pay outside of the platform.",
    high: "This listing has been flagged for moderator review. Exercise caution and report any issues.",
    critical: "This listing is under active moderator review. We recommend caution until it is cleared.",
  };

  return { moderatorSummary, buyerNote: buyerNoteMap[riskLevel] };
}

/* -------------------------------------------------
   AI Narrative Enhancement
------------------------------------------------- */

function extractJSONFromText(text: string): Record<string, any> | null {
  try {
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

async function generateAINarrative(
  ad: any,
  signals: RiskSignal[],
  score: number,
  riskLevel: RiskLevel,
  reportCount: number,
  duplicateCount: number,
  sellerAccountAgeDays: number
): Promise<{ moderatorSummary: string; buyerNote: string; provider: "mistral" | "gemini" } | null> {
  const signalList = signals.map((s) => `- ${s.label} (+${s.points} pts): ${s.detail}`).join("\n");

  const prompt = `You are a marketplace trust and safety analyst assistant. Produce two concise, factual, non-accusatory summaries for a listing risk assessment. Use only the facts provided. Do not accuse the seller of fraud.

LISTING FACTS:
- Title: ${ad.title || "N/A"}
- Category: ${ad.category || "N/A"}
- Price: Rs.${ad.price ?? "N/A"}
- Description length: ${(ad.description || "").length} characters
- Images: ${ad.images?.length ?? 0}
- Seller account age: ${sellerAccountAgeDays} day(s)
- User reports: ${reportCount}
- Near-duplicate listings: ${duplicateCount}

DETECTED RISK SIGNALS (${signals.length} total):
${signalList || "None"}

RISK SCORE: ${score}/100 (${riskLevel.toUpperCase()})

Produce EXACTLY this JSON (no markdown, no extra text):
{"moderatorSummary":"<2-3 sentence factual summary for a human moderator>","buyerNote":"<1 sentence non-accusatory note for buyers>"}`;

  // Try Mistral
  try {
    const mistral = getMistralClient();
    if (mistral) {
      const response = await withRetry(
        () => mistral.chat.complete({
          model: process.env.MISTRAL_AGENT_MODEL || "mistral-small-latest",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          maxTokens: 350,
        }),
        { maxRetries: 1, providerName: "Mistral-Trust" }
      );
      const text = (response.choices?.[0]?.message?.content as string) || "";
      const parsed = extractJSONFromText(text);
      if (parsed?.moderatorSummary && parsed?.buyerNote) {
        return { moderatorSummary: parsed.moderatorSummary, buyerNote: parsed.buyerNote, provider: "mistral" };
      }
    }
  } catch (err) {
    const info = extractErrorInfo(err);
    console.warn(`[trust-engine] Mistral failed (${info.status ?? "err"}): ${info.message.slice(0, 80)}`);
  }

  // Gemini fallback
  try {
    const genai = getGeminiClient();
    if (genai) {
      const response = await withRetry(
        () => genai.models.generateContent({
          model: process.env.GEMINI_AGENT_MODEL || "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { temperature: 0.1, maxOutputTokens: 350 },
        }),
        { maxRetries: 1, providerName: "Gemini-Trust" }
      );
      const text = response.text || "";
      const parsed = extractJSONFromText(text);
      if (parsed?.moderatorSummary && parsed?.buyerNote) {
        return { moderatorSummary: parsed.moderatorSummary, buyerNote: parsed.buyerNote, provider: "gemini" };
      }
    }
  } catch (err) {
    const info = extractErrorInfo(err);
    console.warn(`[trust-engine] Gemini failed (${info.status ?? "err"}): ${info.message.slice(0, 80)}`);
  }

  return null;
}

/* -------------------------------------------------
   Main Entry Point
------------------------------------------------- */

/**
 * Performs a full trust & fraud risk analysis for a listing.
 * Never modifies listing status — human moderation required.
 */
export async function analyseListingRisk(input: TrustAnalysisInput): Promise<TrustAnalysisResult> {
  await connectDB();

  if (!input.listingId || !/^[a-f\d]{24}$/i.test(input.listingId)) {
    throw new Error("Invalid listing ID format");
  }

  const listingOid = new mongoose.Types.ObjectId(input.listingId);

  const [ad, reportCount] = await Promise.all([
    Ad.findById(listingOid).lean(),
    Report.countDocuments({ listingId: listingOid }),
  ]);

  if (!ad) throw new Error("Listing not found");

  const seller = await User.findById((ad as any).user).lean();
  const sellerAccountAgeDays = seller
    ? Math.floor((Date.now() - new Date((seller as any).createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Near-duplicate detection: other active listings by same seller with overlapping title words
  const titleWords = ((ad as any).title || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w: string) => w.length > 3)
    .slice(0, 4);

  let duplicateCount = 0;
  if (titleWords.length >= 2 && (ad as any).user) {
    const titleRegex = new RegExp(titleWords.join("|"), "i");
    duplicateCount = await Ad.countDocuments({
      _id: { $ne: listingOid },
      user: (ad as any).user,
      status: "active",
      title: { $regex: titleRegex },
    });
  }

  const sellerActiveListingCount = (ad as any).user
    ? await Ad.countDocuments({ user: (ad as any).user, status: "active" })
    : 0;

  const ctx: DetectionContext = {
    ad,
    seller,
    reportCount,
    duplicateCount,
    sellerActiveListingCount,
    sellerAccountAgeDays,
  };

  const signals = buildDeterministicSignals(ctx);
  const riskScore = computeRiskScore(signals);
  const riskLevel = scoreToLevel(riskScore);

  const { moderatorSummary: detSummary, buyerNote: detNote } = buildDeterministicNarrative(signals, riskLevel, riskScore);

  let aiEnhanced = false;
  let provider: TrustAnalysisResult["provider"] = "deterministic";
  let moderatorSummary = detSummary;
  let buyerNote = detNote;

  if (!input.skipAI && signals.length > 0) {
    const ai = await generateAINarrative(ad, signals, riskScore, riskLevel, reportCount, duplicateCount, sellerAccountAgeDays);
    if (ai) {
      moderatorSummary = ai.moderatorSummary;
      buyerNote = ai.buyerNote;
      provider = ai.provider;
      aiEnhanced = true;
    }
  }

  return {
    riskScore,
    riskLevel,
    signals,
    moderatorSummary,
    buyerNote,
    reportCount,
    duplicateCount,
    aiEnhanced,
    provider,
    analysedAt: new Date().toISOString(),
  };
}

/**
 * Batched, deterministic risk analysis for multiple listings.
 * Eliminates N+1 query patterns by fetching ads, sellers, and report counts in 3 bulk queries.
 */
export async function analyseListingRiskBatch(
  listingIds: string[]
): Promise<Record<string, TrustAnalysisResult>> {
  await connectDB();
  const validIds = listingIds.filter((id) => /^[a-f\d]{24}$/i.test(id));
  if (validIds.length === 0) return {};

  const oids = validIds.map((id) => new mongoose.Types.ObjectId(id));

  // 1. Bulk fetch all ads
  const ads = await Ad.find({ _id: { $in: oids } })
    .select("title description price category images user status createdAt")
    .lean();

  const adMap = new Map<string, any>();
  const sellerIds = new Set<string>();
  for (const ad of ads) {
    adMap.set(String(ad._id), ad);
    if ((ad as any).user) sellerIds.add(String((ad as any).user));
  }

  // 2. Bulk fetch all relevant sellers
  const sellerOids = Array.from(sellerIds).map((id) => new mongoose.Types.ObjectId(id));
  const sellers = await User.find({ _id: { $in: sellerOids } })
    .select("_id createdAt")
    .lean();
  const sellerMap = new Map<string, any>();
  for (const s of sellers) {
    sellerMap.set(String((s as any)._id), s);
  }

  // 3. Bulk aggregate report counts per listing
  const reportCounts = await Report.aggregate([
    { $match: { listingId: { $in: oids } } },
    { $group: { _id: "$listingId", count: { $sum: 1 } } },
  ]);
  const reportCountMap = new Map<string, number>();
  for (const rc of reportCounts) {
    reportCountMap.set(String(rc._id), rc.count);
  }

  const results: Record<string, TrustAnalysisResult> = {};
  for (const id of validIds) {
    const ad = adMap.get(id);
    if (!ad) continue;

    const seller = (ad as any).user ? sellerMap.get(String((ad as any).user)) : null;
    const sellerAccountAgeDays = seller?.createdAt
      ? Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const reportCount = reportCountMap.get(id) || 0;

    const ctx: DetectionContext = {
      ad,
      seller,
      reportCount,
      duplicateCount: 0,
      sellerActiveListingCount: 1,
      sellerAccountAgeDays,
    };

    const signals = buildDeterministicSignals(ctx);
    const riskScore = computeRiskScore(signals);
    const riskLevel = scoreToLevel(riskScore);
    const { moderatorSummary, buyerNote } = buildDeterministicNarrative(signals, riskLevel, riskScore);

    results[id] = {
      riskScore,
      riskLevel,
      signals,
      moderatorSummary,
      buyerNote,
      reportCount,
      duplicateCount: 0,
      aiEnhanced: false,
      provider: "deterministic",
      analysedAt: new Date().toISOString(),
    };
  }

  return results;
}

