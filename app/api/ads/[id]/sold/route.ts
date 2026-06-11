import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";
import Chat from "@/models/Chat";
import { getUserFromToken } from "@/lib/auth";

export const POST: any = async (req: NextRequest | Request, context: any) => {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    // Support both Next.js handler shapes where `context.params` may be a Promise or a plain object
    const params = context?.params;
    const resolvedParams = params && typeof params.then === "function" ? await params : params || {};
    const { id } = resolvedParams;

    const body = await (req as Request).json();
    const { buyerId } = body;

    const ad = await Ad.findById(id);

    if (!ad) {
      return NextResponse.json({ message: "Ad not found" }, { status: 404 });
    }

    // Ensure the requester is the seller
    if (ad.user.toString() !== user.id.toString()) {
      return NextResponse.json({ message: "Unauthorized to modify this ad" }, { status: 403 });
    }

    // Mark as sold and assign buyer
    ad.status = "sold";
    
    // Only assign buyerId if it's explicitly provided and valid
    if (buyerId) {
      ad.buyerId = buyerId;
      ad.isReviewed = false;
    }

    await ad.save();

    return NextResponse.json({ message: "Ad marked as sold successfully", ad });
  } catch (error: any) {
    console.error("Mark Sold Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
