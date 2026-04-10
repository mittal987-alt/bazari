import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Ad from "@/models/Ad";
import { checkListingForFraud } from "@/lib/fraudDetection";

/* =========================================================
    GET SINGLE AD + INCREASE VIEWS
========================================================= */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {

    await connectDB();

    const { id } = await context.params;

    // ⭐ Increase views automatically
    const ad = await Ad.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("user", "name email");

    if (!ad) {
      return NextResponse.json(
        { message: "Ad not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(ad);

  } catch (error) {

    console.error("GET AD ERROR:", error);

    return NextResponse.json(
      { message: "Failed to fetch ad" },
      { status: 500 }
    );
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

    if (!user)
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );

    const { id } = await context.params;

    const ad = await Ad.findById(id);

    if (!ad)
      return NextResponse.json(
        { message: "Ad not found" },
        { status: 404 }
      );

    if (ad.user.toString() !== user.id)
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );

    await Ad.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Ad deleted successfully",
    });

  } catch (error) {

    console.error("DELETE ERROR:", error);

    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const body = await req.json();

    const ad = await Ad.findById(id);

    if (!ad)
      return NextResponse.json(
        { message: "Ad not found" },
        { status: 404 }
      );

    if (ad.user.toString() !== user.id)
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.yearsUsed !== undefined) updateData.yearsUsed = body.yearsUsed;
    if (body.locationName !== undefined) updateData.locationName = body.locationName;

    if (body.lat !== undefined && body.lng !== undefined) {
      updateData.location = {
        type: "Point",
        coordinates: [Number(body.lng), Number(body.lat)],
      };
    }

    // 🕵️‍♂️ RE-RUN FRAUD DETECTION ON UPDATE
    const fraudResult = checkListingForFraud({
      title: body.title !== undefined ? body.title : ad.title,
      description: body.description !== undefined ? body.description : ad.description,
      price: body.price !== undefined ? Number(body.price) : ad.price,
      category: body.category !== undefined ? body.category : ad.category,
      images: body.images !== undefined ? body.images : ad.images,
    });

    updateData.status = fraudResult.status;

    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedAd);

  } catch (error: any) {

    console.error("UPDATE ERROR:", error);

    return NextResponse.json(
      { message: error.message || "Update failed" },
      { status: 500 }
    );
  }
}