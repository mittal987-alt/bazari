import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { analyzeImagePresentation } from "@/lib/ai/seller-assistant";
import { checkSellerRateLimit, sanitizeInputString } from "@/lib/ai/seller-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate seller
    const user = await getUserFromToken();
    if (!user || !user.id) {
      return NextResponse.json(
        { message: "Authentication required to analyze images" },
        { status: 401 }
      );
    }

    // 2. Rate limit check
    const rateLimitKey = `img_pres_${user.id}`;
    if (!checkSellerRateLimit(rateLimitKey, 30, 60_000)) {
      return NextResponse.json(
        { message: "Rate limit reached. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "10" } }
      );
    }

    // 3. Parse & validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.map((u: any) => String(u).trim()).filter(Boolean)
      : [];

    const feedback = analyzeImagePresentation({
      imageUrls,
      productTitle: sanitizeInputString(body.productTitle, 150),
      category: sanitizeInputString(body.category, 60),
    });

    return NextResponse.json({
      success: true,
      ...feedback,
    });
  } catch (error: any) {
    console.error("[api:seller:image-presentation] Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to analyze image presentation" },
      { status: 500 }
    );
  }
}
