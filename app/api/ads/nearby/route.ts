import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    if (!lat || !lng) {
      return NextResponse.json(
        { message: "lat and lng required" },
        { status: 400 }
      );
    }

    const filter: any = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // ✅ correct
          },
          $maxDistance: 5000, // 5km
        },
      },
    };

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    const ads = await Ad.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({
      ads,
      total: ads.length,
    });

  } catch (err) {
    console.error("NEARBY ERROR:", err);

    return NextResponse.json(
      { message: "Failed to fetch nearby ads" },
      { status: 500 }
    );
  }
}