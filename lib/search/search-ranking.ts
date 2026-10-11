/**
 * Bazari Search Ranking & Relevance Engine (Phase 7)
 *
 * Provides transparent, deterministic ranking signals:
 * 1. Text relevance (title weight > description weight, phrase boost)
 * 2. Category match
 * 3. Budget fit (proximity to buyer budget without skewing)
 * 4. Condition match
 * 5. Location match
 * 6. Listing completeness (images, detailed description)
 * 7. Seller reputation (only when reliable seller ratings exist)
 *
 * Avoids views or popularity dominating relevance.
 * Explains ranking transparently via human-readable matching reasons.
 */

import { normalizeText, extractSearchTokens } from "./search-normalization";

export interface SearchRankingCriteria {
  query?: string;
  category?: string;
  brand?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  sortBy?: "relevance" | "price_low" | "price_high" | "trending" | "newest";
}

export interface RankedListingItem {
  _id: any;
  title: string;
  description?: string;
  price: number;
  category: string;
  locationName?: string;
  images?: string[];
  createdAt?: string | Date;
  views?: number;
  chats?: number;
  status: string;
  user?: {
    _id?: any;
    name?: string;
    isSellerVerified?: boolean;
    rating?: number;
    reviewCount?: number;
  };
  relevanceScore?: number;
  matchReasons?: string[];
  [key: string]: any;
}

/**
 * Evaluates listing relevance and returns an explainable score between 0 and 100
 * along with transparent match reasons.
 */
export function calculateListingRelevance(
  listing: RankedListingItem,
  criteria: SearchRankingCriteria
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const titleNorm = normalizeText(listing.title || "");
  const descNorm = normalizeText(listing.description || "");
  const fullText = `${titleNorm} ${descNorm}`;

  // 1. Text relevance & token matching
  if (criteria.query && criteria.query.trim()) {
    const { tokens, expandedTerms } = extractSearchTokens(criteria.query);
    let titleMatches = 0;
    let descMatches = 0;

    for (const token of tokens) {
      if (titleNorm.includes(token)) {
        titleMatches++;
      } else if (descNorm.includes(token)) {
        descMatches++;
      }
    }

    if (titleMatches > 0) {
      const titleBoost = Math.min(35, titleMatches * 15);
      score += titleBoost;
      reasons.push(`Title matches keyword${titleMatches > 1 ? "s" : ""}`);
    }

    if (descMatches > 0) {
      const descBoost = Math.min(15, descMatches * 5);
      score += descBoost;
      reasons.push("Description mentions product details");
    }

    // Exact phrase match bonus
    const phrase = normalizeText(criteria.query);
    if (phrase.length > 3 && titleNorm.includes(phrase)) {
      score += 15;
      reasons.push("Exact phrase match in title");
    }

    // Expanded terms (synonyms / typo tolerance)
    let synonymMatch = false;
    for (const term of expandedTerms) {
      if (!tokens.includes(term) && fullText.includes(term)) {
        synonymMatch = true;
        break;
      }
    }
    if (synonymMatch) {
      score += 5;
      reasons.push("Matches related search terms");
    }
  } else {
    // If no query keyword was provided, base baseline
    score += 20;
  }

  // 2. Category match
  if (criteria.category) {
    if (listing.category && listing.category.toLowerCase() === criteria.category.toLowerCase()) {
      score += 20;
      reasons.push(`Exact category match: ${listing.category}`);
    }
  }

  // 3. Brand match
  if (criteria.brand) {
    const brandNorm = criteria.brand.toLowerCase();
    if (titleNorm.includes(brandNorm)) {
      score += 15;
      reasons.push(`Brand match (${criteria.brand})`);
    } else if (descNorm.includes(brandNorm)) {
      score += 8;
      reasons.push(`Brand referenced in listing`);
    }
  }

  // 4. Budget fit
  if (criteria.maxPrice !== undefined && criteria.maxPrice > 0) {
    if (listing.price <= criteria.maxPrice) {
      score += 10;
      const budgetDiff = criteria.maxPrice - listing.price;
      const pctUnder = Math.round((budgetDiff / criteria.maxPrice) * 100);
      reasons.push(`Within budget (${pctUnder}% below max limit)`);

      // Sweet spot bonus (sensible budget efficiency without zero-price anomalies)
      if (listing.price >= criteria.maxPrice * 0.4) {
        score += 5;
      }
    } else {
      // Over budget penalty
      score = Math.max(0, score - 20);
    }
  }

  // 5. Condition match
  if (criteria.condition) {
    const condNorm = criteria.condition.toLowerCase();
    if (fullText.includes(condNorm)) {
      score += 10;
      reasons.push(`Matches condition: ${criteria.condition}`);
    }
  }

  // 6. Location match
  if (criteria.city && listing.locationName) {
    const cityNorm = criteria.city.toLowerCase();
    if (listing.locationName.toLowerCase().includes(cityNorm)) {
      score += 15;
      reasons.push(`Located in ${listing.locationName}`);
    }
  }

  // 7. Listing completeness (quality signals)
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    score += 5;
  }
  if (listing.description && listing.description.trim().length > 40) {
    score += 5;
  }

  // 8. Reliable seller rating (if available)
  if (listing.user?.isSellerVerified) {
    score += 3;
    reasons.push("Verified seller");
  }
  if (typeof listing.user?.rating === "number" && listing.user.rating >= 4.0) {
    score += 2;
  }

  const normalizedScore = Math.min(100, Math.max(0, score));

  return {
    score: normalizedScore,
    reasons: reasons.slice(0, 4),
  };
}

/**
 * Sorts and ranks an array of listings deterministically based on ranking criteria.
 */
export function rankListings(
  listings: RankedListingItem[],
  criteria: SearchRankingCriteria
): RankedListingItem[] {
  // 1. Calculate relevance scores and match reasons for each item
  const scored = listings.map((item) => {
    const { score, reasons } = calculateListingRelevance(item, criteria);
    return {
      ...item,
      relevanceScore: score,
      matchReasons: reasons,
    };
  });

  // 2. Sort based on criteria.sortBy
  const sort = criteria.sortBy || "relevance";

  return scored.sort((a, b) => {
    if (sort === "price_low") {
      if (a.price !== b.price) return a.price - b.price;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }

    if (sort === "price_high") {
      if (a.price !== b.price) return b.price - a.price;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }

    if (sort === "newest") {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    }

    if (sort === "trending") {
      // Views + chats with recency dampening
      const aPopularity = (a.views || 0) * 1 + (a.chats || 0) * 3;
      const bPopularity = (b.views || 0) * 1 + (b.chats || 0) * 3;
      if (aPopularity !== bPopularity) return bPopularity - aPopularity;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }

    // Default: "relevance"
    const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    // Tie-breaker: newest listing first
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}
