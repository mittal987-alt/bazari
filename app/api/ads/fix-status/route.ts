import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";

// One-time fix: promotes all "pending" ads to "active"
// Call this once via GET /api/ads/fix-status
export async function GET() {
  try {
    await connectDB();

    const result = await Ad.updateMany(
      { status: "pending" },
      { $set: { status: "active" } }
    );

    return NextResponse.json({
      message: "Fixed",
      updated: result.modifiedCount,
    });
  } catch (err) {
    console.error("FIX STATUS ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
