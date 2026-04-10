import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";

export const runtime = "nodejs";

// 1. Update the type definition for context
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // Changed to Promise
) {
  try {
    await connectDB();

    // 2. Await the params before destructuring
    const { id } = await context.params; 

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const ad = await Ad.findById(id);

    if (!ad) {
      return NextResponse.json(
        { message: "Ad not found" },
        { status: 404 }
      );
    }

    if (!ad.isGroupBuy) {
      return NextResponse.json(
        { message: "This listing is not a group buy" },
        { status: 400 }
      );
    }

    // Check if user already joined
    if (ad.groupBuyers.some((uid: any) => uid.toString() === userId)) {
      return NextResponse.json(
        { message: "You have already joined this group buy" },
        { status: 400 }
      );
    }

    ad.groupBuyers.push(userId);
    await ad.save();

    return NextResponse.json(
      {
        message: "Successfully joined group buy",
        groupBuyersCount: ad.groupBuyers.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GROUP BUY JOIN ERROR:", err);

    return NextResponse.json(
      { message: "Failed to join group buy" },
      { status: 500 }
    );
  }
}