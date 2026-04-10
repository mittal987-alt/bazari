import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Ad from "@/models/Ad";

export async function GET() {
  try {
    await connectDB();

    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id.toString();

    const savedAds = await Ad.find({ savedBy: userId });

    return NextResponse.json(savedAds);

  } catch (error) {
    console.error("GET SAVED ADS ERROR:", error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}