import { NextRequest, NextResponse } from "next/server";
import { generateSellerDescription } from "@/lib/ai/seller-assistant";
import { sanitizeInputString } from "@/lib/ai/seller-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const title = sanitizeInputString(body.title, 150);
    const category = sanitizeInputString(body.category, 60);

    if (!title) {
      return NextResponse.json({ message: "Product title is required" }, { status: 400 });
    }

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
      description: result.description,
      titleSuggestion: result.titleSuggestion,
      highlights: result.highlights,
      structuredSpecs: result.structuredSpecs,
      unspecifiedFields: result.unspecifiedFields,
      questionsForSeller: result.questionsForSeller,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error("Description Generation Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to generate description" },
      { status: 500 }
    );
  }
}
