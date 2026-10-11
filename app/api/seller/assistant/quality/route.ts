import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { auditListingQuality } from "@/lib/ai/seller-assistant";
import { checkSellerRateLimit, verifyListingOwnership, sanitizeInputString } from "@/lib/ai/seller-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate seller
    const user = await getUserFromToken();
    if (!user || !user.id) {
      return NextResponse.json(
        { message: "Authentication required to audit listing quality" },
        { status: 401 }
      );
    }

    // 2. Rate limit check
    const rateLimitKey = `quality_${user.id}`;
    if (!checkSellerRateLimit(rateLimitKey, 30, 60_000)) {
      return NextResponse.json(
        { message: "Rate limit reached. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "10" } }
      );
    }

    // 3. Parse & validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    // 4. Verify ownership if referencing an existing listing
    if (body.listingId) {
      const ownership = await verifyListingOwnership(body.listingId, user.id);
      if (!ownership.authorized) {
        return NextResponse.json(
          { message: ownership.error || "Ownership verification failed" },
          { status: ownership.status || 403 }
        );
      }
    }

    const title = sanitizeInputString(body.title, 150);
    const description = sanitizeInputString(body.description, 3000);
    const category = sanitizeInputString(body.category, 60);
    const price = typeof body.price === "number" ? body.price : Number(body.price) || 0;
    const images = Array.isArray(body.images) ? body.images.map((img: any) => String(img).trim()) : [];

    const result = auditListingQuality({
      title,
      description,
      price,
      category,
      images,
      condition: sanitizeInputString(body.condition, 80),
      yearsUsed: body.yearsUsed !== undefined ? sanitizeInputString(String(body.yearsUsed), 20) : undefined,
      defects: sanitizeInputString(body.defects, 300),
      accessories: sanitizeInputString(body.accessories, 300),
      specs: body.specs,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[api:seller:quality] Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to audit listing quality" },
      { status: 500 }
    );
  }
}
