/**
 * Bazari Smart Alerts & Notification Service (Phase 8)
 *
 * Capabilities:
 * 1. Saved-search matching on new/active listings
 * 2. Real-time price-drop detection on wishlisted/saved items
 * 3. Legitimate seller notifications (inquiries, moderation status)
 * 4. Deduplication & atomic dispatch
 * 5. Socket.IO real-time emission with HTTP fallback
 * 6. Non-blocking error handling (notification dispatch never breaks listing operations)
 */

import { connectDB } from "@/lib/db";
import Notification, { type NotificationType } from "@/models/Notification";
import SavedSearch from "@/models/SavedSearch";
import {
  normalizeText,
  extractSearchTokens,
  parsePrice,
} from "@/lib/search/search-normalization";
import { io as ClientIO } from "socket.io-client";

export interface CreateNotificationParams {
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  adId?: string;
  savedSearchId?: string;
  metadata?: Record<string, any>;
  dedupKey?: string;
}

export interface SavedSearchCriteriaInput {
  query?: string;
  category?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  condition?: string;
  brand?: string;
  city?: string;
}

// Bounded internal Socket.IO client emitter for server-side dispatch
let socketClient: ReturnType<typeof ClientIO> | null = null;

function getSocketEmitter() {
  if (!socketClient && process.env.NEXT_PUBLIC_SOCKET_URL) {
    try {
      socketClient = ClientIO(process.env.NEXT_PUBLIC_SOCKET_URL, {
        autoConnect: true,
        transports: ["websocket", "polling"],
        reconnectionAttempts: 3,
        timeout: 2000,
      });
    } catch {
      // Sockets optional, fallback gracefully
      socketClient = null;
    }
  }
  return socketClient;
}

/**
 * Emits real-time notification to the user's personal socket room
 */
export function emitRealtimeNotification(recipientId: string, payload: any) {
  try {
    const emitter = getSocketEmitter();
    if (emitter && emitter.connected) {
      // server/socket.ts relays messages to personal room: recipientId
      emitter.emit("send_message", {
        recipientId,
        ...payload,
      });
    }
  } catch (err) {
    // Non-blocking socket failure
    console.warn("[notification:socket] Realtime emission skipped:", err);
  }
}

/**
 * Generates a deterministic criteria fingerprint to prevent duplicate saved searches
 */
export function generateCriteriaFingerprint(criteria: SavedSearchCriteriaInput): string {
  const normQuery = normalizeText(criteria.query || "");
  const normCat = normalizeText(criteria.category || "");
  const normCity = normalizeText(criteria.city || "");
  const normBrand = normalizeText(criteria.brand || "");
  const normCond = normalizeText(criteria.condition || "");
  const min = parsePrice(criteria.minPrice) ?? "";
  const max = parsePrice(criteria.maxPrice) ?? "";

  return [
    `q:${normQuery}`,
    `cat:${normCat}`,
    `min:${min}`,
    `max:${max}`,
    `cond:${normCond}`,
    `br:${normBrand}`,
    `city:${normCity}`,
  ].join("|");
}

/**
 * Creates and delivers a notification safely with deduplication
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<any> {
  try {
    await connectDB();

    // 1. Check deduplication key if provided
    if (params.dedupKey) {
      const existing = await Notification.findOne({
        recipient: params.recipient,
        dedupKey: params.dedupKey,
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Sanitize content
    const sanitizedTitle = params.title.trim().slice(0, 150);
    const sanitizedMessage = params.message.trim().slice(0, 500);
    const sanitizedLink = params.link?.trim().slice(0, 200) || "";

    const notification = await Notification.create({
      recipient: params.recipient,
      type: params.type,
      title: sanitizedTitle,
      message: sanitizedMessage,
      link: sanitizedLink,
      adId: params.adId || null,
      savedSearchId: params.savedSearchId || null,
      metadata: params.metadata || {},
      dedupKey: params.dedupKey,
      isRead: false,
    });

    // 3. Emit real-time notification via Socket.IO
    emitRealtimeNotification(params.recipient, {
      _id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      text: notification.message,
      message: notification.message,
      link: notification.link,
      adId: notification.adId?.toString(),
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (err) {
    console.error("[notification:create] Failed to create notification:", err);
    // Return null without throwing to prevent breaking listing/price operations
    return null;
  }
}

/**
 * Matches a new or updated active listing against all active saved searches
 */
export async function matchNewListingToSavedSearches(ad: any): Promise<number> {
  if (!ad || ad.status !== "active") return 0;

  try {
    await connectDB();

    const adId = ad._id ? ad._id.toString() : "";
    const adOwnerId = ad.user?._id ? ad.user._id.toString() : ad.user?.toString() || "";
    const adTitle = ad.title || "";
    const adDesc = ad.description || "";
    const adPrice = Number(ad.price) || 0;
    const adCategory = normalizeText(ad.category || "");
    const adLocation = normalizeText(ad.locationName || "");
    const fullAdText = `${normalizeText(adTitle)} ${normalizeText(adDesc)}`;

    // Query active saved searches (bounded query, max 200 searches at a time)
    const activeSearches = await SavedSearch.find({
      isActive: true,
      user: { $ne: adOwnerId }, // Never notify author of their own listing
    })
      .limit(200)
      .lean();

    let matchCount = 0;

    for (const search of activeSearches) {
      const c = search.criteria;

      // 1. Category check
      if (c.category && c.category.trim()) {
        const reqCat = normalizeText(c.category);
        if (reqCat !== "all" && reqCat !== adCategory) {
          continue;
        }
      }

      // 2. Price bounds check
      if (typeof c.minPrice === "number" && adPrice < c.minPrice) {
        continue;
      }
      if (typeof c.maxPrice === "number" && adPrice > c.maxPrice) {
        continue;
      }

      // 3. City / location check
      if (c.city && c.city.trim()) {
        const reqCity = normalizeText(c.city);
        if (!adLocation.includes(reqCity)) {
          continue;
        }
      }

      // 4. Condition check
      if (c.condition && c.condition.trim()) {
        const reqCond = normalizeText(c.condition);
        if (!fullAdText.includes(reqCond)) {
          continue;
        }
      }

      // 5. Brand check
      if (c.brand && c.brand.trim()) {
        const reqBrand = normalizeText(c.brand);
        if (!fullAdText.includes(reqBrand)) {
          continue;
        }
      }

      // 6. Keyword tokens check
      if (c.query && c.query.trim()) {
        const { tokens } = extractSearchTokens(c.query, 4);
        if (tokens.length > 0) {
          const matchesAnyToken = tokens.some((token) => fullAdText.includes(token));
          if (!matchesAnyToken) {
            continue;
          }
        }
      }

      // Match found! Dispatch alert with deduplication
      const dedupKey = `search_match:${search._id}:${adId}`;
      const recipientId = search.user.toString();

      await createNotification({
        recipient: recipientId,
        type: "saved_search_match",
        title: `New Match: ${adTitle}`,
        message: `A new listing matching your saved search "${search.name}" was posted for ₹${adPrice.toLocaleString("en-IN")}.`,
        link: `/ads/${adId}`,
        adId,
        savedSearchId: search._id.toString(),
        metadata: {
          searchName: search.name,
          listingPrice: adPrice,
          category: ad.category,
        },
        dedupKey,
      });

      // Update saved search stats
      await SavedSearch.updateOne(
        { _id: search._id },
        {
          $inc: { matchCount: 1 },
          $set: { lastNotifiedAt: new Date() },
        }
      );

      matchCount++;
    }

    return matchCount;
  } catch (err) {
    console.error("[notification:saved_search] Error matching listing to saved searches:", err);
    return 0;
  }
}

/**
 * Detects price decreases for saved listings and dispatches price-drop alerts
 */
export async function notifyPriceDrop(
  ad: any,
  previousPrice: number,
  newPrice: number
): Promise<number> {
  // Only trigger on genuine price decreases
  if (!ad || typeof previousPrice !== "number" || typeof newPrice !== "number") {
    return 0;
  }
  if (newPrice >= previousPrice || previousPrice <= 0) {
    return 0;
  }

  try {
    await connectDB();

    const adId = ad._id ? ad._id.toString() : "";
    const adTitle = ad.title || "Item";
    const savedBy = Array.isArray(ad.savedBy) ? ad.savedBy : [];

    if (savedBy.length === 0) {
      return 0;
    }

    const dropAmount = previousPrice - newPrice;
    const dropPercentage = Math.round((dropAmount / previousPrice) * 100);
    const sellerId = ad.user?._id ? ad.user._id.toString() : ad.user?.toString() || "";

    let alertCount = 0;

    for (const buyer of savedBy) {
      const buyerId = buyer?._id ? buyer._id.toString() : buyer.toString();

      // Never alert seller on their own item
      if (buyerId === sellerId) continue;

      const dedupKey = `price_drop:${adId}:${buyerId}:${newPrice}`;

      await createNotification({
        recipient: buyerId,
        type: "price_drop",
        title: `Price Drop: ${adTitle}`,
        message: `Price dropped by ${dropPercentage}% (₹${dropAmount.toLocaleString("en-IN")} off)! Now ₹${newPrice.toLocaleString("en-IN")} (was ₹${previousPrice.toLocaleString("en-IN")}).`,
        link: `/ads/${adId}`,
        adId,
        metadata: {
          previousPrice,
          newPrice,
          dropAmount,
          dropPercentage,
        },
        dedupKey,
      });

      alertCount++;
    }

    return alertCount;
  } catch (err) {
    console.error("[notification:price_drop] Error notifying price drop:", err);
    return 0;
  }
}

/**
 * Dispatches a seller alert when a buyer initiates a chat inquiry
 */
export async function notifySellerInquiry(
  sellerId: string,
  buyerName: string,
  adTitle: string,
  adId?: string,
  chatId?: string
): Promise<any> {
  if (!sellerId) return null;

  const dedupKey = `inquiry:${sellerId}:${chatId || adId || "direct"}`;

  return createNotification({
    recipient: sellerId,
    type: "buyer_inquiry",
    title: `New Buyer Inquiry: ${adTitle}`,
    message: `${buyerName || "A buyer"} asked about your listing "${adTitle}".`,
    link: chatId ? `/chats/${chatId}` : `/messages`,
    adId,
    metadata: { buyerName, adTitle, chatId },
    dedupKey,
  });
}

/**
 * Dispatches a seller alert when listing moderation status changes
 */
export async function notifyModerationStatus(
  sellerId: string,
  adTitle: string,
  status: "active" | "pending" | "spam",
  reason?: string,
  adId?: string
): Promise<any> {
  if (!sellerId) return null;

  let title = `Listing Update: ${adTitle}`;
  let message = `Your listing "${adTitle}" is now active and visible to buyers.`;

  if (status === "pending") {
    title = `Listing Under Review: ${adTitle}`;
    message = `Your listing "${adTitle}" is awaiting review. ${reason ? `Reason: ${reason}` : ""}`;
  } else if (status === "spam") {
    title = `Listing Flagged: ${adTitle}`;
    message = `Your listing "${adTitle}" was flagged. ${reason ? `Reason: ${reason}` : ""}`;
  }

  const dedupKey = `moderation:${adId || "listing"}:${sellerId}:${status}`;

  return createNotification({
    recipient: sellerId,
    type: "listing_moderation",
    title,
    message,
    link: adId ? `/ads/${adId}` : "/dashboard/seller",
    adId,
    metadata: { status, reason },
    dedupKey,
  });
}
