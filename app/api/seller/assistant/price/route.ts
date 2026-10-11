import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { suggestListingPrice } from "@/lib/ai/seller-assistant";
import { checkSellerRateLimit, verifyListingOwnership, sanitizeInputString } from "@/lib/ai/seller-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate seller
    const user = await getUserFromToken();
    if (!user || !user.id) {
      return NextResponse.json(
        { message: "Authentication required to receive price suggestions" },
        { status: 401 }
      );
    }

    // 2. Rate limit check
    const rateLimitKey = `price_${user.id}`;
    if (!checkSellerRateLimit(rateLimitKey, 20, 60_000)) {
      return NextResponse.json(
        { message: "Rate limit reached. Please wait before requesting another price suggestion." },
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

    const title = sanitizeInputString(body.title, 150);
    const category = sanitizeInputString(body.category, 60);

    if (!title) {
      return NextResponse.json(
        { message: "Product title is required to suggest a price." },
        { status: 400 }
      );
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

    // 5. Run price suggestion against MongoDB comparables
    const result = await suggestListingPrice({
      title,
      category: category || "General",
      brand: sanitizeInputString(body.brand, 80),
      model: sanitizeInputString(body.model, 80),
      condition: sanitizeInputString(body.condition, 80),
      yearsUsed: body.yearsUsed !== undefined ? sanitizeInputString(String(body.yearsUsed), 20) : undefined,
      askingPrice: typeof body.askingPrice === "number" ? body.askingPrice : undefined,
      specs: body.specs,
      excludeListingId: body.listingId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[api:seller:price] Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to calculate price suggestion" },
      { status: 500 }
    );
  }
}
