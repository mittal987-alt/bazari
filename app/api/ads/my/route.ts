import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Ad from "@/models/Ad";

export async function GET() {
  try {
    await connectDB();

    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only return current user's ads (project out heavy embedding and internal arrays)
    const ads = await Ad.find({ user: user.id })
      .select("-embedding -savedBy -groupBuyers")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(ads);

  } catch (error) {
    console.error("FETCH MY ADS ERROR:", error);
    return NextResponse.json(
      { message: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}
