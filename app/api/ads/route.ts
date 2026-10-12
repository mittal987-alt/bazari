import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";
import { checkListingForFraud } from "@/lib/fraudDetection";
import { generateEmbedding } from "@/services/ai.service";
import { getUserFromToken } from "@/lib/auth";
import {
  escapeRegex,
  extractSearchTokens,
  parsePrice,
} from "@/lib/search/search-normalization";
import { interpretSearchQuery } from "@/lib/search/search-interpreter";
import { rankListings } from "@/lib/search/search-ranking";
import { matchNewListingToSavedSearches } from "@/lib/notifications/notification-service";
import { searchLimiter, authLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

/* ===================== GET ===================== */
export async function GET(req: NextRequest) {
  // Rate-limit search endpoint
  const searchRl = searchLimiter.check(getClientIp(req));
  if (searchRl.limited) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((searchRl.resetMs - Date.now()) / 1000)) } }
    );
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const rawSearch = searchParams.get("search") || searchParams.get("q") || "";
    let category   = searchParams.get("category") || "";
    let city       = searchParams.get("city")     || "";
    let minStr     = searchParams.get("min")      || "";
    let maxStr     = searchParams.get("max")      || "";
    let sort       = searchParams.get("sort")     || "relevance";
    let condition  = searchParams.get("condition") || "";
    let brand      = searchParams.get("brand")     || "";
    const useAI    = searchParams.get("ai") === "true";
    const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const requestedLimit = parseInt(searchParams.get("limit") || "12", 10);
    const limit    = Math.min(Math.max(1, isNaN(requestedLimit) ? 12 : requestedLimit), 50);

    let interpretation: any = undefined;

    // Optional AI query interpretation if requested or if search query appears complex
    if (rawSearch.trim() && (useAI || /\b(under|below|between|near me|for|with)\b/i.test(rawSearch))) {
      try {
        interpretation = await interpretSearchQuery(rawSearch.trim(), {
          userCity: city || undefined,
        });

        // Merge AI interpreted parameters if not explicitly provided
        if (!category && interpretation.category) category = interpretation.category;
        if (!city && interpretation.city) city = interpretation.city;
        if (!minStr && interpretation.minPrice !== undefined) minStr = String(interpretation.minPrice);
        if (!maxStr && interpretation.maxPrice !== undefined) maxStr = String(interpretation.maxPrice);
        if (!condition && interpretation.condition) condition = interpretation.condition;
        if (!brand && interpretation.brand) brand = interpretation.brand;
        if (sort === "relevance" && interpretation.sortBy) sort = interpretation.sortBy;
      } catch (interpretErr) {
        console.warn("[api:ads] Query interpretation skipped:", interpretErr);
      }
    }

    // Strictly limit public discovery to active listings
    const filter: any = {
      status: "active",
    };

    const andConditions: any[] = [];

    // Keyword search with safe token expansion and typo tolerance
    const trimmedSearch = rawSearch.trim();
    if (trimmedSearch !== "") {
      const { expandedTerms } = extractSearchTokens(trimmedSearch, 5);

      if (expandedTerms.length > 0) {
        // Build bounded regex clauses for expanded terms
        const searchRegexes = expandedTerms.map((term) => new RegExp(escapeRegex(term), "i"));
        
        // Match across title, description, category, or location
        andConditions.push({
          $or: [
            { title: { $in: searchRegexes } },
            { description: { $in: searchRegexes } },
            { category: { $in: searchRegexes } },
            { locationName: { $in: searchRegexes } },
          ],
        });
      }
    }

    // Category filter
    if (category && category.toLowerCase() !== "all") {
      filter.category = {
        $regex: `^${escapeRegex(category.trim())}$`,
        $options: "i",
      };
    }

    // Brand filter
    if (brand.trim()) {
      const brandRegex = new RegExp(escapeRegex(brand.trim()), "i");
      andConditions.push({
        $or: [
          { title: brandRegex },
          { description: brandRegex },
        ],
      });
    }

    // Condition filter
    if (condition.trim()) {
      const condRegex = new RegExp(escapeRegex(condition.trim()), "i");
      andConditions.push({
        $or: [
          { title: condRegex },
          { description: condRegex },
        ],
      });
    }

    // City / location filter
    if (city.trim()) {
      filter.locationName = { $regex: escapeRegex(city.trim()), $options: "i" };
    }

    // Price range filter
    const parsedMin = parsePrice(minStr);
    const parsedMax = parsePrice(maxStr);

    if (parsedMin !== undefined || parsedMax !== undefined) {
      filter.price = {};
      if (parsedMin !== undefined) filter.price.$gte = parsedMin;
      if (parsedMax !== undefined) filter.price.$lte = parsedMax;
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // Sorting strategy
    let sortQuery: any = { createdAt: -1 };
    if (sort === "price_low")  sortQuery = { price: 1, createdAt: -1 };
    if (sort === "price_high") sortQuery = { price: -1, createdAt: -1 };
    if (sort === "newest")     sortQuery = { createdAt: -1 };
    if (sort === "trending")   sortQuery = { views: -1, chats: -1, createdAt: -1 };

    const startTime = performance.now();
    const correlationId = req.headers.get("x-request-id") || `search_${Date.now()}`;

    // Execute count and paginated find concurrently to eliminate sequential network round-trips
    const [total, rawAds] = await Promise.all([
      Ad.countDocuments(filter),
      Ad.find(filter)
        .select("-embedding -savedBy -groupBuyers")
        .populate("user", "name email isSellerVerified rating reviewCount")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Apply ranking and relevance scoring
    const ads = rankListings(rawAds, {
      query: trimmedSearch,
      category,
      brand,
      condition,
      minPrice: parsedMin,
      maxPrice: parsedMax,
      city,
      sortBy: sort as any,
    });

    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

    return NextResponse.json(
      {
        ads,
        total,
        page,
        totalPages,
        interpretation,
        appliedFilters: {
          search: trimmedSearch,
          category: category || undefined,
          city: city || undefined,
          min: parsedMin,
          max: parsedMax,
          condition: condition || undefined,
          brand: brand || undefined,
          sort,
        },
      },
      {
        headers: {
          "x-request-id": correlationId,
          "Server-Timing": `db;dur=${durationMs}`,
        },
      }
    );

  } catch (err) {
    console.error("ADS SEARCH ERROR:", err);
    return NextResponse.json(
      { message: "Failed to fetch ads" },
      { status: 500 }
    );
  }

}


/* ===================== POST ===================== */
export async function POST(req: NextRequest) {
  // Rate-limit ad creation
  const postRl = authLimiter.check(getClientIp(req));
  if (postRl.limited) {
    return NextResponse.json(
      { message: "Too many ad creation attempts. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((postRl.resetMs - Date.now()) / 1000)) } }
    );
  }

  try {
    await connectDB();

    // Authentication is mandatory — never accept userId from the request body
    const authUser = await getUserFromToken();
    if (!authUser?.id) {
      return NextResponse.json(
        { message: "Unauthorized: Please log in to post an ad" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      title,
      price,
      location,
      category,
      images,
      lat,
      lng,
      isGroupBuy,
      groupBuyTarget,
      groupBuyPrice
    } = body;

    // Use ONLY the verified JWT identity — ignore any userId sent in the body
    const effectiveUserId = authUser.id;

    // 🔥 VALIDATION
    if (!title || price === undefined || !location || !category || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🕵️‍♂️ RUN FRAUD DETECTION
    const fraudResult = checkListingForFraud({
      title,
      description: body.description || "",
      price: Number(price),
      category,
      images: images || [],
    });

    // 🧠 GENERATE EMBEDDING for semantic/vector search
    const textToEmbed = `Title: ${title}. Category: ${category}. Description: ${body.description || ""}. Price: ₹${price}. Location: ${location}.`;
    const embedding = await generateEmbedding(textToEmbed);

    const newAd = await Ad.create({
      title,
      price: Number(price),
      category,
      images: images || [],
      user: effectiveUserId,
      description: body.description || "",
      status: fraudResult.status,
      embedding,

      // ✅ GEO LOCATION
      location: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      },

      locationName: location,

      // 🤝 Group Buy
      isGroupBuy: isGroupBuy || false,
      groupBuyTarget: groupBuyTarget || 0,
      groupBuyPrice: groupBuyPrice || 0,
      groupBuyers: [],
    });

    // 🔔 SMART ALERTS: Trigger saved-search matching asynchronously if active
    if (newAd.status === "active") {
      matchNewListingToSavedSearches(newAd).catch((alertErr) => {
        console.warn("[POST ads] Saved search alert matching skipped:", alertErr);
      });
    }

    return NextResponse.json(
      { message: "Ad created successfully", ad: newAd },
      { status: 201 }
    );

  } catch (err) {
    console.error("POST ADS ERROR:", err);
    return NextResponse.json(
      { message: "Failed to publish ad" },
      { status: 500 }
    );
  }
}