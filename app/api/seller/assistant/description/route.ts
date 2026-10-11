import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { generateSellerDescription } from "@/lib/ai/seller-assistant";
import { checkSellerRateLimit, verifyListingOwnership, sanitizeInputString } from "@/lib/ai/seller-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate seller
    const user = await getUserFromToken();
    if (!user || !user.id) {
      return NextResponse.json(
        { message: "Authentication required to use AI Seller Assistant" },
        { status: 401 }
      );
    }

    // 2. Rate limit check
    const rateLimitKey = `desc_${user.id}`;
    if (!checkSellerRateLimit(rateLimitKey, 20, 60_000)) {
      return NextResponse.json(
        { message: "Rate limit reached. Please wait before generating another description." },
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
        { message: "Product title is required to generate a description." },
        { status: 400 }
      );
    }

    // 4. If editing an existing listing, verify ownership
    if (body.listingId) {
      const ownership = await verifyListingOwnership(body.listingId, user.id);
      if (!ownership.authorized) {
        return NextResponse.json(
          { message: ownership.error || "Ownership verification failed" },
          { status: ownership.status || 403 }
        );
      }
    }

    // 5. Generate description using fact-based seller assistant
    const result = await generateSellerDescription({
      title,
      category: category || "General",
      brand: sanitizeInputString(body.brand, 80),
      model: sanitizeInputString(body.model, 80),
      condition: sanitizeInputString(body.condition, 80),
      yearsUsed: body.yearsUsed !== undefined ? sanitizeInputString(String(body.yearsUsed), 20) : undefined,
      defects: sanitizeInputString(body.defects, 300),
      accessories: sanitizeInputString(body.accessories, 300),
      specs: body.specs,
      askingPrice: typeof body.askingPrice === "number" ? body.askingPrice : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[api:seller:description] Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to generate listing description" },
      { status: 500 }
    );
  }
}
