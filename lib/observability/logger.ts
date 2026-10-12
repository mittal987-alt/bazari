/**
 * Bazari Production Observability & Structured Logging
 *
 * Capabilities:
 * - Structured JSON logging for production and human-readable format for development
 * - Request correlation IDs (propagates x-request-id or generates unique correlation ID)
 * - Automatic redaction of sensitive credentials, tokens, JWTs, passwords, and private messages
 * - Timing helpers for measuring API route and database query durations
 * - Safe error serialization without leaking internal stack traces or database connection URIs
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  correlationId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  provider?: string;
  queryType?: string;
  userId?: string;
  [key: string]: unknown;
}

// Sensitive keys whose values must always be sanitized/redacted
const SENSITIVE_KEY_PATTERN = /^(password|token|jwt|secret|key|authorization|bearer|cookie|apiKey|api_key|client_secret|private|phone|cvv)$/i;

/**
 * Recursively redacts sensitive keys from log objects.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 5) return "[MaxDepthReached]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Redact JWT patterns (three base64 segments separated by dots)
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(data.trim())) {
      return "[REDACTED_JWT]";
    }
    // Redact Bearer tokens
    if (/^Bearer\s+.+/i.test(data.trim())) {
      return "Bearer [REDACTED]";
    }
    // Redact mongo URIs with passwords
    if (data.includes("mongodb://") || data.includes("mongodb+srv://")) {
      return data.replace(/\/\/[^:]+:[^@]+@/, "//[CREDENTIALS_REDACTED]@");
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = sanitizeLogData(val, depth + 1);
      }
    }
    return clean;
  }

  return data;
}

/**
 * Generate or normalize a correlation ID
 */
export function getCorrelationId(headers?: Headers | Record<string, string | null | undefined>): string {
  let id: string | null | undefined = null;
  if (headers) {
    if (typeof (headers as Headers).get === "function") {
      id = (headers as Headers).get("x-request-id") || (headers as Headers).get("x-correlation-id");
    } else {
      const h = headers as Record<string, string | null | undefined>;
      id = h["x-request-id"] || h["x-correlation-id"] || h["X-Request-Id"];
    }
  }

  if (id && typeof id === "string" && id.trim()) {
    return id.trim();
  }

  // Fallback: generate a lightweight correlation ID
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `req_${timestamp}_${randomPart}`;
}

export class Logger {
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
  }

  public child(context: LogContext): Logger {
    return new Logger({ ...this.defaultContext, ...context });
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    const mergedContext = sanitizeLogData({
      ...this.defaultContext,
      ...context,
    }) as LogContext;

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...mergedContext,
    };

    if (process.env.NODE_ENV === "production") {
      // Structured JSON format in production for log aggregators (e.g. Datadog, CloudWatch, GCP Logging)
      const line = JSON.stringify(payload);
      if (level === "error") {
        console.error(line);
      } else if (level === "warn") {
        console.warn(line);
      } else {
        console.log(line);
      }
    } else {
      // Human-readable format in development
      const prefix = `[${payload.timestamp}] [${level.toUpperCase()}]`;
      const meta = Object.keys(mergedContext).length > 0 ? ` ${JSON.stringify(mergedContext)}` : "";
      if (level === "error") {
        console.error(`${prefix} ${message}${meta}`);
      } else if (level === "warn") {
        console.warn(`${prefix} ${message}${meta}`);
      } else {
        console.log(`${prefix} ${message}${meta}`);
      }
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }

  /**
   * Helper to time an asynchronous operation and log its execution duration.
   */
  public async time<T>(
    operationName: string,
    fn: () => Promise<T>,
    extraContext?: LogContext
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round((performance.now() - start) * 10) / 10;
      this.info(`${operationName} completed`, {
        ...extraContext,
        durationMs,
      });
      return result;
    } catch (err: unknown) {
      const durationMs = Math.round((performance.now() - start) * 10) / 10;
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.error(`${operationName} failed`, {
        ...extraContext,
        durationMs,
        errorMessage,
      });
      throw err;
    }
  }
}

export const logger = new Logger({ service: "bazari-api" });
