import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB, isDbConnected } from "@/lib/db";
import { logger, getCorrelationId } from "@/lib/observability/logger";

export const runtime = "nodejs";

const startTime = Date.now();

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req.headers);
  const startPing = performance.now();
  let dbStatus: "connected" | "disconnected" | "connecting" | "error" = "disconnected";
  let dbLatencyMs: number | null = null;

  try {
    if (mongoose.connection.readyState === 1) {
      dbStatus = "connected";
    } else {
      await connectDB();
      dbStatus = isDbConnected() ? "connected" : "connecting";
    }

    if (dbStatus === "connected" && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      dbLatencyMs = Math.round((performance.now() - startPing) * 10) / 10;
    }
  } catch (err: unknown) {
    dbStatus = "error";
    logger.error("Health check database ping failed", {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const isHealthy = dbStatus === "connected";
  const memory = process.memoryUsage();

  const responsePayload = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      api: {
        status: "operational",
      },
    },
    system: {
      memoryUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      nodeEnv: process.env.NODE_ENV || "development",
    },
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "x-request-id": correlationId,
    },
  });
}
