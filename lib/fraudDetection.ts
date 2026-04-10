/**
 * 🕵️‍♂️ Professional Fraud Detection Service
 * 
 * Uses a scoring-based system to detect potential scams and spam listings.
 * Thresholds:
 * - Score >= 5: Marked as "spam" (highly suspicious)
 * - Score >= 3: Marked as "pending" (manual review required)
 * - Score < 3: Marked as "active" (safe)
 */

interface FraudCheckResult {
  score: number;
  status: "active" | "pending" | "spam";
  reasons: string[];
}

const SCAM_KEYWORDS = [
    "whatsapp", "wire transfer", "bank transfer", "gift card", "advance payment",
    "refundable", "shipping included", "low price", "free shipping", "urgent",
    "contact me on", "paying first", "payment first", "no returns", "verified",
    "instant delivery", "escrow", "direct deposit", "zelle", "cashapp", "venmo"
];

const HIGH_VALUE_BRANDS = ["iphone", "macbook", "rolex", "playstation", "xbox", "canon", "sony"];

export function checkListingForFraud(ad: {
  title: string;
  description: string;
  price: number;
  category: string;
  images?: string[];
}): FraudCheckResult {
  let score = 0;
  const reasons: string[] = [];

  const fullText = (ad.title + " " + ad.description).toLowerCase();

  // 1. Keyword Analysis
  SCAM_KEYWORDS.forEach(word => {
    if (fullText.includes(word)) {
      score += 2;
      reasons.push(`Contains suspicious keyword: "${word}"`);
    }
  });

  // 2. Formatting & Pattern Detection
  if (ad.title === ad.title.toUpperCase() && ad.title.length > 5) {
    score += 1;
    reasons.push("Title is in ALL CAPS");
  }

  const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;
  if (phoneRegex.test(ad.description)) {
    score += 2;
    reasons.push("Description contains a phone number (potential off-platform bypass)");
  }

  // 3. Price Anomaly (Simplified)
  // If price is suspiciously low for high-value brands
  const isHighValue = HIGH_VALUE_BRANDS.some(brand => fullText.includes(brand));
  if (isHighValue && ad.price < 500 && ad.price > 0) {
    score += 3;
    reasons.push("Price is suspiciously low for a high-value item");
  }

  if (ad.price === 0) {
    score += 1;
    reasons.push("Item is listed as free");
  }

  // 4. Content Quality
  if (ad.description.length < 10) {
    score += 1;
    reasons.push("Description is too short");
  }

  if (!ad.images || ad.images.length === 0) {
    score += 2;
    reasons.push("No images provided");
  }

  // Final Status Determination
  let status: "active" | "pending" | "spam" = "active";
  if (score >= 5) status = "spam";
  else if (score >= 3) status = "pending";

  return { score, status, reasons };
}
