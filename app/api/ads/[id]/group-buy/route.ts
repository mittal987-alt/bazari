import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Ad from "@/models/Ad";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getUserFromToken();

    const { id } = await context.params; 

    const body = await req.json().catch(() => ({}));
    const userId = authUser?.id || body.userId;

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized: Please log in to join the group buy" },
        { status: 401 }
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