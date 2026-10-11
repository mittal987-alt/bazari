/**
 * Search Normalization & Typo Tolerance Utilities
 * 
 * Safely normalizes text, escapes regex characters against ReDoS,
 * expands common marketplace typos & synonyms, and parses Indian currency formats.
 */

// Common typo corrections and synonym dictionary for marketplace discovery
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  // Mobile & Phones
  iphone: ["iphone", "iphones", "apple phone", "ios"],
  iphon: ["iphone"],
  iphne: ["iphone"],
  phone: ["phone", "mobile", "smartphone", "cellphone"],
  mobile: ["mobile", "phone", "smartphone"],
  samsung: ["samsung", "galaxy"],
  oneplus: ["oneplus", "1plus"],
  
  // Computers & Laptops
  laptop: ["laptop", "notebook", "lappy", "lap top"],
  laptops: ["laptop", "notebook"],
  lappy: ["laptop"],
  macbook: ["macbook", "mac book", "apple laptop"],
  mac: ["macbook", "imac", "mac"],
  desktop: ["desktop", "pc", "computer"],
  pc: ["pc", "computer", "desktop"],
  
  // Audio & Accessories
  headphone: ["headphone", "headphones", "earphone", "earphones", "headset"],
  headphones: ["headphones", "headphone", "earphones", "earphone", "headset"],
  earphone: ["earphone", "earphones", "earbuds", "airpods"],
  earphones: ["earphones", "earphone", "earbuds", "airpods"],
  earbuds: ["earbuds", "earbud", "airpods", "tws"],
  airpods: ["airpods", "airpod", "earbuds"],
  
  // Vehicles
  bike: ["bike", "motorcycle", "scooter", "two wheeler", "bicycle"],
  bicycle: ["bicycle", "cycle", "bike"],
  cycle: ["cycle", "bicycle", "bike"],
  car: ["car", "automobile", "vehicle", "four wheeler"],
  scooty: ["scooty", "scooter", "activa"],
  
  // Home & Electronics
  tv: ["tv", "television", "smart tv", "led tv"],
  television: ["television", "tv", "smart tv"],
  fridge: ["fridge", "refrigerator"],
  refrigerator: ["refrigerator", "fridge"],
  sofa: ["sofa", "couch"],
  couch: ["couch", "sofa"],
  table: ["table", "desk"],
  desk: ["desk", "table"],
  
  // Gaming
  playstation: ["playstation", "ps5", "ps4", "sony playstation"],
  ps5: ["ps5", "playstation 5", "playstation"],
  ps4: ["ps4", "playstation 4", "playstation"],
  xbox: ["xbox", "xbox series", "console"],
  console: ["console", "ps5", "xbox", "nintendo"],
};

// Known brands mapping
export const COMMON_BRANDS = [
  "apple", "samsung", "dell", "hp", "lenovo", "asus", "acer", "sony",
  "oneplus", "xiaomi", "redmi", "realme", "vivo", "oppo", "google",
  "lg", "whirlpool", "bosch", "nike", "adidas", "puma", "honda", "hero",
  "bajaj", "yamaha", "royal enfield", "maruti", "hyundai", "tata"
];

// Category heuristics from keywords
export const CATEGORY_KEYWORD_MAP: Record<string, string> = {
  laptop: "Electronics",
  laptops: "Electronics",
  phone: "Mobiles",
  phones: "Mobiles",
  mobile: "Mobiles",
  mobiles: "Mobiles",
  iphone: "Mobiles",
  iphones: "Mobiles",
  macbook: "Electronics",
  ipad: "Electronics",
  tablet: "Electronics",
  tablets: "Electronics",
  headphone: "Electronics",
  headphones: "Electronics",
  tv: "Electronics",
  camera: "Electronics",
  monitor: "Electronics",
  bike: "Bikes",
  bikes: "Bikes",
  bicycle: "Bikes",
  bicycles: "Bikes",
  cycle: "Bikes",
  cycles: "Bikes",
  motorcycle: "Bikes",
  motorcycles: "Bikes",
  car: "Vehicles",
  cars: "Vehicles",
  sofa: "Furniture",
  sofas: "Furniture",
  chair: "Furniture",
  chairs: "Furniture",
  table: "Furniture",
  tables: "Furniture",
  bed: "Furniture",
  beds: "Furniture",
  wardrobe: "Furniture",
  shirt: "Fashion",
  shirts: "Fashion",
  shoes: "Fashion",
  watch: "Fashion",
  watches: "Fashion",
  book: "Books",
  books: "Books",
  textbook: "Books",
};

/**
 * Escapes regex special characters to prevent regex injection and ReDoS
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Safely normalizes text input: trims whitespace, collapses multiple spaces,
 * converts to lowercase, and strips harmful control characters.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, "") // remove control chars
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Extracts and expands search tokens with typo tolerance and synonyms.
 * Token count is strictly bounded to prevent query explosion.
 */
export function extractSearchTokens(rawQuery: string, maxTokens = 6): {
  normalizedQuery: string;
  tokens: string[];
  expandedTerms: string[];
} {
  const normalized = normalizeText(rawQuery);
  if (!normalized) {
    return { normalizedQuery: "", tokens: [], expandedTerms: [] };
  }

  // Split into tokens, ignoring single characters and short noise words
  const stopWords = new Set(["a", "an", "the", "in", "on", "at", "for", "with", "and", "or", "to", "of", "is", "under", "below"]);
  const rawTokens = normalized
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/gi, ""))
    .filter((t) => t.length > 1 && !stopWords.has(t))
    .slice(0, maxTokens);

  const expandedSet = new Set<string>();

  for (const token of rawTokens) {
    expandedSet.add(token);

    // Check synonym / typo map
    if (SEARCH_SYNONYMS[token]) {
      for (const syn of SEARCH_SYNONYMS[token]) {
        expandedSet.add(syn);
      }
    }

    // Substring / partial typo check if token is close (e.g. "iphne" -> "iphone")
    for (const [key, syns] of Object.entries(SEARCH_SYNONYMS)) {
      if (token.length >= 4 && (key.startsWith(token) || token.startsWith(key))) {
        syns.forEach((s) => expandedSet.add(s));
      }
    }
  }

  return {
    normalizedQuery: normalized,
    tokens: rawTokens,
    expandedTerms: Array.from(expandedSet).slice(0, 15), // strictly bounded
  };
}

/**
 * Parses numeric price string (supports ₹, rs, inr, commas, 50k, 1.5 lakh)
 */
export function parsePrice(val: unknown): number | undefined {
  if (typeof val === "number") {
    return isNaN(val) || val < 0 ? undefined : Math.round(val);
  }
  if (typeof val !== "string") return undefined;

  const clean = val.trim().toLowerCase().replace(/,/g, "").replace(/[₹\s]|rs\.?|inr/gi, "");
  if (!clean) return undefined;

  if (clean.endsWith("k")) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) || num < 0 ? undefined : Math.round(num * 1000);
  }

  if (clean.includes("lakh")) {
    const num = parseFloat(clean.replace(/lakhs?/, "").trim());
    return isNaN(num) || num < 0 ? undefined : Math.round(num * 100000);
  }

  const num = parseFloat(clean);
  return isNaN(num) || num < 0 ? undefined : Math.round(num);
}

/**
 * Extracts condition keyword from text ("used", "new", "refurbished", "mint", "like new")
 */
export function extractCondition(text: string): "new" | "used" | "refurbished" | undefined {
  const norm = normalizeText(text);
  if (/\b(refurbished|renewed)\b/.test(norm)) return "refurbished";
  if (/\b(brand new|unopened|sealed|new)\b/.test(norm)) return "new";
  if (/\b(used|second hand|pre-owned|preowned|good condition|mint)\b/.test(norm)) return "used";
  return undefined;
}

/**
 * Extracts recognized brand from text
 */
export function extractBrand(text: string): string | undefined {
  const norm = normalizeText(text);
  for (const brand of COMMON_BRANDS) {
    const regex = new RegExp(`\\b${escapeRegex(brand)}\\b`, "i");
    if (regex.test(norm)) {
      // Capitalize brand properly
      return brand.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }
  return undefined;
}

/**
 * Infers category from query text if not explicitly provided
 */
export function inferCategory(text: string): string | undefined {
  const norm = normalizeText(text);
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORD_MAP)) {
    const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
    if (regex.test(norm)) {
      return cat;
    }
  }
  return undefined;
}
