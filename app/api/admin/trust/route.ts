import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Report from "@/models/Report";
import mongoose from "mongoose";
import { analyseListingRiskBatch } from "@/lib/ai/trust-engine";

export const runtime = "nodejs";

/**
 * GET /api/admin/trust
 *
 * Admin moderation queue — returns pending reports with risk data.
 * Requires admin role. Returns newest pending first with pagination.
 *
 * Query params:
 *   status = pending | reviewed | dismissed | actioned (default: pending)
 *   page   = number (default: 1)
 *   limit  = number (default: 20, max: 50)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user?.id || user.role !== "admin") {
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const status = params.get("status") || "pending";
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const validStatuses = ["pending", "reviewed", "dismissed", "actioned"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ message: "Invalid status filter." }, { status: 400 });
    }

    await connectDB();

    const [reports, total] = await Promise.all([
      Report.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("listingId", "title price category images status user")
        .populate("reporterId", "name email")
        .lean(),
      Report.countDocuments({ status }),
    ]);

    // Attach lightweight risk data in a single batch query (eliminates N+1 database queries)
    const uniqueListingIds = [
      ...new Set(
        reports
          .map((r: any) => String((r.listingId as any)?._id || r.listingId))
          .filter((id: string) => /^[a-f\d]{24}$/i.test(id))
      ),
    ];

    const riskMap = await analyseListingRiskBatch(uniqueListingIds);


    const enrichedReports = reports.map((r: any) => {
      const lid = String((r.listingId as any)?._id || r.listingId);
      return {
        ...r,
        risk: riskMap[lid] || null,
      };
    });

    return NextResponse.json({
      reports: enrichedReports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("[api:admin:trust:get] Error:", err);
    return NextResponse.json({ message: "Failed to fetch moderation queue." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/trust
 *
 * Admin action on a report or listing.
 * Body: { reportId, action: "dismiss" | "review" | "action", adminNote?, listingAction?: "none" | "pending" | "spam" }
 *
 * listingAction optionally changes the listing status (requires additional human confirmation in UI).
 * This never automatically bans — the admin must explicitly choose an action.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user?.id || user.role !== "admin") {
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const { reportId, action, adminNote, listingAction } = body;

    if (!reportId || !/^[a-f\d]{24}$/i.test(String(reportId))) {
      return NextResponse.json({ message: "Invalid report ID." }, { status: 400 });
    }

    const validActions = ["dismiss", "review", "action"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ message: "Invalid action." }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
      dismiss: "dismissed",
      review: "reviewed",
      action: "actioned",
    };

    await connectDB();

    const report = await Report.findByIdAndUpdate(
      new mongoose.Types.ObjectId(String(reportId)),
      {
        $set: {
          status: statusMap[action],
          adminNote: typeof adminNote === "string" ? adminNote.slice(0, 500) : "",
          reviewedBy: new mongoose.Types.ObjectId(String(user.id)),
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ message: "Report not found." }, { status: 404 });
    }

    // Optionally update listing status — only if admin explicitly chose
    if (listingAction && listingAction !== "none") {
      const validListingActions = ["pending", "spam", "active"];
      if (!validListingActions.includes(listingAction)) {
        return NextResponse.json({ message: "Invalid listing action." }, { status: 400 });
      }
      await Ad.findByIdAndUpdate(report.listingId, { $set: { status: listingAction } });
    }

    return NextResponse.json({
      success: true,
      message: `Report marked as ${statusMap[action]}.`,
      report,
    });
  } catch (err: any) {
    console.error("[api:admin:trust:patch] Error:", err);
    return NextResponse.json({ message: "Failed to process moderation action." }, { status: 500 });
  }
}
