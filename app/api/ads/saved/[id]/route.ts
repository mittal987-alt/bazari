export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Ad from "@/models/Ad";

/* =========================================================
   GET SINGLE AD
========================================================= */

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const ad = await Ad.findById(id).populate("user", "name email");

    if (!ad) {
      return NextResponse.json({ message: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json(ad);

  } catch (error) {
    console.error("GET SINGLE AD ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch ad" }, { status: 500 });
  }
}

/* =========================================================
   UPDATE AD
========================================================= */

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const ad = await Ad.findById(id);

    if (!ad) {
      return NextResponse.json({ message: "Ad not found" }, { status: 404 });
    }

    if (ad.user.toString() !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const {
      title,
      price,
      description,
      locationName,
      category,
      lat,
      lng,
      images,
      yearsUsed
    } = body;

    /* ========= SAFE UPDATE ========= */

    if (title) ad.title = title;
    if (price) ad.price = Number(price);
    if (description) ad.description = description;
    if (category) ad.category = category;
    if (locationName) ad.locationName = locationName;
    if (images) ad.images = images;
    if (yearsUsed !== undefined) ad.yearsUsed = Number(yearsUsed);

    if (lat && lng) {
      ad.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    await ad.save();

    return NextResponse.json(ad);

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    return NextResponse.json({ message: "Failed to update ad" }, { status: 500 });
  }
}

/* =========================================================
   DELETE AD
========================================================= */

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const ad = await Ad.findById(id);

    if (!ad) {
      return NextResponse.json({ message: "Ad not found" }, { status: 404 });
    }

    if (ad.user.toString() !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await Ad.findByIdAndDelete(id);

    return NextResponse.json({ message: "Ad deleted successfully" });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json({ message: "Failed to delete ad" }, { status: 500 });
  }
}

/* =========================================================
   TOGGLE SAVE AD (POST)
========================================================= */

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: adId } = await context.params;

    const ad = await Ad.findById(adId);

    if (!ad) {
      return NextResponse.json({ message: "Ad not found" }, { status: 404 });
    }

    const userId = user.id.toString();

    const alreadySaved =
      ad.savedBy?.some((uid: any) => uid.toString() === userId) || false;

    if (alreadySaved) {
      await Ad.updateOne(
        { _id: adId },
        { $pull: { savedBy: userId } }
      );
    } else {
      await Ad.updateOne(
        { _id: adId },
        { $addToSet: { savedBy: userId } }
      );
    }

    return NextResponse.json({
      saved: !alreadySaved,
    });

  } catch (error) {
    console.error("SAVE ERROR:", error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}