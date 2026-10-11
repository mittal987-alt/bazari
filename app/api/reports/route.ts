import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Report from "@/models/Report";
import Ad from "@/models/Ad";
import mongoose from "mongoose";

export const runtime = "nodejs";

const VALID_REASONS = [
  "scam_or_fraud",
  "counterfeit_item",
  "prohibited_item",
  "offensive_content",
  "spam_or_duplicate",
  "misleading_description",
  "wrong_category",
  "other",
] as const;

/**
 * POST /api/reports
 *
 * Submits a user report for a listing. Authenticated sellers/buyers only.
 * One report per user per listing (enforced by unique DB index).
 *
 * Body: { listingId, reason, details? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user?.id) {
      return NextResponse.json(
        { message: "You must be signed in to report a listing." },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const { listingId, reason, details } = body;

    // Validate listing ID
    if (!listingId || !/^[a-f\d]{24}$/i.test(String(listingId))) {
      return NextResponse.json({ message: "Invalid listing ID." }, { status: 400 });
    }

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { message: "Invalid report reason. Please select a valid category." },
        { status: 400 }
      );
    }

    // Sanitize details
    const sanitizedDetails = typeof details === "string"
      ? details.replace(/<[^>]*>?/gm, "").replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "").trim().slice(0, 500)
      : "";

    await connectDB();

    const listingOid = new mongoose.Types.ObjectId(String(listingId));

    // Verify listing exists
    const ad = await Ad.findById(listingOid).select("_id user").lean();
    if (!ad) {
      return NextResponse.json({ message: "Listing not found." }, { status: 404 });
    }

    // Prevent self-reporting
    if (String((ad as any).user) === String(user.id)) {
      return NextResponse.json(
        { message: "You cannot report your own listing." },
        { status: 400 }
      );
    }

    // Upsert: if user already reported this listing, update reason & details
    await Report.findOneAndUpdate(
      {
        listingId: listingOid,
        reporterId: new mongoose.Types.ObjectId(String(user.id)),
      },
      {
        $set: {
          reason,
          details: sanitizedDetails,
          status: "pending",
        },
        $setOnInsert: {
          listingId: listingOid,
          reporterId: new mongoose.Types.ObjectId(String(user.id)),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Your report has been submitted. Our moderation team will review it.",
    });
  } catch (err: any) {
    console.error("[api:reports] Error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to submit report." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports?listingId=xxx
 *
 * Returns the current user's report for a given listing (if any).
 * Used to show "You've already reported this listing" in the UI.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user?.id) {
      return NextResponse.json({ reported: false });
    }

    const listingId = req.nextUrl.searchParams.get("listingId");
    if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
      return NextResponse.json({ reported: false });
    }

    await connectDB();

    const existing = await Report.findOne({
      listingId: new mongoose.Types.ObjectId(listingId),
      reporterId: new mongoose.Types.ObjectId(String(user.id)),
    }).select("reason createdAt").lean();

    if (!existing) {
      return NextResponse.json({ reported: false });
    }

    return NextResponse.json({
      reported: true,
      reason: (existing as any).reason,
      reportedAt: (existing as any).createdAt,
    });
  } catch (err: any) {
    console.error("[api:reports:get] Error:", err);
    return NextResponse.json({ reported: false });
  }
}
