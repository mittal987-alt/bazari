import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";
import { checkListingForFraud } from "@/lib/fraudDetection";
import { generateEmbedding } from "@/services/ai.service";

export const runtime = "nodejs";

/* ===================== GET ===================== */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search   = searchParams.get("search")   || "";
    const category = searchParams.get("category") || "";
    const city     = searchParams.get("city")     || "";
    const min      = searchParams.get("min")       || "";
    const max      = searchParams.get("max")       || "";
    const sort     = searchParams.get("sort")      || "";
    const page     = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit    = 12;

    const filter: any = {};

    // Keyword search across title, description, category
    if (search.trim() !== "") {
      const words = search.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      filter.$or = words.flatMap(word => [
        { title: { $regex: word, $options: "i" } },
        { description: { $regex: word, $options: "i" } },
        { category: { $regex: word, $options: "i" } },
        { locationName: { $regex: word, $options: "i" } },
      ]);
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    // City / location filter
    if (city.trim() !== "") {
      filter.locationName = { $regex: city.trim(), $options: "i" };
    }

    // Price range filter
    if (min !== "" || max !== "") {
      filter.price = {};
      if (min !== "") filter.price.$gte = Number(min);
      if (max !== "") filter.price.$lte = Number(max);
    }

    // Show active AND pending ads publicly (pending just haven't been reviewed yet)
    filter.status = { $in: ["active", "pending"] };

    // Sort
    let sortQuery: any = { createdAt: -1 };
    if (sort === "price_low")  sortQuery = { price: 1 };
    if (sort === "price_high") sortQuery = { price: -1 };

    const total = await Ad.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const ads = await Ad.find(filter)
      .populate("user", "name email")
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      ads,
      total,
      page,
      totalPages,
    });

  } catch (err) {
    console.error("ADS ERROR:", err);
    return NextResponse.json(
      { message: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}


/* ===================== POST ===================== */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      title,
      price,
      location,
      category,
      images,
      userId,
      lat,
      lng,
      isGroupBuy,
      groupBuyTarget,
      groupBuyPrice
    } = body;

    // 🔥 VALIDATION
    if (!title || !price || !location || !category || !lat || !lng || !userId) {
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
    // Built from the same fields the chatbot's search prompt uses, so
    // search relevance stays consistent with how listings are displayed.
    const textToEmbed = `Title: ${title}. Category: ${category}. Description: ${body.description || ""}. Price: ₹${price}. Location: ${location}.`;
    const embedding = await generateEmbedding(textToEmbed);

    const newAd = await Ad.create({
      title,
      price,
      category,
      images: images || [],
      user: userId,
      description: body.description || "",
      status: fraudResult.status,
      embedding,

      // ✅ GEO LOCATION
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },

      locationName: location,

      // 🤝 Group Buy
      isGroupBuy: isGroupBuy || false,
      groupBuyTarget: groupBuyTarget || 0,
      groupBuyPrice: groupBuyPrice || 0,
      groupBuyers: [],
    });

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