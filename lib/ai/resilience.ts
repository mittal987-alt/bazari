/**
 * AI Provider Resilience & Retry Engine
 *
 * Provides bounded retries with exponential backoff and jitter for transient errors:
 * - HTTP 429 (Rate limit / Resource exhausted)
 * - HTTP 500, 502, 503 (Unavailable / Capacity), 504
 * - Network failures / timeouts
 *
 * Respects Retry-After headers when available.
 * Immediately aborts without retrying on authentication/authorization errors (401, 403, missing key).
 * Strictly avoids logging secrets or credentials.
 */

export interface ExtractedErrorInfo {
  status?: number;
  isTransient: boolean;
  isRateLimit: boolean;
  isQuotaExhausted: boolean;
  isAuthError: boolean;
  isUnavailable: boolean;
  isTimeoutOrNetwork: boolean;
  retryAfterMs?: number;
  message: string;
}

/**
 * Inspect an error from Mistral, Gemini, or standard fetch/HTTP to classify its retryability.
 */
export function extractErrorInfo(err: unknown): ExtractedErrorInfo {
  let message = "";
  let status: number | undefined;
  let retryAfterMs: number | undefined;

  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "string") {
    message = err;
  } else if (err && typeof err === "object") {
    message = (err as { message?: string }).message || String(err);
  } else {
    message = String(err);
  }

  // Attempt to read status code from error object
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.status === "number") {
      status = e.status;
    } else if (typeof e.statusCode === "number") {
      status = e.statusCode;
    } else if (typeof (e.httpMeta as any)?.response?.status === "number") {
      status = (e.httpMeta as any).response.status;
    } else if (typeof (e.response as any)?.status === "number") {
      status = (e.response as any).status;
    }

    // Attempt to read Retry-After header
    const resp = (e.httpMeta as any)?.response || (e.response as any);
    if (resp?.headers) {
      try {
        const rawHeader =
          typeof resp.headers.get === "function"
            ? resp.headers.get("retry-after")
            : resp.headers["retry-after"] || resp.headers["Retry-After"];
        if (rawHeader) {
          const seconds = parseFloat(String(rawHeader));
          if (!isNaN(seconds) && seconds > 0) {
            retryAfterMs = Math.round(seconds * 1000);
          }
        }
      } catch {
        // Ignore header parse issues
      }
    }
  }

  // Fallback pattern matching on status code if not explicitly found
  if (!status) {
    if (/\b429\b|RESOURCE_EXHAUSTED|rate.?limit/i.test(message)) {
      status = 429;
    } else if (/\b503\b|UNAVAILABLE|no capacity/i.test(message)) {
      status = 503;
    } else if (/\b500\b|internal server error/i.test(message)) {
      status = 500;
    } else if (/\b502\b|bad gateway/i.test(message)) {
      status = 502;
    } else if (/\b504\b|gateway timeout/i.test(message)) {
      status = 504;
    } else if (/\b401\b|unauthorized|invalid.?api.?key|api_key_invalid/i.test(message)) {
      status = 401;
    } else if (/\b403\b|forbidden/i.test(message)) {
      status = 403;
    }
  }

  // Check Retry-After inside error message text if not in header (e.g. "try again in 2.5s")
  if (!retryAfterMs) {
    const match = message.match(/retry(?:ing)? after ([0-9]+(?:\.[0-9]+)?)\s*(s|sec|seconds|ms)/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) {
        retryAfterMs = match[2].toLowerCase() === "ms" ? Math.round(val) : Math.round(val * 1000);
      }
    }
  }

  const isAuthError =
    status === 401 ||
    status === 403 ||
    /invalid.?(?:api.?)?key|unauthorized|forbidden|credentials/i.test(message);

  const isRateLimit =
    status === 429 ||
    /RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(message);

  const isUnavailable =
    status === 503 ||
    status === 502 ||
    status === 504 ||
    /UNAVAILABLE|no capacity|overloaded|service unavailable/i.test(message);

  const isTimeoutOrNetwork =
    /ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|fetch failed|network|socket hang up|timeout|aborted/i.test(
      message
    );

  const isQuotaExhausted =
    /quota exceeded|check plan and billing|insufficient quota|credit limit|billing not enabled|usage limit/i.test(
      message
    );

  const isTransient =
    !isAuthError && !isQuotaExhausted && (isRateLimit || isUnavailable || status === 500 || isTimeoutOrNetwork);

  return {
    status,
    isTransient,
    isRateLimit,
    isQuotaExhausted,
    isAuthError,
    isUnavailable,
    isTimeoutOrNetwork,
    retryAfterMs,
    message,
  };
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitterMs?: number;
  providerName?: string;
  onRetry?: (attempt: number, delayMs: number, errorInfo: ExtractedErrorInfo) => void;
}

export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxRetries: 2,
  baseDelayMs: 600,
  maxDelayMs: 4000,
  backoffFactor: 2,
  jitterMs: 300,
  providerName: "AI Provider",
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an asynchronous operation with bounded exponential backoff and jitter.
 * Automatically respects Retry-After headers if reasonable (up to maxDelayMs).
 * Aborts immediately on non-transient errors (such as 401, 403, invalid arguments).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  customOptions?: RetryOptions
): Promise<T> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...customOptions };
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const errorInfo = extractErrorInfo(err);

      // Do NOT retry auth errors, quota exhaustion, exhausted retries, or non-transient errors
      if (
        errorInfo.isAuthError ||
        errorInfo.isQuotaExhausted ||
        !errorInfo.isTransient ||
        attempt > options.maxRetries
      ) {
        throw err;
      }

      // Calculate delay with exponential backoff and random jitter
      let delayMs =
        options.baseDelayMs * Math.pow(options.backoffFactor, attempt - 1) +
        Math.random() * options.jitterMs;

      // If server provided a Retry-After header, use it if within our tolerance limit
      if (errorInfo.retryAfterMs && errorInfo.retryAfterMs > 0) {
        if (errorInfo.retryAfterMs <= options.maxDelayMs) {
          delayMs = errorInfo.retryAfterMs;
        } else {
          // If server demands a very long wait (e.g. > maxDelayMs), don't freeze the user turn; throw so fallback activates immediately
          throw err;
        }
      }

      delayMs = Math.min(delayMs, options.maxDelayMs);

      if (options.onRetry) {
        options.onRetry(attempt, delayMs, errorInfo);
      } else {
        console.warn(
          `[${options.providerName}] Transient error (status: ${errorInfo.status || "unknown"}), retry ${attempt}/${options.maxRetries} after ${Math.round(delayMs)}ms: ${errorInfo.message.slice(0, 120)}`
        );
      }

      await sleep(delayMs);
    }
  }
}
