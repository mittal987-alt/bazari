/**
 * Bazari Standardized API Response & Error Handling (Phase 9)
 *
 * Provides:
 * - Safe, structured error envelopes with consistent HTTP status codes
 * - Request correlation ID propagation in headers and body
 * - Specific error classifications (validation, auth, rate limit, database, ai quota, upstream)
 * - Zero stack trace leakage to clients
 */

import { NextResponse } from "next/server";
import { logger, getCorrelationId } from "@/lib/observability/logger";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_QUOTA_EXHAUSTED"
  | "UPSTREAM_UNAVAILABLE"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    correlationId: string;
  };
}

export interface ApiSuccessBody<T> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

export function apiError(
  message: string,
  statusCode: number = 500,
  code: ApiErrorCode = "INTERNAL_ERROR",
  options?: {
    req?: Request;
    correlationId?: string;
    details?: unknown;
    headers?: Record<string, string>;
    internalError?: unknown;
  }
): NextResponse<ApiErrorBody> {
  const correlationId =
    options?.correlationId ||
    (options?.req ? getCorrelationId(options.req.headers) : getCorrelationId());

  // Log internal details safely on the server side
  if (options?.internalError || statusCode >= 500) {
    logger.error(`API Error [${statusCode}] ${code}: ${message}`, {
      correlationId,
      status: statusCode,
      code,
      error: options?.internalError instanceof Error ? options.internalError.message : options?.internalError,
    });
  } else {
    logger.warn(`API Client Error [${statusCode}] ${code}: ${message}`, {
      correlationId,
      status: statusCode,
      code,
    });
  }

  const responseHeaders = new Headers(options?.headers || {});
  responseHeaders.set("x-request-id", correlationId);

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details: options?.details,
        correlationId,
      },
    },
    {
      status: statusCode,
      headers: responseHeaders,
    }
  );
}

export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  statusCode: number = 200,
  options?: {
    req?: Request;
    correlationId?: string;
    headers?: Record<string, string>;
  }
): NextResponse<T> {
  const correlationId =
    options?.correlationId ||
    (options?.req ? getCorrelationId(options.req.headers) : getCorrelationId());

  const responseHeaders = new Headers(options?.headers || {});
  responseHeaders.set("x-request-id", correlationId);

  return NextResponse.json(data, {
    status: statusCode,
    headers: responseHeaders,
  });
}
