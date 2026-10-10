/**
 * Gemini Function Declaration schemas for the Bazari Marketplace Agent.
 * Compatible with @google/genai v1.46.0 — uses Tool { functionDeclarations } + Type enum.
 */

import type { FunctionDeclaration, Tool } from "@google/genai";
import { Type } from "@google/genai";

/* ─── TOOL A — search_products ─────────────────── */
const searchProductsDeclaration: FunctionDeclaration = {
  name: "search_products",
  description:
    "Search real Bazari marketplace listings. Use when the user asks to find, browse, or shop for products. " +
    "Supports keyword search, category filter, price range, condition, and city.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Product keywords, e.g. 'gaming laptop', 'iPhone 14'",
      },
      category: {
        type: Type.STRING,
        description: "Product category, e.g. 'Electronics', 'Bikes', 'Furniture'",
      },
      minPrice: {
        type: Type.NUMBER,
        description: "Minimum price in INR",
      },
      maxPrice: {
        type: Type.NUMBER,
        description: "Maximum price in INR",
      },
      condition: {
        type: Type.STRING,
        description: "Condition keyword e.g. 'new', 'used', 'like new'",
      },
      city: {
        type: Type.STRING,
        description: "City name to filter results",
      },
      limit: {
        type: Type.INTEGER,
        description: "Max results to return (1-10, default 5)",
      },
    },
    required: [],
  },
};

/* ─── TOOL B — get_product_details ─────────────── */
const getProductDetailsDeclaration: FunctionDeclaration = {
  name: "get_product_details",
  description:
    "Retrieve full details of a specific listing by its ID. " +
    "Use when the user asks about a particular listing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      listingId: {
        type: Type.STRING,
        description: "The MongoDB ObjectId of the listing (24-char hex string)",
      },
    },
    required: ["listingId"],
  },
};

/* ─── TOOL C — compare_products ────────────────── */
const compareProductsDeclaration: FunctionDeclaration = {
  name: "compare_products",
  description:
    "Compare 2-5 specific listings side by side. " +
    "Use when user says 'compare these', 'which is better', or 'show me the differences'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      listingIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Array of 2-5 listing ObjectIds to compare",
      },
    },
    required: ["listingIds"],
  },
};

/* ─── TOOL D — get_seller_information ──────────── */
const getSellerInformationDeclaration: FunctionDeclaration = {
  name: "get_seller_information",
  description:
    "Get public reputation info for a seller: name, rating, review count, account age. " +
    "Use when user asks about seller trustworthiness.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sellerId: {
        type: Type.STRING,
        description: "The MongoDB ObjectId of the seller (user) to look up",
      },
    },
    required: ["sellerId"],
  },
};

/* ─── TOOL E — estimate_price_fairness ─────────── */
const estimatePriceFairnessDeclaration: FunctionDeclaration = {
  name: "estimate_price_fairness",
  description:
    "Assess whether a listing price is fair vs similar active listings. " +
    "Use when user asks 'is this a good price?' or 'is it overpriced?'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      listingId: {
        type: Type.STRING,
        description: "The MongoDB ObjectId of the listing to evaluate",
      },
    },
    required: ["listingId"],
  },
};

/* ─── TOOL F — get_recommendations ─────────────── */
const getRecommendationsDeclaration: FunctionDeclaration = {
  name: "get_recommendations",
  description:
    "Return a ranked list of listings matching the user requirements. " +
    "Use when user asks 'what do you recommend?' or 'what is the best deal?'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Description of what the user is looking for",
      },
      category: {
        type: Type.STRING,
        description: "Preferred product category",
      },
      maxPrice: {
        type: Type.NUMBER,
        description: "Budget ceiling in INR",
      },
      city: {
        type: Type.STRING,
        description: "Preferred city or location",
      },
    },
    required: ["query"],
  },
};

/* ─── Exported tool list ────────────────────────── */
export const MARKETPLACE_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      searchProductsDeclaration,
      getProductDetailsDeclaration,
      compareProductsDeclaration,
      getSellerInformationDeclaration,
      estimatePriceFairnessDeclaration,
      getRecommendationsDeclaration,
    ],
  },
];

export type MarketplaceToolName =
  | "search_products"
  | "get_product_details"
  | "compare_products"
  | "get_seller_information"
  | "estimate_price_fairness"
  | "get_recommendations";

export const VALID_TOOL_NAMES = new Set<string>([
  "search_products",
  "get_product_details",
  "compare_products",
  "get_seller_information",
  "estimate_price_fairness",
  "get_recommendations",
]);
