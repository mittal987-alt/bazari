import { NextRequest, NextResponse } from "next/server";
import { analyseListingRisk } from "@/lib/ai/trust-engine";

export const runtime = "nodejs";

/**
 * GET /api/ads/[id]/risk
 *
 * Returns a trust & fraud risk analysis for a single listing.
 * Public endpoint — no auth required (risk data is advisory, non-accusatory).
 * Rate-limited by CDN/edge in production.
 *
 * Query params:
 *   skipAI=1   — skip AI narrative generation (use deterministic only; faster)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const skipAI = req.nextUrl.searchParams.get("skipAI") === "1";

    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ message: "Invalid listing ID" }, { status: 400 });
    }

    const result = await analyseListingRisk({ listingId: id, skipAI });

    return NextResponse.json(result, {
      headers: {
        // Cache risk analysis for 5 minutes at the edge
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    if (err.message === "Listing not found") {
      return NextResponse.json({ message: "Listing not found" }, { status: 404 });
    }
    console.error("[api:ads:risk] Error:", err);
    return NextResponse.json({ message: "Failed to analyse listing risk" }, { status: 500 });
  }
}
