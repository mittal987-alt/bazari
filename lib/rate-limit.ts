/**
 * Bazari In-Memory Rate Limiter (Phase 10 — Security Hardening)
 *
 * A lightweight sliding-window rate limiter that works without any paid
 * external infrastructure (Redis, Upstash, etc.). It stores hit counts in
 * a module-level Map which is shared across all requests within the same
 * Node.js process instance.
 *
 * Limitations:
 *   - Not shared across multiple Node.js worker processes / replicas.
 *   - Resets on cold start / deploy.
 *   - Sufficient for single-instance deployments and development.
 *   - For multi-replica production, swap the backing store for Redis or
 *     Upstash without changing the API surface.
 *
 * Usage:
 *   const limiter = new RateLimiter({ windowMs: 60_000, max: 10 });
 *   const { limited, remaining, resetMs } = limiter.check(ip);
 *   if (limited) return NextResponse.json({ message: "Too many requests" }, { status: 429 });
 */

export interface RateLimitResult {
  /** True if the caller has exceeded the allowed request count */
  limited: boolean;
  /** Requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the current window resets */
  resetMs: number;
  /** Total requests allowed per window */
  max: number;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly store: Map<string, WindowEntry> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: { windowMs: number; max: number }) {
    this.windowMs = options.windowMs;
    this.max = options.max;

    // Periodically evict stale windows to prevent unbounded memory growth.
    // Use unref() so this timer does not prevent Node.js from exiting cleanly.
    this.cleanupTimer = setInterval(() => this.cleanup(), this.windowMs * 2);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Check and increment the hit count for a given key (typically an IP address).
   * Returns the rate-limit result immediately without throwing.
   */
  public check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      // Start a fresh window
      this.store.set(key, { count: 1, windowStart: now });
      return {
        limited: false,
        remaining: this.max - 1,
        resetMs: now + this.windowMs,
        max: this.max,
      };
    }

    entry.count += 1;
    const remaining = Math.max(0, this.max - entry.count);
    const resetMs = entry.windowStart + this.windowMs;

    return {
      limited: entry.count > this.max,
      remaining,
      resetMs,
      max: this.max,
    };
  }

  /**
   * Returns standard rate-limit response headers for a given result.
   */
  public static headers(result: RateLimitResult): Record<string, string> {
    return {
      "X-RateLimit-Limit": String(result.max),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(Math.floor(result.resetMs / 1000)),
      ...(result.limited
        ? { "Retry-After": String(Math.ceil((result.resetMs - Date.now()) / 1000)) }
        : {}),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.windowStart >= this.windowMs * 2) {
        this.store.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-built limiters for key Bazari endpoints
// ---------------------------------------------------------------------------

/** 10 requests per minute for authentication (login / register / password reset) */
export const authLimiter = new RateLimiter({ windowMs: 60_000, max: 10 });

/** 30 requests per minute for AI-powered routes (seller assistant, negotiations) */
export const aiLimiter = new RateLimiter({ windowMs: 60_000, max: 30 });

/** 20 uploads per minute to prevent Cloudinary quota abuse */
export const uploadLimiter = new RateLimiter({ windowMs: 60_000, max: 20 });

/** 60 requests per minute for general search/listing endpoints */
export const searchLimiter = new RateLimiter({ windowMs: 60_000, max: 60 });

/**
 * Extract the caller's IP from a Next.js Request object.
 * Respects common reverse-proxy headers (Vercel, Cloudflare, nginx).
 */
export function getClientIp(req: Request): string {
  const headers = req.headers as Headers;
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
