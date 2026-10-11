"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiFlag, FiX, FiAlertTriangle, FiCheckCircle, FiLoader } from "react-icons/fi";

const REASONS = [
  { value: "scam_or_fraud", label: "Scam or Fraud", description: "This listing appears to be a scam" },
  { value: "counterfeit_item", label: "Counterfeit Item", description: "Fake or replica product being sold as genuine" },
  { value: "prohibited_item", label: "Prohibited Item", description: "Item is not allowed to be sold on this platform" },
  { value: "offensive_content", label: "Offensive Content", description: "Contains hateful or inappropriate content" },
  { value: "spam_or_duplicate", label: "Spam or Duplicate", description: "Same listing posted multiple times" },
  { value: "misleading_description", label: "Misleading Description", description: "Photos or description are inaccurate" },
  { value: "wrong_category", label: "Wrong Category", description: "Listed in an incorrect category" },
  { value: "other", label: "Other", description: "Something else is wrong with this listing" },
] as const;

type ReasonValue = (typeof REASONS)[number]["value"];

interface ReportListingModalProps {
  listingId: string;
  listingTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type ModalState = "idle" | "submitting" | "success" | "error" | "already_reported";

export default function ReportListingModal({
  listingId,
  listingTitle,
  isOpen,
  onClose,
}: ReportListingModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReasonValue | "">("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<ModalState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReason) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          reason: selectedReason,
          details: details.trim(),
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setState("success");
      } else if (res.status === 401) {
        setState("error");
        setErrorMsg("You must be signed in to report a listing.");
      } else if (res.status === 400 && json.message?.includes("own listing")) {
        setState("error");
        setErrorMsg("You cannot report your own listing.");
      } else {
        setState("error");
        setErrorMsg(json.message || "Failed to submit report. Please try again.");
      }
    } catch {
      setState("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  }

  function handleClose() {
    setState("idle");
    setSelectedReason("");
    setDetails("");
    setErrorMsg("");
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 9000,
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9001,
              width: "min(520px, 95vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-card, #1a1a2e)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              padding: 0,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "20px 24px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              >
                <FiFlag size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary, #fff)",
                  }}
                >
                  Report Listing
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--text-secondary, #888)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {listingTitle}
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary, #888)",
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "20px 24px 24px" }}>
              {state === "success" ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <FiCheckCircle size={48} color="#22c55e" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary, #fff)" }}>
                    Report Submitted
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary, #888)", maxWidth: 320, lineHeight: 1.6 }}>
                    Thank you for helping keep Bazari safe. Our moderation team will review your report.
                  </p>
                  <button
                    onClick={handleClose}
                    style={{
                      marginTop: 12,
                      padding: "10px 24px",
                      borderRadius: 10,
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#22c55e",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: 13,
                      color: "var(--text-secondary, #888)",
                      lineHeight: 1.6,
                    }}
                  >
                    Help us understand what's wrong with this listing. Reports are confidential and reviewed by our trust team.
                  </p>

                  {/* Reason selection */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {REASONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedReason(r.value)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `1px solid ${
                            selectedReason === r.value
                              ? "rgba(239,68,68,0.5)"
                              : "rgba(255,255,255,0.06)"
                          }`,
                          background:
                            selectedReason === r.value
                              ? "rgba(239,68,68,0.08)"
                              : "rgba(255,255,255,0.02)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            border: `2px solid ${selectedReason === r.value ? "#ef4444" : "rgba(255,255,255,0.2)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selectedReason === r.value && (
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#ef4444",
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text-primary, #fff)",
                              lineHeight: 1.4,
                            }}
                          >
                            {r.label}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11,
                              color: "var(--text-secondary, #888)",
                              lineHeight: 1.4,
                            }}
                          >
                            {r.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Additional details */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-secondary, #888)",
                        marginBottom: 6,
                      }}
                    >
                      Additional details (optional)
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                      placeholder="Describe what seems wrong with this listing…"
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        color: "var(--text-primary, #fff)",
                        fontSize: 13,
                        resize: "vertical",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                        boxSizing: "border-box",
                      }}
                    />
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-secondary, #888)" }}>
                      {details.length}/500 characters
                    </p>
                  </div>

                  {/* Error */}
                  {state === "error" && errorMsg && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "#ef4444",
                        fontSize: 13,
                        marginBottom: 16,
                      }}
                    >
                      <FiAlertTriangle size={14} />
                      {errorMsg}
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary, #666)",
                      lineHeight: 1.5,
                      margin: "0 0 16px",
                    }}
                  >
                    Reports are reviewed by our trust team. False reports may result in action on your account. Submitting a report does not immediately remove a listing.
                  </p>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={handleClose}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "transparent",
                        color: "var(--text-secondary, #888)",
                        fontWeight: 500,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedReason || state === "submitting"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 22px",
                        borderRadius: 10,
                        border: "none",
                        background:
                          !selectedReason || state === "submitting"
                            ? "rgba(239,68,68,0.3)"
                            : "#ef4444",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: !selectedReason || state === "submitting" ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {state === "submitting" ? (
                        <>
                          <FiLoader size={14} className="animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <FiFlag size={14} />
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
