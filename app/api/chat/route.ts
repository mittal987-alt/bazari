import { NextResponse } from "next/server";
import { runMarketplaceAgent } from "@/lib/ai/marketplace-agent";
import { generateEmbedding, searchAds, generateChatResponse } from "@/services/ai.service";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const { message, history } = body as { message?: unknown; history?: unknown };

    // Validate message
    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 }
      );
    }

    // Validate and sanitize history
    const sanitizedHistory: Array<{ role: "user" | "model"; content: string }> = [];
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2); // keep recent turns only
      for (const turn of recentHistory) {
        if (
          turn &&
          typeof turn === "object" &&
          (turn.role === "user" || turn.role === "model") &&
          typeof turn.content === "string" &&
          turn.content.trim().length > 0
        ) {
          sanitizedHistory.push({
            role: turn.role,
            content: turn.content.slice(0, MAX_MESSAGE_LENGTH), // cap each turn
          });
        }
      }
    }

    // Primary path: Agentic Gemini function-calling
    try {
      const agentResult = await runMarketplaceAgent({
        message: message.trim(),
        history: sanitizedHistory.length > 0 ? sanitizedHistory : undefined,
      });

      // Normalize products to be backward-compatible with legacy Product shape
      const products = agentResult.products?.map((p) => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        category: p.category,
        locationName: p.locationName,
        images: p.images,
        description: p.descriptionExcerpt,
        listingUrl: p.listingUrl,
        sellerId: p.sellerId,
        status: p.status,
        createdAt: p.createdAt,
        views: p.views,
        isGroupBuy: p.isGroupBuy,
        groupBuyPrice: p.groupBuyPrice,
        score: p.score,
        reasons: p.reasons,
      }));

      return NextResponse.json({
        answer: agentResult.answer,
        products: products && products.length > 0 ? products : undefined,
        comparison: agentResult.comparison,
        priceFairness: agentResult.priceFairness,
        sellerInfo: agentResult.sellerInfo,
        suggestions: agentResult.suggestions,
        error: agentResult.error,
      });
    } catch (agentErr) {
      console.warn("Agentic path failed, falling back to legacy search:", agentErr);

      // Fallback path: Legacy vector-search + Mistral/Gemini response
      try {
        const queryEmbedding = await generateEmbedding(message.trim());
        const relevantAds = await searchAds(queryEmbedding, message.trim());
        const aiAnswer = await generateChatResponse(message.trim(), relevantAds);

        return NextResponse.json({
          answer: aiAnswer,
          products: relevantAds.length > 0 ? relevantAds : undefined,
          error: "FALLBACK_MODE",
        });
      } catch (fallbackErr) {
        console.error("Fallback path also failed:", fallbackErr);
        return NextResponse.json({
          answer:
            "I'm having trouble responding right now. Please try again or browse listings directly on the marketplace.",
          error: "SERVICE_UNAVAILABLE",
        });
      }
    }
  } catch (error) {
    console.error("Chat API unhandled error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}





 