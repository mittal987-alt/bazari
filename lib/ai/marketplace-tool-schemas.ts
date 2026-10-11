/**
 * Function Declaration schemas for the Bazari Marketplace Agent.
 *
 * Supports both:
 * 1. Mistral AI tool schemas (OpenAI-compatible standard JSON Schema)
 * 2. Gemini tool schemas (@google/genai v1.46.0 Tool { functionDeclarations } + Type enum)
 */

import type { FunctionDeclaration, Tool } from "@google/genai";
import { Type } from "@google/genai";

/* ─── TOOL A — search_products ─────────────────── */
const searchProductsDeclaration: FunctionDeclaration = {
  name: "search_products",
  description:
    "Search real Bazari marketplace listings. Use when the user asks to find, browse, or shop for products. " +
    "Supports keyword search, category filter, brand, price range, condition, city, and sorting.",
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
      brand: {
        type: Type.STRING,
        description: "Brand preference, e.g. 'Apple', 'Dell', 'Samsung', 'Sony'",
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
      sortBy: {
        type: Type.STRING,
        description: "Sort criteria: 'relevance', 'price_asc', 'price_desc', 'newest'",
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
    "Return a ranked list of listings matching user requirements using transparent multi-factor scoring. " +
    "Use when user asks 'what do you recommend?', 'best laptop for coding', or 'find alternatives'.",
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
      brand: {
        type: Type.STRING,
        description: "Preferred brand name",
      },
      minPrice: {
        type: Type.NUMBER,
        description: "Minimum budget in INR",
      },
      maxPrice: {
        type: Type.NUMBER,
        description: "Budget ceiling in INR",
      },
      condition: {
        type: Type.STRING,
        description: "Preferred condition, e.g. 'new', 'used', 'like new'",
      },
      city: {
        type: Type.STRING,
        description: "Preferred city or location",
      },
      referenceListingId: {
        type: Type.STRING,
        description: "Listing ID to find alternatives or compare against",
      },
      preferCheaper: {
        type: Type.BOOLEAN,
        description: "Set to true when user asks for cheaper alternatives",
      },
    },
    required: ["query"],
  },
};

/* ─── TOOL G — find_budget_alternatives ────────── */
const findBudgetAlternativesDeclaration: FunctionDeclaration = {
  name: "find_budget_alternatives",
  description:
    "Find listings in the same category priced lower than a reference listing. " +
    "Use when user asks 'show me cheaper ones' or 'cheaper alternatives to this listing'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      referenceListingId: {
        type: Type.STRING,
        description: "The 24-character hexadecimal MongoDB ObjectId of the reference listing",
      },
      maxBudget: {
        type: Type.NUMBER,
        description: "Optional hard price ceiling in INR",
      },
      limit: {
        type: Type.INTEGER,
        description: "Max results to return (default 5)",
      },
    },
    required: ["referenceListingId"],
  },
};

/* ─── TOOL H — find_similar_listings ────────────── */
const findSimilarListingsDeclaration: FunctionDeclaration = {
  name: "find_similar_listings",
  description:
    "Find listings similar to a reference listing in category, brand, and specifications. " +
    "Use when user asks 'find similar items' or 'more like this'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      referenceListingId: {
        type: Type.STRING,
        description: "The 24-character hexadecimal MongoDB ObjectId of the reference listing",
      },
      limit: {
        type: Type.INTEGER,
        description: "Max results to return (default 5)",
      },
    },
    required: ["referenceListingId"],
  },
};

/* ─── Exported Gemini tool list ────────────────── */
export const GEMINI_MARKETPLACE_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      searchProductsDeclaration,
      getProductDetailsDeclaration,
      compareProductsDeclaration,
      getSellerInformationDeclaration,
      estimatePriceFairnessDeclaration,
      getRecommendationsDeclaration,
      findBudgetAlternativesDeclaration,
      findSimilarListingsDeclaration,
    ],
  },
];

// Backward-compatible alias
export const MARKETPLACE_TOOLS = GEMINI_MARKETPLACE_TOOLS;

/* ─── Exported Mistral tool list (JSON Schema) ──── */
export interface MistralFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
      required: string[];
    };
  };
}

export const MISTRAL_MARKETPLACE_TOOLS: MistralFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search real Bazari marketplace listings. Use when the user asks to find, browse, or shop for products. " +
        "Supports keyword search, category filter, brand, price range, condition, city, and sorting.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Product keywords, e.g. 'gaming laptop', 'iPhone 14'",
          },
          category: {
            type: "string",
            description: "Product category, e.g. 'Electronics', 'Bikes', 'Furniture'",
          },
          brand: {
            type: "string",
            description: "Brand preference, e.g. 'Apple', 'Dell', 'Samsung', 'Sony'",
          },
          minPrice: {
            type: "number",
            description: "Minimum price in INR",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in INR",
          },
          condition: {
            type: "string",
            description: "Condition keyword e.g. 'new', 'used', 'like new'",
          },
          city: {
            type: "string",
            description: "City name to filter results",
          },
          sortBy: {
            type: "string",
            description: "Sort criteria: 'relevance', 'price_asc', 'price_desc', 'newest'",
          },
          limit: {
            type: "integer",
            description: "Max results to return (1-10, default 5)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Retrieve full details of a specific listing by its ID. " +
        "Use when the user asks about a particular listing.",
      parameters: {
        type: "object",
        properties: {
          listingId: {
            type: "string",
            description: "The MongoDB ObjectId of the listing (24-char hex string)",
          },
        },
        required: ["listingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_products",
      description:
        "Compare 2-5 specific listings side by side. " +
        "Use when user says 'compare these', 'which is better', or 'show me the differences'.",
      parameters: {
        type: "object",
        properties: {
          listingIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of 2-5 listing ObjectIds to compare",
          },
        },
        required: ["listingIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_seller_information",
      description:
        "Get public reputation info for a seller: name, rating, review count, account age. " +
        "Use when user asks about seller trustworthiness.",
      parameters: {
        type: "object",
        properties: {
          sellerId: {
            type: "string",
            description: "The MongoDB ObjectId of the seller (user) to look up",
          },
        },
        required: ["sellerId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_price_fairness",
      description:
        "Assess whether a listing price is fair vs similar active listings. " +
        "Use when user asks 'is this a good price?' or 'is it overpriced?'.",
      parameters: {
        type: "object",
        properties: {
          listingId: {
            type: "string",
            description: "The MongoDB ObjectId of the listing to evaluate",
          },
        },
        required: ["listingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recommendations",
      description:
        "Return a ranked list of listings matching user requirements using transparent multi-factor scoring. " +
        "Use when user asks 'what do you recommend?', 'best laptop for coding', or 'find alternatives'.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Description of what the user is looking for",
          },
          category: {
            type: "string",
            description: "Preferred product category",
          },
          brand: {
            type: "string",
            description: "Preferred brand name",
          },
          minPrice: {
            type: "number",
            description: "Minimum budget in INR",
          },
          maxPrice: {
            type: "number",
            description: "Budget ceiling in INR",
          },
          condition: {
            type: "string",
            description: "Preferred condition, e.g. 'new', 'used', 'like new'",
          },
          city: {
            type: "string",
            description: "Preferred city or location",
          },
          referenceListingId: {
            type: "string",
            description: "Listing ID to find alternatives or compare against",
          },
          preferCheaper: {
            type: "boolean",
            description: "Set to true when user asks for cheaper alternatives",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_budget_alternatives",
      description:
        "Find listings in the same category priced lower than a reference listing. " +
        "Use when user asks 'show me cheaper ones' or 'cheaper alternatives to this listing'.",
      parameters: {
        type: "object",
        properties: {
          referenceListingId: {
            type: "string",
            description: "The 24-character hexadecimal MongoDB ObjectId of the reference listing",
          },
          maxBudget: {
            type: "number",
            description: "Optional hard price ceiling in INR",
          },
          limit: {
            type: "integer",
            description: "Max results to return (default 5)",
          },
        },
        required: ["referenceListingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_similar_listings",
      description:
        "Find listings similar to a reference listing in category, brand, and specifications. " +
        "Use when user asks 'find similar items' or 'more like this'.",
      parameters: {
        type: "object",
        properties: {
          referenceListingId: {
            type: "string",
            description: "The 24-character hexadecimal MongoDB ObjectId of the reference listing",
          },
          limit: {
            type: "integer",
            description: "Max results to return (default 5)",
          },
        },
        required: ["referenceListingId"],
      },
    },
  },
];

export type MarketplaceToolName =
  | "search_products"
  | "get_product_details"
  | "compare_products"
  | "get_seller_information"
  | "estimate_price_fairness"
  | "get_recommendations"
  | "find_budget_alternatives"
  | "find_similar_listings";

export const VALID_TOOL_NAMES = new Set<string>([
  "search_products",
  "get_product_details",
  "compare_products",
  "get_seller_information",
  "estimate_price_fairness",
  "get_recommendations",
  "find_budget_alternatives",
  "find_similar_listings",
]);
