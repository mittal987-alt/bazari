/**
 * Deterministic Database-Backed Fallback Engine
 *
 * When both hosted AI providers (Mistral and Gemini) fail due to rate limits (HTTP 429),
 * quota exhaustion, or service outages, this module provides deterministic, reliable,
 * database-backed fulfillment of user requests using the verified server-side marketplace tools.
 *
 * Capabilities:
 * 1. Product Search: extract keywords, category, price bounds, city, condition.
 * 2. Product Details: retrieve verified details for a valid 24-hex ObjectId.
 * 3. Product Comparison: compare 2-5 valid listing IDs side-by-side.
 * 4. Seller Information: retrieve public reputation for a seller or active listing.
 * 5. Price Fairness: calculate benchmark price evaluation.
 * 6. Recommendations: return budget-aware ranked listings.
 *
 * Never fabricates products, prices, or AI hallucinations. Transparently indicates
 * that results are fetched directly from the marketplace database.
 */

import {
  toolSearchProducts,
  toolGetProductDetails,
  toolCompareProducts,
  toolGetSellerInformation,
  toolEstimatePriceFairness,
  toolGetRecommendations,
  toolFindBudgetAlternatives,
  toolFindSimilarListings,
  type NormalizedListing,
  type ComparisonResult,
  type SellerInfo,
  type PriceFairnessResult,
  type RankedRecommendation,
  type ToolError,
} from "./marketplace-tools";
import type { AgentResponse, AgentProduct, AgentComparison, AgentPriceFairness, AgentSellerInfo } from "./marketplace-agent";

export interface DeterministicFallbackRequest {
  message: string;
  activeListingId?: string;
  history?: Array<{ role: "user" | "model"; content: string }>;
}

export interface DeterministicFallbackResult {
  handled: boolean;
  status: 200 | 400 | 503;
  response?: AgentResponse;
  error?: string;
}

const OBJECT_ID_REGEX = /\b[a-f\d]{24}\b/gi;

function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Parses numeric price expressions such as:
 * - 50000, 50,000, 50k, 50K
 * - 1.5 lakh, 2 lakhs
 */
function parsePriceValue(valStr: string): number | undefined {
  const clean = valStr.trim().replace(/,/g, "").toLowerCase();
  if (clean.endsWith("k")) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) ? undefined : Math.round(num * 1000);
  }
  if (clean.includes("lakh")) {
    const num = parseFloat(clean.replace(/lakhs?/, "").trim());
    return isNaN(num) ? undefined : Math.round(num * 100000);
  }
  const num = parseFloat(clean);
  return isNaN(num) ? undefined : Math.round(num);
}

/**
 * Extracts price filters (minPrice, maxPrice) from user query
 */
function extractPriceBounds(text: string): { minPrice?: number; maxPrice?: number } {
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  // "between 10000 and 20000" or "from 10k to 20k" or "10000 - 20000"
  const betweenMatch = text.match(
    /(?:between|from)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)\s*(?:to|and|-)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)/i
  );
  if (betweenMatch) {
    minPrice = parsePriceValue(betweenMatch[1]);
    maxPrice = parsePriceValue(betweenMatch[2]);
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      const temp = minPrice;
      minPrice = maxPrice;
      maxPrice = temp;
    }
    return { minPrice, maxPrice };
  }

  // "under 50000", "below 50k", "< 50000", "less than 50000", "budget 50000", "within 50000"
  const underMatch = text.match(
    /(?:under|below|less than|max|budget(?: of)?|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)/i
  );
  if (underMatch) {
    maxPrice = parsePriceValue(underMatch[1]);
  }

  // "above 10000", "over 10k", "> 10000", "more than 10000", "min 10000"
  const overMatch = text.match(
    /(?:above|over|more than|min|starting from)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?|\d+(?:\.\d+)?\s*lakhs?)/i
  );
  if (overMatch) {
    minPrice = parsePriceValue(overMatch[1]);
  }

  return { minPrice, maxPrice };
}

/**
 * Extracts city name if mentioned (e.g. "in Mumbai", "in Delhi", "in Bangalore")
 */
function extractCity(text: string): string | undefined {
  const match = text.match(/\bin\s+([A-Za-z]+)\b/i);
  if (match) {
    const candidate = match[1].trim();
    // Exclude common noise prepositions/words
    const ignored = new Set(["the", "a", "this", "budget", "inr", "rs", "cash", "good", "great", "mumbai", "delhi", "bangalore", "pune", "hyderabad", "chennai", "kolkata"]);
    if (ignored.has(candidate.toLowerCase())) {
      // Known Indian cities can be returned directly
      if (["mumbai", "delhi", "bangalore", "pune", "hyderabad", "chennai", "kolkata"].includes(candidate.toLowerCase())) {
        return candidate;
      }
    } else {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Detects common marketplace categories from keywords
 */
function extractCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\b(?:laptop|laptops|computer|computers|macbook|pc)\b/.test(lower)) return "Electronics";
  if (/\b(?:phone|phones|mobile|mobiles|iphone|android|smartphone)\b/.test(lower)) return "Electronics";
  if (/\b(?:bike|bikes|motorcycle|scooter|car|cars|vehicle|vehicles)\b/.test(lower)) return "Vehicles";
  if (/\b(?:furniture|sofa|table|chair|bed|desk)\b/.test(lower)) return "Furniture";
  if (/\b(?:fashion|clothes|shoes|clothing|jacket|shirt)\b/.test(lower)) return "Fashion";
  if (/\b(?:book|books|novel|textbook)\b/.test(lower)) return "Books";
  return undefined;
}

/**
 * Extracts recognized brand preferences from user input
 */
function extractBrand(text: string): string | undefined {
  const brandMatch = text.match(
    /\b(apple|iphone|macbook|dell|hp|lenovo|asus|acer|samsung|sony|oneplus|xiaomi|realme|fossil|nike|adidas|royal enfield|honda|toyota)\b/i
  );
  return brandMatch ? brandMatch[1] : undefined;
}

/**
 * Extracts condition preferences from user input
 */
function extractCondition(text: string): string | undefined {
  const condMatch = text.match(/\b(new|used|like new|refurbished|second hand|mint)\b/i);
  return condMatch ? condMatch[1] : undefined;
}

/**
 * Extracts clean search keywords by stripping conversational filler words
 */
function extractCleanQuery(text: string): string {
  return text
    .replace(/\b(?:find|show|search|get|list|display|give|me|for|a|the|some|any|please|can|you|what|are|is|there|in|under|below|above|between|to|and|rs|inr|₹|\d+k?|\d+\s*lakhs?)\b/gi, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Main Deterministic Fallback Executor
 */
export async function executeDeterministicFallback(
  req: DeterministicFallbackRequest
): Promise<DeterministicFallbackResult> {
  const text = req.message.trim();
  const lower = text.toLowerCase();

  // 1. Off-topic conversational queries (not marketplace related)
  const hasProductContext = /\b(?:laptop|laptops|phone|phones|macbook|car|bike|furniture|product|listing|price|buy|search|find|show|under|below|rs|₹|cheap|deal|gaming)\b/i.test(lower);
  const isOffTopic =
    !hasProductContext &&
    /\b(?:joke|jokes|funny|poem|story|riddle|weather|capital of|who wrote|who is the|president|prime minister|translate|write code|coding|script)\b/i.test(
      lower
    );
  if (isOffTopic) {
    return {
      handled: false,
      status: 503,
      error: `AI completion services are currently unavailable due to upstream provider quota limits, and this query cannot be resolved via marketplace database search. Please browse active marketplace listings directly at /ads or ask a product-specific question.`,
    };
  }

  // Extract any 24-hex ObjectIds present in the message
  let matchedIds = (text.match(OBJECT_ID_REGEX) || []).map((id) => id.trim());

  // If no IDs in message, check history for referenced IDs (e.g. "first result", "second result", "compare the first two")
  if (matchedIds.length === 0 && req.history && req.history.length > 0) {
    for (let i = req.history.length - 1; i >= 0; i--) {
      const turn = req.history[i];
      if (turn.role === "model") {
        const historyIds = (turn.content.match(OBJECT_ID_REGEX) || []).map((id) => id.trim());
        if (historyIds.length > 0) {
          const uniqueHistoryIds = [...new Set(historyIds)];
          if (/\b(?:first|1st|initial)\b/i.test(lower)) {
            matchedIds = [uniqueHistoryIds[0]];
          } else if (/\b(?:second|2nd)\b/i.test(lower) && uniqueHistoryIds.length >= 2) {
            matchedIds = [uniqueHistoryIds[1]];
          } else if (/\b(?:third|3rd)\b/i.test(lower) && uniqueHistoryIds.length >= 3) {
            matchedIds = [uniqueHistoryIds[2]];
          } else if (/\b(?:compare|both|two)\b/i.test(lower)) {
            matchedIds = uniqueHistoryIds.slice(0, 5);
          } else {
            // Default to first result for general seller/fairness/details queries
            matchedIds = [uniqueHistoryIds[0]];
          }
          break;
        }
      }
    }
  }

  const effectiveId =
    matchedIds.length > 0
      ? matchedIds[0]
      : req.activeListingId && isValidObjectId(req.activeListingId)
      ? req.activeListingId
      : undefined;

  /* -------------------------------------------------------------
     ACTION A: Product Comparison (2 or more listing IDs)
  ------------------------------------------------------------- */
  const isComparisonQuery = /\b(?:compare|comparison|difference|vs|versus|which is better|which one)\b/i.test(lower);
  if (isComparisonQuery || matchedIds.length >= 2) {
    const candidateIds = [...new Set([...matchedIds, ...(req.activeListingId ? [req.activeListingId] : [])])].filter(
      isValidObjectId
    );

    if (candidateIds.length >= 2) {
      const compResult = await toolCompareProducts(candidateIds.slice(0, 5));
      if ("error" in compResult) {
        return {
          handled: true,
          status: 200,
          response: {
            answer: `AI completion is temporarily at capacity. Comparison lookup notice: ${compResult.error}.`,
            suggestions: ["Search laptops", "Search phones", "Browse active listings"],
            provider: "database_fallback",
          },
        };
      }

      const comp = compResult as ComparisonResult;
      const agentComp: AgentComparison = {
        listings: comp.listings.map((l) => ({ ...l })),
        summary: comp.summary,
      };

      return {
        handled: true,
        status: 200,
        response: {
          answer: `AI completion services are currently experiencing high traffic. Here is a side-by-side comparison of ${comp.listings.length} listings retrieved directly from our verified marketplace database:`,
          products: comp.listings.map((l) => ({ ...l })),
          comparison: agentComp,
          suggestions: [
            comp.listings[0] ? `Is the price fair for "${comp.listings[0].title}"?` : "Check price fairness",
            "Show me more recommendations",
          ],
          provider: "database_fallback",
        },
      };
    }
  }

  /* -------------------------------------------------------------
     ACTION B: Price Fairness Assessment
  ------------------------------------------------------------- */
  const isFairnessQuery = /\b(?:fair|fairness|overpriced|underpriced|good deal|worth it|price check|market price|good price)\b/i.test(
    lower
  );
  if (isFairnessQuery && effectiveId) {
    const fairnessResult = await toolEstimatePriceFairness(effectiveId);
    if ("error" in fairnessResult) {
      return {
        handled: true,
        status: 200,
        response: {
          answer: `AI completion is temporarily at capacity. Price fairness lookup notice: ${fairnessResult.error}.`,
          suggestions: ["Search laptops under 50000", "Browse active listings"],
          provider: "database_fallback",
        },
      };
    }

    const fairness = fairnessResult as PriceFairnessResult;
    // Also fetch product details for card rendering
    const detailsResult = await toolGetProductDetails(effectiveId);
    const products: AgentProduct[] = [];
    if (!("error" in detailsResult)) {
      products.push(detailsResult as NormalizedListing);
    }

    const agentFairness: AgentPriceFairness = {
      listingId: fairness.listingId,
      listingTitle: fairness.listingTitle,
      listingPrice: fairness.listingPrice,
      averageMarketPrice: fairness.averageMarketPrice,
      assessment: fairness.assessment,
      percentageDiff: fairness.percentageDiff,
      note: fairness.note,
    };

    const assessmentLabel =
      fairness.assessment === "fair"
        ? "Fairly priced"
        : fairness.assessment === "below_market"
        ? "Below market price (Great deal)"
        : fairness.assessment === "above_market"
        ? "Above market price"
        : "Insufficient comparable data";

    return {
      handled: true,
      status: 200,
      response: {
        answer: `AI completion is temporarily operating in database fallback mode. Here is the objective price fairness analysis for "${fairness.listingTitle}" based on actual marketplace sales and listings:\n\n• Listed Price: ₹${fairness.listingPrice.toLocaleString()}\n• Market Average: ${fairness.averageMarketPrice ? "₹" + fairness.averageMarketPrice.toLocaleString() : "N/A"}\n• Assessment: ${assessmentLabel}\n• Details: ${fairness.note}`,
        products: products.length > 0 ? products : undefined,
        priceFairness: agentFairness,
        suggestions: [
          products[0]?.sellerId ? "Tell me about the seller" : "Show recommendations",
          "Compare with another listing",
        ],
        provider: "database_fallback",
      },
    };
  }

  /* -------------------------------------------------------------
     ACTION C: Seller Reputation & Trust Lookup
  ------------------------------------------------------------- */
  const isSellerQuery = /\b(?:seller|who is selling|seller trust|seller rating|trusted seller|reputation)\b/i.test(
    lower
  );
  if (isSellerQuery) {
    let targetSellerId: string | undefined;

    // Check if effectiveId is itself a sellerId or a listingId
    if (effectiveId) {
      const detailsResult = await toolGetProductDetails(effectiveId);
      if (!("error" in detailsResult)) {
        targetSellerId = (detailsResult as NormalizedListing).sellerId;
      } else {
        targetSellerId = effectiveId;
      }
    }

    if (targetSellerId && isValidObjectId(targetSellerId)) {
      const sellerResult = await toolGetSellerInformation(targetSellerId);
      if ("error" in sellerResult) {
        return {
          handled: true,
          status: 200,
          response: {
            answer: `AI completion is temporarily at capacity. Seller lookup notice: ${sellerResult.error}.`,
            suggestions: ["Search active listings at /ads", "Browse laptops"],
            provider: "database_fallback",
          },
        };
      }

      const seller = sellerResult as SellerInfo;
      const agentSeller: AgentSellerInfo = {
        _id: seller._id,
        name: seller.name,
        averageRating: seller.averageRating,
        reviewCount: seller.reviewCount,
        isTrusted: seller.isTrusted,
        accountAgeDays: seller.accountAgeDays,
      };

      return {
        handled: true,
        status: 200,
        response: {
          answer: `AI completion is temporarily at capacity. Here is the verified seller information from our marketplace database for ${seller.name}:\n\n• Rating: ${seller.averageRating > 0 ? `${seller.averageRating} / 5 (${seller.reviewCount} reviews)` : "No reviews yet"}\n• Trust Status: ${seller.isTrusted ? "Verified Trusted Seller" : "Standard Community Member"}\n• Account Age: ${seller.accountAgeDays} days on Bazari`,
          sellerInfo: agentSeller,
          suggestions: ["Is this price fair?", "Search similar products"],
          provider: "database_fallback",
        },
      };
    }
  }

  /* -------------------------------------------------------------
     ACTION D: Product Details Lookup
  ------------------------------------------------------------- */
  const isDetailsQuery =
    effectiveId &&
    (/\b(?:detail|details|specs|specification|condition|tell me about|show me|view)\b/i.test(lower) ||
      matchedIds.length > 0);

  if (isDetailsQuery && effectiveId) {
    const detailsResult = await toolGetProductDetails(effectiveId);
    if ("error" in detailsResult) {
      return {
        handled: true,
        status: 200,
        response: {
          answer: `AI completion is temporarily at capacity. Listing details notice: ${detailsResult.error}.`,
          suggestions: ["Search active listings at /ads", "Browse laptops"],
          provider: "database_fallback",
        },
      };
    }

    const listing = detailsResult as NormalizedListing;
    return {
      handled: true,
      status: 200,
      response: {
        answer: `AI completion services are temporarily experiencing high demand. Here are the verified listing details for "${listing.title}" from our database:\n\n• Price: ₹${listing.price.toLocaleString()}\n• Category: ${listing.category}\n• Location: ${listing.locationName}\n• Description: ${listing.descriptionExcerpt}`,
        products: [listing],
        suggestions: [
          `Is the price fair for "${listing.title}"?`,
          "Tell me about the seller",
          "Show recommendations in this category",
        ],
        provider: "database_fallback",
      },
    };
  }

  /* -------------------------------------------------------------
     ACTION D.2: Budget Alternatives (Cheaper Listings)
  ------------------------------------------------------------- */
  const isCheaperQuery = /\b(?:cheaper|cheapest|lower price|less expensive|budget alternatives?|cheaper alternatives?|cheaper ones|alternatives that are cheaper)\b/i.test(
    lower
  );
  if (isCheaperQuery && effectiveId) {
    const altResult = await toolFindBudgetAlternatives({ referenceListingId: effectiveId });
    if (!("error" in altResult)) {
      const alts = altResult as RankedRecommendation[];
      if (alts.length > 0) {
        return {
          handled: true,
          status: 200,
          response: {
            answer: `AI completion services are temporarily in database fallback mode. Here are ${alts.length} verified listings priced lower than the referenced item, directly from our marketplace database:`,
            products: alts.map((r) => ({
              ...r.listing,
              score: r.score,
              reasons: r.reasons,
              tradeOffs: r.tradeOffs,
            })),
            suggestions: [
              alts.length >= 2 ? "Compare the first two listings for me" : "Is the price fair?",
              "Tell me about the seller of the first result",
            ],
            provider: "database_fallback",
          },
        };
      } else {
        return {
          handled: true,
          status: 200,
          response: {
            answer: `I searched our marketplace database, but found no active listings in this category priced lower than this item. This listing is currently the most competitively priced option available.`,
            suggestions: ["Show all recommendations in this category", "Check price fairness"],
            provider: "database_fallback",
          },
        };
      }
    }
  }

  /* -------------------------------------------------------------
     ACTION E: Recommendations
  ------------------------------------------------------------- */
  const isRecQuery = /\b(?:recommend|recommendation|recommendations|suggest|suggestions|best options|top deals|best value|deals)\b/i.test(
    lower
  );
  if (isRecQuery) {
    const { minPrice, maxPrice } = extractPriceBounds(text);
    const category = extractCategory(text);
    const brand = extractBrand(text);
    const condition = extractCondition(text);
    const city = extractCity(text);
    const cleanQuery = extractCleanQuery(text) || brand || category || "deals";

    const recResult = await toolGetRecommendations({
      query: cleanQuery,
      minPrice,
      maxPrice,
      brand,
      condition,
      category,
      city,
    });

    if (!("error" in recResult)) {
      const recs = recResult as RankedRecommendation[];
      if (recs.length > 0) {
        return {
          handled: true,
          status: 200,
          response: {
            answer: `AI completion is temporarily operating in database fallback mode. Here are ${recs.length} recommended listings ranked by budget and ratings from our verified database:`,
            products: recs.map((r) => ({
              ...r.listing,
              score: r.score,
              reasons: r.reasons,
              tradeOffs: r.tradeOffs,
            })),
            suggestions: [
              recs.length >= 2 ? "Compare the first two listings for me" : "Check price fairness",
              "Search with a different budget",
            ],
            provider: "database_fallback",
          },
        };
      }
    }
  }

  /* -------------------------------------------------------------
     ACTION F: Search Active Listings (Keyword, Price, City, Category, Brand)
  ------------------------------------------------------------- */
  const priceBounds = extractPriceBounds(text);
  const detectedCategory = extractCategory(text);
  const detectedBrand = extractBrand(text);
  const detectedCondition = extractCondition(text);
  const detectedCity = extractCity(text);
  const cleanQuery = extractCleanQuery(text);

  // If user has search intent, explicit category, brand, condition, price bounds, city, or product terms
  const hasSearchIntent =
    detectedCategory !== undefined ||
    detectedBrand !== undefined ||
    detectedCondition !== undefined ||
    priceBounds.minPrice !== undefined ||
    priceBounds.maxPrice !== undefined ||
    detectedCity !== undefined ||
    /\b(?:find|show|search|buy|browse|looking for|shop|listings?|products?|ads?|laptops?|phones?|mobiles?|bikes?|cars?|furniture|electronics|shoes?|clothes?|books?)\b/i.test(
      lower
    ) ||
    (cleanQuery.length > 2 &&
      /\b(?:laptop|phone|mobile|bike|car|sofa|table|chair|bed|shoe|camera|watch|headphone|earphone|tv|monitor|keyboard|mouse|speaker)\b/i.test(
        cleanQuery
      ));

  if (hasSearchIntent) {
    const searchResult = await toolSearchProducts({
      query: cleanQuery.length > 0 ? cleanQuery : undefined,
      category: detectedCategory,
      brand: detectedBrand,
      condition: detectedCondition,
      minPrice: priceBounds.minPrice,
      maxPrice: priceBounds.maxPrice,
      city: detectedCity,
      limit: 6,
    });

    if (!("error" in searchResult)) {
      const listings = searchResult as NormalizedListing[];
      if (listings.length > 0) {
        const priceDesc =
          priceBounds.minPrice && priceBounds.maxPrice
            ? ` between ₹${priceBounds.minPrice.toLocaleString()} and ₹${priceBounds.maxPrice.toLocaleString()}`
            : priceBounds.maxPrice
            ? ` under ₹${priceBounds.maxPrice.toLocaleString()}`
            : priceBounds.minPrice
            ? ` above ₹${priceBounds.minPrice.toLocaleString()}`
            : "";

        return {
          handled: true,
          status: 200,
          response: {
            answer: `AI completion services are currently experiencing high demand. I found ${listings.length} active listings directly in our database matching your criteria${priceDesc}:`,
            products: listings,
            suggestions: [
              listings.length >= 2 ? "Compare the first two listings for me" : "Is the price fair?",
              "Tell me about the seller of the first result",
              "Show recommendations",
            ],
            provider: "database_fallback",
          },
        };
      } else {
        return {
          handled: true,
          status: 200,
          response: {
            answer: `AI completion is temporarily at capacity. No active listings were found in our marketplace database matching your specific criteria. Try increasing your budget, removing filters, or browsing all active listings at /ads.`,
            products: [],
            suggestions: ["Show all laptops", "Show all phones", "Browse active listings at /ads"],
            provider: "database_fallback",
          },
        };
      }
    } else {
      const err = searchResult as ToolError;
      return {
        handled: true,
        status: 400,
        error: `Search validation error: ${err.error}`,
      };
    }
  }

  /* -------------------------------------------------------------
     ACTION G: Greeting / Friendly Welcome
  ------------------------------------------------------------- */
  if (/\b(?:hi|hello|hey|greetings|help|start)\b/i.test(lower)) {
    return {
      handled: true,
      status: 200,
      response: {
        answer: `Hello! I am Bazari AI, your marketplace assistant. While our conversational AI is currently operating in direct database mode due to provider quota limits, I can search listings, compare products, check price fairness, and view seller reputation. Try asking:\n• "Find laptops under ₹50,000"\n• "Show phones between ₹10,000 and ₹20,000"\n• "Is this listing fairly priced?"`,
        suggestions: ["Find laptops under 50000", "Show phones in Mumbai", "Browse all listings at /ads"],
        provider: "database_fallback",
      },
    };
  }

  /* -------------------------------------------------------------
     ACTION H: Unsupported Request (Chit-chat, off-topic)
  ------------------------------------------------------------- */
  return {
    handled: false,
    status: 503,
    error: `AI completion services are currently unavailable due to upstream provider quota limits, and this query cannot be resolved via marketplace database search. Please browse active marketplace listings directly at /ads or ask a product-specific question.`,
  };
}
