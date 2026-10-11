import { NextRequest, NextResponse } from "next/server";
import { interpretSearchQuery } from "@/lib/search/search-interpreter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const activeListingId = typeof body.activeListingId === "string" ? body.activeListingId : undefined;
    const userCity = typeof body.userCity === "string" ? body.userCity : undefined;
    const forceDeterministic = Boolean(body.forceDeterministic);

    if (!query) {
      return NextResponse.json(
        { message: "Query string is required" },
        { status: 400 }
      );
    }

    const interpretation = await interpretSearchQuery(query, {
      activeListingId,
      userCity,
      forceDeterministic,
    });

    return NextResponse.json({
      success: true,
      interpretation,
    });
  } catch (err) {
    console.error("[api:ads:interpret] Error:", err);
    return NextResponse.json(
      { message: "Failed to interpret query" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const userCity = searchParams.get("city") || undefined;

    if (!query.trim()) {
      return NextResponse.json(
        { message: "Query parameter is required" },
        { status: 400 }
      );
    }

    const interpretation = await interpretSearchQuery(query.trim(), {
      userCity,
    });

    return NextResponse.json({
      success: true,
      interpretation,
    });
  } catch (err) {
    console.error("[api:ads:interpret] GET Error:", err);
    return NextResponse.json(
      { message: "Failed to interpret query" },
      { status: 500 }
    );
  }
}
