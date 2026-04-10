import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";
import { checkListingForFraud } from "@/lib/fraudDetection";

export const runtime = "nodejs";

/* ===================== GET ===================== */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const filter: any = {};

    if (search.trim() !== "") {
      filter.title = { $regex: search, $options: "i" };
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    // ✅ Only show active ads to the public
    filter.status = "active";

    const ads = await Ad.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      ads,
      total: ads.length,
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

    const newAd = await Ad.create({
      title,
      price,
      category,
      images: images || [],
      user: userId,
      description: body.description || "",
      status: fraudResult.status,

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