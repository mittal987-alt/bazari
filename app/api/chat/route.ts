import { NextResponse } from "next/server";
import { runMarketplaceAgent } from "@/lib/ai/marketplace-agent";
import { generateEmbedding, searchAds, generateChatResponse } from "@/services/ai.service";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

// In-memory sliding-window rate limiter per client IP
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestHistory.get(clientIp) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestHistory.set(clientIp, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  ipRequestHistory.set(clientIp, validTimestamps);
  return true;
}

export async function POST(req: Request) {
  try {
    // 1. IP extraction & Rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait a moment before sending another message.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "10",
          },
        }
      );
    }

    // 2. Parse & validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const { message, history, activeListingId } = body as {
      message?: unknown;
      history?: unknown;
      activeListingId?: unknown;
    };

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

    // Validate and sanitize activeListingId
    const sanitizedActiveListingId =
      typeof activeListingId === "string" && /^[a-f\d]{24}$/i.test(activeListingId.trim())
        ? activeListingId.trim()
        : undefined;

    // Validate and sanitize history
    const sanitizedHistory: Array<{ role: "user" | "model"; content: string }> = [];
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
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
            content: turn.content.slice(0, MAX_MESSAGE_LENGTH),
          });
        }
      }
    }

    // 3. Primary path: Multi-provider Agentic Assistant (Mistral preferred with Gemini fallback)
    try {
      const agentResult = await runMarketplaceAgent({
        message: message.trim(),
        history: sanitizedHistory.length > 0 ? sanitizedHistory : undefined,
        activeListingId: sanitizedActiveListingId,
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

      if (agentResult.statusCode && agentResult.statusCode !== 200) {
        return NextResponse.json(
          {
            error: agentResult.answer || agentResult.error || "Service unavailable",
            answer: agentResult.answer,
            provider: agentResult.provider,
          },
          { status: agentResult.statusCode }
        );
      }

      return NextResponse.json({
        answer: agentResult.answer,
        products: products && products.length > 0 ? products : undefined,
        comparison: agentResult.comparison,
        priceFairness: agentResult.priceFairness,
        sellerInfo: agentResult.sellerInfo,
        suggestions: agentResult.suggestions,
        error: agentResult.error,
        provider: agentResult.provider,
      });
    } catch (agentErr) {
      console.warn("[chat:route] Multi-provider agent failed, falling back to legacy search:", agentErr);

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
        console.error("[chat:route] Fallback path also failed:", fallbackErr);
        return NextResponse.json({
          answer:
            "I'm having trouble responding right now. Please try again or browse listings directly on the marketplace.",
          error: "SERVICE_UNAVAILABLE",
        });
      }
    }
  } catch (error) {
    console.error("[chat:route] Unhandled error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}