"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FiShield,
  FiFlag,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiChevronRight,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiSlash,
  FiInfo,
  FiUser,
  FiFilter,
} from "react-icons/fi";

type RiskLevel = "low" | "medium" | "high" | "critical";
type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned";

interface RiskSignal {
  key: string;
  label: string;
  points: number;
  detail: string;
}

interface ReportItem {
  _id: string;
  listingId: { _id: string; title: string; price: number; category: string; images: string[]; status: string } | null;
  reporterId: { _id: string; name: string; email: string } | null;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
  risk: {
    riskScore: number;
    riskLevel: RiskLevel;
    signals: RiskSignal[];
    moderatorSummary: string;
    buyerNote: string;
    reportCount: number;
  } | null;
}

const RISK_COLORS: Record<RiskLevel, { color: string; bg: string; border: string }> = {
  low: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  high: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
  critical: { color: "#dc2626", bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.3)" },
};

const REASON_LABELS: Record<string, string> = {
  scam_or_fraud: "Scam or Fraud",
  counterfeit_item: "Counterfeit Item",
  prohibited_item: "Prohibited Item",
  offensive_content: "Offensive Content",
  spam_or_duplicate: "Spam or Duplicate",
  misleading_description: "Misleading Description",
  wrong_category: "Wrong Category",
  other: "Other",
};

export default function AdminTrustPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, "idle" | "loading" | "done">>({});
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [actionListingOp, setActionListingOp] = useState<Record<string, string>>({});

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/trust?status=${statusFilter}&page=${page}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("[admin:trust] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleAction(
    reportId: string,
    action: "dismiss" | "review" | "action"
  ) {
    setActionState((prev) => ({ ...prev, [reportId]: "loading" }));

    try {
      const res = await fetch("/api/admin/trust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          action,
          adminNote: actionNotes[reportId] || "",
          listingAction: actionListingOp[reportId] || "none",
        }),
      });

      if (res.ok) {
        setActionState((prev) => ({ ...prev, [reportId]: "done" }));
        // Remove from current list after a short delay
        setTimeout(() => {
          setReports((prev) => prev.filter((r) => r._id !== reportId));
        }, 600);
      } else {
        setActionState((prev) => ({ ...prev, [reportId]: "idle" }));
      }
    } catch {
      setActionState((prev) => ({ ...prev, [reportId]: "idle" }));
    }
  }

  const getRiskIcon = (level: RiskLevel) => {
    const icons: Record<RiskLevel, React.ReactNode> = {
      low: <FiCheckCircle size={14} />,
      medium: <FiInfo size={14} />,
      high: <FiAlertTriangle size={14} />,
      critical: <FiAlertCircle size={14} />,
    };
    return icons[level];
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary, #0d0d1a)",
        padding: "32px 24px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8b5cf6",
              }}
            >
              <FiShield size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary, #fff)" }}>
                Trust & Safety
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #888)" }}>
                Moderation queue — {total} {statusFilter} report{total !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={fetchReports}
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
                color: "var(--text-secondary, #888)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <FiRefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: 0,
          }}
        >
          {(["pending", "reviewed", "dismissed", "actioned"] as ReportStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px 8px 0 0",
                border: "1px solid transparent",
                borderBottom: "none",
                background:
                  statusFilter === s
                    ? "rgba(139,92,246,0.1)"
                    : "transparent",
                borderColor:
                  statusFilter === s
                    ? "rgba(139,92,246,0.25)"
                    : "transparent",
                color:
                  statusFilter === s ? "#8b5cf6" : "var(--text-secondary, #888)",
                fontWeight: statusFilter === s ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                textTransform: "capitalize",
                letterSpacing: "0.01em",
                transition: "all 0.15s",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Report list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary, #888)", fontSize: 14 }}>
            Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "var(--text-secondary, #888)",
              fontSize: 14,
            }}
          >
            <FiShield size={40} style={{ opacity: 0.3, marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            No {statusFilter} reports
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reports.map((report) => {
              const isExpanded = expandedId === report._id;
              const risk = report.risk;
              const riskCfg = risk ? RISK_COLORS[risk.riskLevel] : null;
              const listing = report.listingId;
              const reporter = report.reporterId;
              const actState = actionState[report._id] || "idle";

              return (
                <motion.div
                  key={report._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: actState === "done" ? 0.4 : 1, y: 0 }}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "var(--bg-card, #1a1a2e)",
                    overflow: "hidden",
                  }}
                >
                  {/* Summary row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : report._id)}
                  >
                    {/* Risk badge */}
                    {riskCfg && risk && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: riskCfg.bg,
                          border: `1px solid ${riskCfg.border}`,
                          color: riskCfg.color,
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {getRiskIcon(risk.riskLevel)}
                        <span>{risk.riskScore}/100</span>
                      </div>
                    )}

                    {/* Listing info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary, #fff)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {listing?.title || "Deleted listing"}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #888)" }}>
                        {REASON_LABELS[report.reason] || report.reason}
                        {reporter && ` · by ${reporter.name || reporter.email}`}
                        {" · "}
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions (quick) */}
                    {statusFilter === "pending" && (
                      <div
                        style={{ display: "flex", gap: 6, flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleAction(report._id, "dismiss")}
                          disabled={actState === "loading"}
                          title="Dismiss report"
                          style={{
                            padding: "5px 10px",
                            borderRadius: 7,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "transparent",
                            color: "var(--text-secondary, #888)",
                            fontSize: 12,
                            cursor: actState === "loading" ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FiSlash size={12} />
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleAction(report._id, "review")}
                          disabled={actState === "loading"}
                          title="Mark as reviewed"
                          style={{
                            padding: "5px 10px",
                            borderRadius: 7,
                            border: "1px solid rgba(245,158,11,0.3)",
                            background: "rgba(245,158,11,0.08)",
                            color: "#f59e0b",
                            fontSize: 12,
                            cursor: actState === "loading" ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FiClock size={12} />
                          Review
                        </button>
                      </div>
                    )}

                    <FiChevronRight
                      size={14}
                      style={{
                        color: "var(--text-secondary, #888)",
                        flexShrink: 0,
                        transform: isExpanded ? "rotate(90deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          style={{
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                          }}
                        >
                          {/* Risk summary */}
                          {risk && riskCfg && (
                            <div
                              style={{
                                padding: "12px 14px",
                                borderRadius: 10,
                                background: riskCfg.bg,
                                border: `1px solid ${riskCfg.border}`,
                              }}
                            >
                              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: riskCfg.color }}>
                                AI Risk Assessment · {risk.riskLevel.toUpperCase()} ({risk.riskScore}/100)
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #aaa)", lineHeight: 1.6 }}>
                                {risk.moderatorSummary}
                              </p>
                              {risk.signals.length > 0 && (
                                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {risk.signals.map((sig) => (
                                    <span
                                      key={sig.key}
                                      style={{
                                        fontSize: 11,
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        background: "rgba(0,0,0,0.15)",
                                        color: riskCfg.color,
                                        border: `1px solid ${riskCfg.border}`,
                                      }}
                                    >
                                      {sig.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Report details */}
                          {report.details && (
                            <div>
                              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)" }}>
                                Reporter details:
                              </p>
                              <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary, #eee)", lineHeight: 1.6 }}>
                                {report.details}
                              </p>
                            </div>
                          )}

                          {/* Links */}
                          {listing && (
                            <div style={{ display: "flex", gap: 10 }}>
                              <Link
                                href={`/ads/${listing._id}`}
                                target="_blank"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  color: "var(--text-secondary, #888)",
                                  fontSize: 12,
                                  textDecoration: "none",
                                }}
                              >
                                <FiEye size={12} />
                                View Listing
                              </Link>
                            </div>
                          )}

                          {/* Admin action panel */}
                          {statusFilter === "pending" && (
                            <div
                              style={{
                                padding: "14px",
                                borderRadius: 10,
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--text-primary, #fff)" }}>
                                Moderator Action
                              </p>

                              {/* Admin note */}
                              <textarea
                                value={actionNotes[report._id] || ""}
                                onChange={(e) =>
                                  setActionNotes((prev) => ({ ...prev, [report._id]: e.target.value.slice(0, 500) }))
                                }
                                placeholder="Add an internal note (optional)…"
                                rows={2}
                                style={{
                                  width: "100%",
                                  padding: "8px 10px",
                                  borderRadius: 8,
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  background: "rgba(255,255,255,0.03)",
                                  color: "var(--text-primary, #fff)",
                                  fontSize: 12,
                                  resize: "vertical",
                                  fontFamily: "inherit",
                                  boxSizing: "border-box",
                                  marginBottom: 10,
                                }}
                              />

                              {/* Listing action */}
                              <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 12, color: "var(--text-secondary, #888)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                                  Listing status change (requires explicit choice):
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  {[
                                    { value: "none", label: "No change" },
                                    { value: "pending", label: "Set to Pending" },
                                    { value: "spam", label: "Mark as Spam" },
                                    { value: "active", label: "Clear to Active" },
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() =>
                                        setActionListingOp((prev) => ({ ...prev, [report._id]: opt.value }))
                                      }
                                      style={{
                                        padding: "5px 10px",
                                        borderRadius: 7,
                                        border: `1px solid ${
                                          actionListingOp[report._id] === opt.value
                                            ? "rgba(139,92,246,0.5)"
                                            : "rgba(255,255,255,0.06)"
                                        }`,
                                        background:
                                          actionListingOp[report._id] === opt.value
                                            ? "rgba(139,92,246,0.1)"
                                            : "transparent",
                                        color:
                                          actionListingOp[report._id] === opt.value
                                            ? "#8b5cf6"
                                            : "var(--text-secondary, #888)",
                                        fontSize: 11,
                                        cursor: "pointer",
                                        fontWeight: actionListingOp[report._id] === opt.value ? 600 : 400,
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Final action buttons */}
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => handleAction(report._id, "dismiss")}
                                  disabled={actState === "loading"}
                                  style={{
                                    flex: 1,
                                    padding: "9px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    background: "transparent",
                                    color: "var(--text-secondary, #888)",
                                    fontSize: 13,
                                    cursor: actState === "loading" ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                  }}
                                >
                                  <FiSlash size={13} />
                                  Dismiss
                                </button>
                                <button
                                  onClick={() => handleAction(report._id, "action")}
                                  disabled={actState === "loading"}
                                  style={{
                                    flex: 1,
                                    padding: "9px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(239,68,68,0.3)",
                                    background: "rgba(239,68,68,0.1)",
                                    color: "#ef4444",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: actState === "loading" ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                  }}
                                >
                                  <FiCheck size={13} />
                                  Take Action
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 24,
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
                color: page === 1 ? "rgba(255,255,255,0.2)" : "var(--text-primary, #fff)",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              Previous
            </button>
            <span style={{ padding: "8px 16px", fontSize: 13, color: "var(--text-secondary, #888)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
                color: page === totalPages ? "rgba(255,255,255,0.2)" : "var(--text-primary, #fff)",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
