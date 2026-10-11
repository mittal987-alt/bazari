"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiShield,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

export type RiskLevel = "low" | "medium" | "high" | "critical";

interface RiskSignal {
  key: string;
  label: string;
  points: number;
  detail: string;
}

interface TrustData {
  riskScore: number;
  riskLevel: RiskLevel;
  signals: RiskSignal[];
  buyerNote: string;
  reportCount: number;
  duplicateCount: number;
  aiEnhanced: boolean;
}

interface ListingTrustBadgeProps {
  listingId: string;
  /** If true, renders a compact inline badge only (no expandable panel) */
  compact?: boolean;
}

const LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  low: {
    label: "Trusted Listing",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
    icon: <FiCheckCircle size={15} />,
  },
  medium: {
    label: "Some Caution Advised",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    icon: <FiInfo size={15} />,
  },
  high: {
    label: "Under Review",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    icon: <FiAlertTriangle size={15} />,
  },
  critical: {
    label: "Use Extreme Caution",
    color: "#dc2626",
    bg: "rgba(220,38,38,0.1)",
    border: "rgba(220,38,38,0.35)",
    icon: <FiAlertCircle size={15} />,
  },
};

export default function ListingTrustBadge({ listingId, compact = false }: ListingTrustBadgeProps) {
  const [data, setData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/ads/${listingId}/risk?skipAI=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [listingId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.4, fontSize: 12 }}>
        <FiShield size={13} />
        <span>Checking trust…</span>
      </div>
    );
  }

  if (!data) return null;

  const cfg = LEVEL_CONFIG[data.riskLevel];

  if (compact) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          color: cfg.color,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          letterSpacing: "0.02em",
        }}
      >
        {cfg.icon}
        {cfg.label}
      </span>
    );
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        overflow: "hidden",
        fontSize: 13,
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: cfg.color,
          fontWeight: 600,
          fontSize: 13,
          textAlign: "left",
        }}
        aria-expanded={expanded}
      >
        {cfg.icon}
        <span style={{ flex: 1 }}>{cfg.label}</span>
        <span style={{ opacity: 0.6, fontSize: 11, fontWeight: 400, marginRight: 4 }}>
          Score {data.riskScore}/100
        </span>
        {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
      </button>

      {/* Buyer note (always visible) */}
      <div style={{ padding: "0 14px 10px", color: "var(--text-secondary, #888)", fontSize: 12, lineHeight: 1.5 }}>
        {data.buyerNote}
      </div>

      {/* Expandable signals */}
      <AnimatePresence>
        {expanded && data.signals.length > 0 && (
          <motion.div
            key="signals"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                borderTop: `1px solid ${cfg.border}`,
                padding: "10px 14px 12px",
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 12, color: cfg.color }}>
                Detected signals ({data.signals.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.signals.map((sig) => (
                  <div
                    key={sig.key}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.04)",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 28,
                        fontSize: 10,
                        fontWeight: 700,
                        color: cfg.color,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        borderRadius: 4,
                        padding: "1px 4px",
                        lineHeight: 1.6,
                        textAlign: "center",
                      }}
                    >
                      +{sig.points}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary, #eee)", lineHeight: 1.4 }}>
                        {sig.label}
                      </p>
                      <p style={{ margin: 0, color: "var(--text-secondary, #888)", lineHeight: 1.4 }}>
                        {sig.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {data.reportCount > 0 && (
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-secondary, #888)" }}>
                  {data.reportCount} user report{data.reportCount !== 1 ? "s" : ""} submitted for this listing.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
