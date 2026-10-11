/**
 * Seller Assistant Security & Validation Utilities
 *
 * Enforces:
 * - Authenticated seller session
 * - Server-side listing ownership verification
 * - Rate limiting (sliding window per user ID / IP)
 * - Input sanitization & boundary validation
 * - Prevention of arbitrary database queries or code execution
 */

import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";
import mongoose from "mongoose";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30; // 30 requests per minute
const sellerRequestHistory = new Map<string, number[]>();

export function checkSellerRateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): boolean {
  const now = Date.now();
  const timestamps = sellerRequestHistory.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    sellerRequestHistory.set(key, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  sellerRequestHistory.set(key, validTimestamps);
  return true;
}

/**
 * Verifies that a listing belongs to the authenticated user.
 */
export async function verifyListingOwnership(
  listingId: string,
  userId: string
): Promise<{ authorized: boolean; ad?: any; error?: string; status?: number }> {
  if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
    return { authorized: false, error: "Invalid listing ID format", status: 400 };
  }

  await connectDB();

  const ad = await Ad.findById(new mongoose.Types.ObjectId(listingId));
  if (!ad) {
    return { authorized: false, error: "Listing not found", status: 404 };
  }

  const ownerId = String(ad.user?._id ?? ad.user ?? "");
  if (ownerId !== String(userId)) {
    return {
      authorized: false,
      error: "Forbidden: You do not own this listing",
      status: 403,
    };
  }

  return { authorized: true, ad };
}

/**
 * Sanitizes untrusted user strings, removing executable HTML tags and control characters.
 */
export function sanitizeInputString(val: unknown, maxLen = 1000): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/<[^>]*>?/gm, "") // strip html tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "") // strip control characters
    .trim()
    .slice(0, maxLen);
}
