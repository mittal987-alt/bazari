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
  city?: string;
  limit?: number;
}

export async function toolSearchProducts(
  args: SearchProductsArgs
): Promise<NormalizedListing[] | ToolError> {
  try {
    await connectDB();

    const limit = Math.min(Math.max(1, Number(args.limit) || 5), MAX_LIMIT);

    const filter: any = {
      status: { $in: ["active", "pending"] },
    };

    // Keyword search — safe regex
    if (args.query && args.query.trim()) {
      const words = args.query
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 1)
        .slice(0, 10) // cap individual word count
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

      if (words.length > 0) {
        filter.$or = words.flatMap((word) => [
          { title: { $regex: word, $options: "i" } },
          { description: { $regex: word, $options: "i" } },
          { category: { $regex: word, $options: "i" } },
        ]);
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

    // Condition filter (mapped to description keyword — schema has no discrete condition field)
    if (args.condition && args.condition.trim()) {
      const conditionRegex = args.condition
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const conditionFilter = [
        { title: { $regex: conditionRegex, $options: "i" } },
        { description: { $regex: conditionRegex, $options: "i" } },
      ];
      filter.$or = filter.$or
        ? [{ $and: [{ $or: filter.$or }, { $or: conditionFilter }] }]
        : conditionFilter;
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

    const ads = await Ad.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-embedding -savedBy -buyerId -isReviewed -groupBuyers")
      .lean();

    return ads.map(normalizeListing);
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
  maxPrice?: number;
  city?: string;
}

export interface RankedRecommendation {
  listing: NormalizedListing;
  score: number;
  reasons: string[];
}

export async function toolGetRecommendations(
  args: RecommendationArgs
): Promise<RankedRecommendation[] | ToolError> {
  if (!args.query || !args.query.trim()) {
    return { error: "query is required for recommendations", code: "INVALID_ARG" };
  }

  // Reuse search logic with wider net
  const searchResult = await toolSearchProducts({
    query: args.query,
    category: args.category,
    maxPrice: args.maxPrice,
    city: args.city,
    limit: 10,
  });

  if ("error" in searchResult) return searchResult;
  if (searchResult.length === 0) {
    return [];
  }

  // Score each listing
  const scored: RankedRecommendation[] = searchResult.map((listing) => {
    const reasons: string[] = [];
    let score = 0;

    // Budget fit
    if (args.maxPrice && listing.price <= args.maxPrice) {
      score += 3;
      reasons.push(`Within your budget of ₹${args.maxPrice.toLocaleString("en-IN")}`);
    }

    // Price competitiveness — cheaper is better up to a threshold
    if (args.maxPrice && listing.price < args.maxPrice * 0.8) {
      score += 1;
      reasons.push("Priced well below budget");
    }

    // Category match
    if (
      args.category &&
      listing.category.toLowerCase().includes(args.category.toLowerCase())
    ) {
      score += 2;
      reasons.push("Matches your preferred category");
    }

    // Location match
    if (args.city && listing.locationName.toLowerCase().includes(args.city.toLowerCase())) {
      score += 2;
      reasons.push(`Available in ${listing.locationName}`);
    }

    // Listing freshness
    const daysOld =
      (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 7) {
      score += 1;
      reasons.push("Recently listed");
    }

    // Has images
    if (listing.images.length > 0) {
      score += 1;
      reasons.push("Includes photos");
    }

    return { listing, score, reasons };
  });

  // Sort by score desc, then price asc for tie-breaking
  scored.sort((a, b) => b.score - a.score || a.listing.price - b.listing.price);

  return scored.slice(0, 5);
}
