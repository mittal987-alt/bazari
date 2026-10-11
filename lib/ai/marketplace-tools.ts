/**
 * Bazari Marketplace Tool Implementations
 *
 * Server-side, read-only tool functions that execute the actual database queries.
 * All input is validated before reaching MongoDB.
 * Private seller data (email, password, phone) is never returned.
 */

import mongoose from "mongoose";
import Ad from "@/models/Ad";
import User from "@/models/User";
import Review from "@/models/Review";
import { connectDB } from "@/lib/db";
import { findBenchmark } from "@/lib/market-benchmarks";
import { extractSearchTokens } from "@/lib/search/search-normalization";
import { rankListings } from "@/lib/search/search-ranking";

/* ─────────────────────────────────────────────
   Shared types
───────────────────────────────────────────── */

export interface NormalizedListing {
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
  tradeOffs?: string[];
  savings?: number;
  referenceListingId?: string;
}

export interface SellerInfo {
  _id: string;
  name: string;
  averageRating: number;
  reviewCount: number;
  isTrusted: boolean;
  accountAgeDays: number;
  role: string;
}

export interface PriceFairnessResult {
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  comparableCount: number;
  averageMarketPrice: number | null;
  minMarketPrice: number | null;
  maxMarketPrice: number | null;
  assessment: "fair" | "below_market" | "above_market" | "insufficient_data";
  percentageDiff: number | null;
  benchmarkUsed: string | null;
  note: string;
}

export interface ToolError {
  error: string;
  code: string;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const MAX_LIMIT = 10;
const DESCRIPTION_EXCERPT_LENGTH = 200;

function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

function normalizeListing(ad: any): NormalizedListing {
  return {
    _id: String(ad._id),
    title: ad.title || "",
    descriptionExcerpt:
      (ad.description || "").slice(0, DESCRIPTION_EXCERPT_LENGTH) +
      ((ad.description || "").length > DESCRIPTION_EXCERPT_LENGTH ? "…" : ""),
    price: Number(ad.price) || 0,
    category: ad.category || "",
    locationName: ad.locationName || "Unknown",
    images: Array.isArray(ad.images) ? ad.images.slice(0, 3) : [],
    listingUrl: `/ads/${ad._id}`,
    sellerId: String(ad.user?._id ?? ad.user ?? ""),
    status: ad.status || "active",
    createdAt: ad.createdAt ? new Date(ad.createdAt).toISOString() : "",
    views: Number(ad.views) || 0,
    isGroupBuy: Boolean(ad.isGroupBuy),
    groupBuyPrice: ad.isGroupBuy ? Number(ad.groupBuyPrice) : undefined,
    score: typeof ad.score === "number" ? ad.score : (typeof ad.relevanceScore === "number" ? ad.relevanceScore : undefined),
    reasons: Array.isArray(ad.reasons) ? ad.reasons : (Array.isArray(ad.matchReasons) ? ad.matchReasons : undefined),
    tradeOffs: Array.isArray(ad.tradeOffs) ? ad.tradeOffs : undefined,
    savings: typeof ad.savings === "number" ? ad.savings : undefined,
    referenceListingId: typeof ad.referenceListingId === "string" ? ad.referenceListingId : undefined,
  };
}

/* ─────────────────────────────────────────────
   TOOL A — search_products
───────────────────────────────────────────── */

export interface SearchProductsArgs {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  brand?: string;
  city?: string;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest";
  limit?: number;
}

export async function toolSearchProducts(
  args: SearchProductsArgs
): Promise<NormalizedListing[] | ToolError> {
  try {
    // Price range validation before DB connection
    if (
      args.minPrice !== undefined &&
      (isNaN(Number(args.minPrice)) || Number(args.minPrice) < 0)
    ) {
      return { error: "minPrice must be a non-negative number", code: "INVALID_ARG" };
    }
    if (
      args.maxPrice !== undefined &&
      (isNaN(Number(args.maxPrice)) || Number(args.maxPrice) < 0)
    ) {
      return { error: "maxPrice must be a non-negative number", code: "INVALID_ARG" };
    }
    if (
      args.minPrice !== undefined &&
      args.maxPrice !== undefined &&
      Number(args.minPrice) > Number(args.maxPrice)
    ) {
      return { error: "minPrice cannot exceed maxPrice", code: "INVALID_ARG" };
    }

    await connectDB();

    const limit = Math.min(Math.max(1, Number(args.limit) || 5), MAX_LIMIT);

    // Strictly restrict public search to active listings eligible for sale
    const filter: any = {
      status: "active",
    };

    const andClauses: any[] = [];

    // Keyword search with typo tolerance and alternative terms
    if (args.query && args.query.trim()) {
      const { expandedTerms } = extractSearchTokens(args.query.trim(), 5);

      if (expandedTerms.length > 0) {
        const wordRegexes = expandedTerms.map(w => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
        andClauses.push({
          $or: [
            { title: { $in: wordRegexes } },
            { description: { $in: wordRegexes } },
            { category: { $in: wordRegexes } },
            { locationName: { $in: wordRegexes } },
          ],
        });
      }
    }

    // Category filter (exact match to use index, with case-insensitive fallback)
    if (args.category && args.category.trim()) {
      filter.category = {
        $regex: `^${args.category.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      };
    }

    // City filter
    if (args.city && args.city.trim()) {
      filter.locationName = {
        $regex: args.city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    // Brand filter (matches brand name in title or description)
    if (args.brand && args.brand.trim()) {
      const brandRegex = args.brand.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andClauses.push({
        $or: [
          { title: { $regex: brandRegex, $options: "i" } },
          { description: { $regex: brandRegex, $options: "i" } },
        ],
      });
    }

    // Condition filter (mapped to description or title keyword)
    if (args.condition && args.condition.trim()) {
      const conditionRegex = args.condition
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andClauses.push({
        $or: [
          { title: { $regex: conditionRegex, $options: "i" } },
          { description: { $regex: conditionRegex, $options: "i" } },
        ],
      });
    }

    // Attach combined clauses if present
    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    // Price range validation
    if (
      args.minPrice !== undefined &&
      (isNaN(Number(args.minPrice)) || Number(args.minPrice) < 0)
    ) {
      return { error: "minPrice must be a non-negative number", code: "INVALID_ARG" };
    }
    if (
      args.maxPrice !== undefined &&
      (isNaN(Number(args.maxPrice)) || Number(args.maxPrice) < 0)
    ) {
      return { error: "maxPrice must be a non-negative number", code: "INVALID_ARG" };
    }
    if (
      args.minPrice !== undefined &&
      args.maxPrice !== undefined &&
      Number(args.minPrice) > Number(args.maxPrice)
    ) {
      return { error: "minPrice cannot exceed maxPrice", code: "INVALID_ARG" };
    }

    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      filter.price = {};
      if (args.minPrice !== undefined) filter.price.$gte = Number(args.minPrice);
      if (args.maxPrice !== undefined) filter.price.$lte = Number(args.maxPrice);
    }

    // Sorting strategy
    let sortOption: any = { createdAt: -1 };
    if (args.sortBy === "price_asc") {
      sortOption = { price: 1, createdAt: -1 };
    } else if (args.sortBy === "price_desc") {
      sortOption = { price: -1, createdAt: -1 };
    } else if (args.sortBy === "newest") {
      sortOption = { createdAt: -1 };
    }

    const ads = await Ad.find(filter)
      .sort(sortOption)
      .limit(limit)
      .select("-embedding -savedBy -buyerId -isReviewed -groupBuyers")
      .populate("user", "name email isSellerVerified rating reviewCount")
      .lean();

    // Rank listings with transparent relevance scoring
    const ranked = rankListings(ads as any, {
      query: args.query,
      category: args.category,
      brand: args.brand,
      condition: args.condition,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      city: args.city,
      sortBy: args.sortBy === "price_asc" ? "price_low" : (args.sortBy === "price_desc" ? "price_high" : (args.sortBy === "newest" ? "newest" : "relevance")),
    });

    return ranked.map(normalizeListing);
  } catch (err) {
    console.error("[tool:search_products]", err);
    return { error: "Failed to search products. Please try again.", code: "DB_ERROR" };
  }
}

/* ─────────────────────────────────────────────
   TOOL B — get_product_details
───────────────────────────────────────────── */

export async function toolGetProductDetails(
  listingId: string
): Promise<NormalizedListing | ToolError> {
  if (!listingId || !isValidObjectId(listingId)) {
    return { error: "Invalid listing ID format", code: "INVALID_ID" };
  }

  try {
    await connectDB();

    const ad = await Ad.findOne({
      _id: new mongoose.Types.ObjectId(listingId),
      status: { $in: ["active", "pending"] },
    })
      .select("-embedding -savedBy -buyerId -isReviewed -groupBuyers")
      .lean();

    if (!ad) {
      return { error: "Listing not found or no longer available", code: "NOT_FOUND" };
    }

    return normalizeListing(ad);
  } catch (err) {
    console.error("[tool:get_product_details]", err);
    return { error: "Failed to retrieve listing details", code: "DB_ERROR" };
  }
}

/* ─────────────────────────────────────────────
   TOOL C — compare_products
───────────────────────────────────────────── */

export interface ComparisonResult {
  listings: NormalizedListing[];
  summary: {
    cheapest: string | null;
    mostExpensive: string | null;
    newestListing: string | null;
    oldestListing: string | null;
  };
}

export async function toolCompareProducts(
  listingIds: string[]
): Promise<ComparisonResult | ToolError> {
  if (!Array.isArray(listingIds)) {
    return { error: "listingIds must be an array", code: "INVALID_ARG" };
  }
  if (listingIds.length < 2) {
    return { error: "Please provide at least 2 listing IDs to compare", code: "INVALID_ARG" };
  }
  if (listingIds.length > 5) {
    return { error: "Cannot compare more than 5 listings at once", code: "INVALID_ARG" };
  }

  const invalid = listingIds.filter((id) => !isValidObjectId(id));
  if (invalid.length > 0) {
    return {
      error: `Invalid listing IDs: ${invalid.join(", ")}`,
      code: "INVALID_ID",
    };
  }

  try {
    await connectDB();

    const objectIds = listingIds.map((id) => new mongoose.Types.ObjectId(id));

    const ads = await Ad.find({
      _id: { $in: objectIds },
      status: { $in: ["active", "pending"] },
    })
      .select("-embedding -savedBy -buyerId -isReviewed -groupBuyers")
      .lean();

    if (ads.length === 0) {
      return { error: "None of the specified listings are available", code: "NOT_FOUND" };
    }

    const normalized = ads.map(normalizeListing);

    // Build summary
    let cheapest: NormalizedListing | null = null;
    let mostExpensive: NormalizedListing | null = null;
    let newestListing: NormalizedListing | null = null;
    let oldestListing: NormalizedListing | null = null;

    normalized.forEach((l) => {
      if (!cheapest || l.price < cheapest.price) cheapest = l;
      if (!mostExpensive || l.price > mostExpensive.price) mostExpensive = l;
      if (!newestListing || l.createdAt > newestListing.createdAt) newestListing = l;
      if (!oldestListing || l.createdAt < oldestListing.createdAt) oldestListing = l;
    });

    return {
      listings: normalized,
      summary: {
        cheapest: cheapest ? (cheapest as NormalizedListing).title : null,
        mostExpensive: mostExpensive ? (mostExpensive as NormalizedListing).title : null,
        newestListing: newestListing ? (newestListing as NormalizedListing).title : null,
        oldestListing: oldestListing ? (oldestListing as NormalizedListing).title : null,
      },
    };
  } catch (err) {
    console.error("[tool:compare_products]", err);
    return { error: "Failed to compare listings", code: "DB_ERROR" };
  }
}

/* ─────────────────────────────────────────────
   TOOL D — get_seller_information
───────────────────────────────────────────── */

export async function toolGetSellerInformation(
  sellerId: string
): Promise<SellerInfo | ToolError> {
  if (!sellerId || !isValidObjectId(sellerId)) {
    return { error: "Invalid seller ID format", code: "INVALID_ID" };
  }

  try {
    await connectDB();

    // Only fetch public fields — never email, password, googleId, resetPasswordToken
    const user = await User.findById(sellerId)
      .select("name role rating reviewCount isTrusted createdAt")
      .lean();

    if (!user) {
      return { error: "Seller not found", code: "NOT_FOUND" };
    }

    // Verify review count from Review model (source of truth)
    const reviewCount = await Review.countDocuments({ sellerId });
    const reviews = await Review.find({ sellerId })
      .select("rating")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const averageRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    const createdAt = (user as any).createdAt
      ? new Date((user as any).createdAt)
      : new Date();
    const accountAgeDays = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      _id: String((user as any)._id),
      name: (user as any).name || "Seller",
      averageRating,
      reviewCount,
      isTrusted: Boolean((user as any).isTrusted),
      accountAgeDays,
      role: (user as any).role || "buyer",
    };
  } catch (err) {
    console.error("[tool:get_seller_information]", err);
    return { error: "Failed to retrieve seller information", code: "DB_ERROR" };
  }
}

/* ─────────────────────────────────────────────
   TOOL E — estimate_price_fairness
───────────────────────────────────────────── */

export async function toolEstimatePriceFairness(
  listingId: string
): Promise<PriceFairnessResult | ToolError> {
  if (!listingId || !isValidObjectId(listingId)) {
    return { error: "Invalid listing ID format", code: "INVALID_ID" };
  }

  try {
    await connectDB();

    const ad = await Ad.findOne({
      _id: new mongoose.Types.ObjectId(listingId),
      status: { $in: ["active", "pending"] },
    })
      .select("title price category locationName description")
      .lean();

    if (!ad) {
      return { error: "Listing not found or no longer available", code: "NOT_FOUND" };
    }

    const listingPrice = Number((ad as any).price);
    const category = (ad as any).category || "";
    const title = (ad as any).title || "";

    // 1. Try to find comparable active listings in the same category
    const comparable = await Ad.find({
      _id: { $ne: new mongoose.Types.ObjectId(listingId) },
      category: { $regex: `^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      status: "active",
      price: { $gt: 0 },
    })
      .select("price")
      .limit(20)
      .lean();

    // 2. Try benchmark data
    const benchmark = findBenchmark(title);

    let averageMarketPrice: number | null = null;
    let minMarketPrice: number | null = null;
    let maxMarketPrice: number | null = null;
    let benchmarkUsed: string | null = null;
    let comparableCount = comparable.length;

    if (comparable.length >= 3) {
      const prices = comparable.map((c) => Number((c as any).price));
      averageMarketPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      minMarketPrice = Math.min(...prices);
      maxMarketPrice = Math.max(...prices);
      benchmarkUsed = "marketplace_listings";
    } else if (benchmark) {
      averageMarketPrice = benchmark.avgUsed;
      minMarketPrice = benchmark.minUsed;
      maxMarketPrice = benchmark.maxUsed;
      benchmarkUsed = "market_benchmark";
      comparableCount = 0;
    }

    // 3. Determine assessment
    let assessment: PriceFairnessResult["assessment"] = "insufficient_data";
    let percentageDiff: number | null = null;
    let note = "";

    if (averageMarketPrice !== null) {
      percentageDiff = Math.round(
        ((listingPrice - averageMarketPrice) / averageMarketPrice) * 100
      );

      if (percentageDiff <= -15) {
        assessment = "below_market";
        note = `This listing is priced ${Math.abs(percentageDiff)}% below the average market price — potentially a good deal.`;
      } else if (percentageDiff >= 15) {
        assessment = "above_market";
        note = `This listing is priced ${percentageDiff}% above the average market price — may be negotiable.`;
      } else {
        assessment = "fair";
        note = `This listing is priced within ±15% of the average market price — considered fair.`;
      }
    } else {
      note =
        "Insufficient comparable listing data to provide a reliable price assessment. " +
        "This is an approximate estimate only.";
    }

    return {
      listingId: String((ad as any)._id),
      listingTitle: title,
      listingPrice,
      comparableCount,
      averageMarketPrice,
      minMarketPrice,
      maxMarketPrice,
      assessment,
      percentageDiff,
      benchmarkUsed,
      note,
    };
  } catch (err) {
    console.error("[tool:estimate_price_fairness]", err);
    return { error: "Failed to estimate price fairness", code: "DB_ERROR" };
  }
}

/* ─────────────────────────────────────────────
   TOOL F — get_recommendations
───────────────────────────────────────────── */

export interface RecommendationArgs {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  condition?: string;
  city?: string;
  referenceListingId?: string;
  preferCheaper?: boolean;
  requiredFeatures?: string[];
  limit?: number;
}

export interface RecommendationMatchBreakdown {
  relevanceScore: number;
  budgetScore: number;
  conditionScore: number;
  locationScore: number;
  listingQualityScore: number;
  sellerReputationScore: number;
}

export interface RankedRecommendation {
  listing: NormalizedListing;
  score: number;
  reasons: string[];
  tradeOffs?: string[];
  matchBreakdown?: RecommendationMatchBreakdown;
}

export async function toolGetRecommendations(
  args: RecommendationArgs
): Promise<RankedRecommendation[] | ToolError> {
  if (!args.query || !args.query.trim()) {
    return { error: "query is required for recommendations", code: "INVALID_ARG" };
  }

  try {
    await connectDB();

    let referenceListingPrice: number | undefined;
    let referenceTitle: string | undefined;

    // If referenceListingId is supplied, retrieve reference listing context
    if (args.referenceListingId && isValidObjectId(args.referenceListingId)) {
      const refAd = await Ad.findById(args.referenceListingId)
        .select("title price category locationName description")
        .lean();
      if (refAd) {
        referenceListingPrice = Number((refAd as any).price);
        referenceTitle = (refAd as any).title;
        if (!args.category && (refAd as any).category) {
          args.category = (refAd as any).category;
        }
      }
    }

    // Determine effective budget
    let effectiveMaxPrice = args.maxPrice;
    if (args.preferCheaper && referenceListingPrice !== undefined) {
      const ceiling = referenceListingPrice - 1;
      effectiveMaxPrice = effectiveMaxPrice !== undefined ? Math.min(effectiveMaxPrice, ceiling) : ceiling;
    }

    // Search wider candidate pool for scoring
    const candidateLimit = Math.min(20, Math.max(10, (args.limit || 5) * 3));
    const searchResult = await toolSearchProducts({
      query: args.query,
      category: args.category,
      minPrice: args.minPrice,
      maxPrice: effectiveMaxPrice !== undefined && effectiveMaxPrice > 0 ? effectiveMaxPrice : undefined,
      brand: args.brand,
      condition: args.condition,
      city: args.city,
      limit: candidateLimit,
    });

    if ("error" in searchResult) return searchResult;
    if (searchResult.length === 0) {
      return [];
    }

    // Exclude reference listing itself
    const filteredCandidates = searchResult.filter(
      (c) => !args.referenceListingId || c._id !== args.referenceListingId
    );

    if (filteredCandidates.length === 0) {
      return [];
    }

    // Batch fetch seller reputation for candidate listings to avoid N+1 queries
    const sellerIds = [...new Set(filteredCandidates.map((c) => c.sellerId).filter(isValidObjectId))];
    const sellers = await User.find({ _id: { $in: sellerIds } })
      .select("rating reviewCount isTrusted")
      .lean();
    const sellerMap = new Map(sellers.map((s) => [String(s._id), s]));

    // Query tokens for relevance scoring
    const queryTokens = args.query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1 && !/^(find|show|recommend|best|good|a|the|in|for|with)$/.test(t));

    // Transparent multi-factor scoring
    const scored: RankedRecommendation[] = filteredCandidates.map((listing) => {
      const reasons: string[] = [];
      const tradeOffs: string[] = [];

      const titleLower = listing.title.toLowerCase();
      const descLower = listing.descriptionExcerpt.toLowerCase();

      // 1. Relevance Score (0 - 30)
      let relevanceScore = 0;
      let matchedTokenCount = 0;
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          relevanceScore += 10;
          matchedTokenCount++;
        } else if (descLower.includes(token)) {
          relevanceScore += 4;
          matchedTokenCount++;
        }
      }
      relevanceScore = Math.min(20, relevanceScore);

      if (args.category && listing.category.toLowerCase().includes(args.category.toLowerCase())) {
        relevanceScore += 5;
      }
      if (args.brand && (titleLower.includes(args.brand.toLowerCase()) || descLower.includes(args.brand.toLowerCase()))) {
        relevanceScore += 5;
        reasons.push(`Matches preferred brand: ${args.brand}`);
      }
      relevanceScore = Math.min(30, relevanceScore);

      if (matchedTokenCount > 0 && !reasons.some((r) => r.includes("brand"))) {
        reasons.push(`Directly matches "${args.query}"`);
      }

      // 2. Budget Fit Score (0 - 25)
      let budgetScore = 15;
      if (effectiveMaxPrice !== undefined && effectiveMaxPrice > 0) {
        if (listing.price <= effectiveMaxPrice) {
          budgetScore = 18;
          const ratio = listing.price / effectiveMaxPrice;
          if (ratio >= 0.5 && ratio <= 0.85) {
            budgetScore += 7; // Optimal sweet spot: good value without suspicious discount
            reasons.push(`Excellent value within your budget of ₹${effectiveMaxPrice.toLocaleString("en-IN")}`);
          } else if (ratio < 0.5) {
            budgetScore += 4;
            reasons.push(`Budget-friendly: ₹${listing.price.toLocaleString("en-IN")}`);
          } else {
            budgetScore += 3;
            reasons.push(`Fits within budget: ₹${listing.price.toLocaleString("en-IN")}`);
            if (ratio > 0.95) {
              tradeOffs.push("Near upper boundary of your budget limit");
            }
          }
        } else {
          budgetScore = 0;
        }
      }

      // If comparing with a reference listing, highlight exact savings
      if (referenceListingPrice !== undefined && listing.price < referenceListingPrice) {
        const savings = referenceListingPrice - listing.price;
        reasons.unshift(`Saves ₹${savings.toLocaleString("en-IN")} vs ${referenceTitle ? `"${referenceTitle}"` : "reference"}`);
        listing.savings = savings;
      }

      // 3. Condition Match (0 - 15)
      let conditionScore = 10;
      if (args.condition && args.condition.trim()) {
        const condLower = args.condition.toLowerCase();
        if (titleLower.includes(condLower) || descLower.includes(condLower)) {
          conditionScore = 15;
          reasons.push(`Verified ${args.condition} condition`);
        } else {
          conditionScore = 5;
          tradeOffs.push(`Condition may differ from requested ${args.condition}`);
        }
      }

      // 4. Location Match (0 - 10)
      let locationScore = 5;
      if (args.city && args.city.trim()) {
        const cityLower = args.city.toLowerCase();
        if (listing.locationName.toLowerCase().includes(cityLower)) {
          locationScore = 10;
          reasons.push(`Located in ${listing.locationName}`);
        } else {
          locationScore = 0;
          tradeOffs.push(`Located in ${listing.locationName} (not ${args.city})`);
        }
      }

      // 5. Listing Quality & Completeness (0 - 10, normalized)
      let listingQualityScore = 0;
      if (listing.images.length > 0) {
        listingQualityScore += Math.min(4, listing.images.length * 2);
        reasons.push("Includes verified photos");
      } else {
        tradeOffs.push("No listing photos provided");
      }

      if (listing.descriptionExcerpt.length >= 80) {
        listingQualityScore += 4;
      } else {
        tradeOffs.push("Brief description — verify detailed specifications directly with seller");
      }

      // Views capped at 2 pts so popular listings cannot monopolize recommendations
      const viewBonus = Math.min(2, Math.round((Math.min(listing.views, 50) / 50) * 2));
      listingQualityScore += viewBonus;
      listingQualityScore = Math.min(10, listingQualityScore);

      // 6. Seller Reputation (0 - 10, real data only)
      let sellerReputationScore = 4;
      const seller = sellerMap.get(listing.sellerId);
      if (seller) {
        const reviewCount = Number((seller as any).reviewCount) || 0;
        const rating = Number((seller as any).rating) || 0;
        const isTrusted = Boolean((seller as any).isTrusted);

        if (reviewCount > 0 && rating > 0) {
          sellerReputationScore = Math.min(8, Math.round((rating / 5) * 8));
          reasons.push(`Seller rated ${rating.toFixed(1)}★ (${reviewCount} review${reviewCount !== 1 ? "s" : ""})`);
        } else {
          tradeOffs.push("Seller has no prior buyer reviews on Bazari");
        }

        if (isTrusted) {
          sellerReputationScore += 2;
          reasons.push("Verified Trusted Seller");
        }
      } else {
        tradeOffs.push("Seller has no prior buyer reviews on Bazari");
      }
      sellerReputationScore = Math.min(10, sellerReputationScore);

      // Total normalized score (0 - 100)
      const totalScore = Math.min(
        100,
        Math.max(
          1,
          Math.round(
            relevanceScore +
              budgetScore +
              conditionScore +
              locationScore +
              listingQualityScore +
              sellerReputationScore
          )
        )
      );

      listing.score = totalScore;
      listing.reasons = reasons;
      listing.tradeOffs = tradeOffs;

      const breakdown: RecommendationMatchBreakdown = {
        relevanceScore,
        budgetScore,
        conditionScore,
        locationScore,
        listingQualityScore,
        sellerReputationScore,
      };

      return {
        listing,
        score: totalScore,
        reasons,
        tradeOffs: tradeOffs.length > 0 ? tradeOffs : undefined,
        matchBreakdown: breakdown,
      };
    });

    // Sort by score desc, then price asc
    scored.sort((a, b) => b.score - a.score || a.listing.price - b.listing.price);

    const limit = Math.min(args.limit || 5, MAX_LIMIT);
    return scored.slice(0, limit);
  } catch (err) {
    console.error("[tool:get_recommendations]", err);
    return { error: "Failed to generate recommendations. Please try again.", code: "DB_ERROR" };
  }
}

/* ─────────────────────────────────────────────
   TOOL G — find_budget_alternatives
───────────────────────────────────────────── */

export interface BudgetAlternativesArgs {
  referenceListingId: string;
  maxBudget?: number;
  limit?: number;
}

export async function toolFindBudgetAlternatives(
  args: BudgetAlternativesArgs
): Promise<RankedRecommendation[] | ToolError> {
  if (!args.referenceListingId || !isValidObjectId(args.referenceListingId)) {
    return { error: "Invalid reference listing ID format", code: "INVALID_ID" };
  }

  try {
    await connectDB();
    const refAd = await Ad.findById(args.referenceListingId)
      .select("title price category locationName description")
      .lean();

    if (!refAd) {
      return { error: "Reference listing not found", code: "NOT_FOUND" };
    }

    const refPrice = Number((refAd as any).price) || 0;
    const refCategory = (refAd as any).category || "";
    const refTitle = (refAd as any).title || "";
    const maxPrice =
      args.maxBudget !== undefined ? Math.min(args.maxBudget, refPrice - 1) : refPrice - 1;

    if (maxPrice <= 0) {
      return [];
    }

    const recs = await toolGetRecommendations({
      query: refTitle,
      category: refCategory,
      maxPrice,
      referenceListingId: args.referenceListingId,
      preferCheaper: true,
      limit: args.limit || 5,
    });

    return recs;
  } catch (err) {
    console.error("[tool:find_budget_alternatives]", err);
    return { error: "Failed to find budget alternatives", code: "DB_ERROR" };
  }
}

/* ─────────────────────────────────────────────
   TOOL H — find_similar_listings
───────────────────────────────────────────── */

export interface SimilarListingsArgs {
  referenceListingId: string;
  limit?: number;
}

export async function toolFindSimilarListings(
  args: SimilarListingsArgs
): Promise<RankedRecommendation[] | ToolError> {
  if (!args.referenceListingId || !isValidObjectId(args.referenceListingId)) {
    return { error: "Invalid reference listing ID format", code: "INVALID_ID" };
  }

  try {
    await connectDB();
    const refAd = await Ad.findById(args.referenceListingId)
      .select("title price category locationName description")
      .lean();

    if (!refAd) {
      return { error: "Reference listing not found", code: "NOT_FOUND" };
    }

    return toolGetRecommendations({
      query: (refAd as any).title || "",
      category: (refAd as any).category || "",
      referenceListingId: args.referenceListingId,
      limit: args.limit || 5,
    });
  } catch (err) {
    console.error("[tool:find_similar_listings]", err);
    return { error: "Failed to find similar listings", code: "DB_ERROR" };
  }
}
