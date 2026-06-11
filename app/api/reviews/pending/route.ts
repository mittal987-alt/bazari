import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find all ads where this user is the buyer, status is sold, and it hasn't been reviewed yet
    const pendingReviews = await Ad.find({
      buyerId: user.id,
      status: "sold",
      isReviewed: false,
    }).populate("user", "name avatar isTrusted rating");

    return NextResponse.json(pendingReviews);
  } catch (error: any) {
    console.error("Fetch Pending Reviews Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
