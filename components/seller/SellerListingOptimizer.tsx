"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiZap,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiCamera,
  FiFileText,
  FiEdit2,
  FiList,
  FiHelpCircle,
} from "react-icons/fi";

export interface SellerListingData {
  title: string;
  price: string | number;
  category: string;
  description: string;
  location?: string;
  yearsUsed?: string | number;
  images: string[];
  listingId?: string;
}

interface SellerListingOptimizerProps {
  listingData: SellerListingData;
  onApplyChanges: (changes: {
    title?: string;
    price?: string;
    description?: string;
  }) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SellerListingOptimizer({
  listingData,
  onApplyChanges,
  isOpen,
  onClose,
}: SellerListingOptimizerProps) {
  const [activeTab, setActiveTab] = useState<"description" | "price" | "quality" | "images">("description");

  // --- Description State ---
  const [descFacts, setDescFacts] = useState({
    brand: "",
    model: "",
    condition: "Good",
    yearsUsed: listingData.yearsUsed ? String(listingData.yearsUsed) : "",
    defects: "No known functional defects",
    accessories: "Standard accessories",
    specs: "",
  });
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [descResult, setDescResult] = useState<{
    titleSuggestion: string;
    description: string;
    highlights: string[];
    structuredSpecs: Record<string, string>;
    unspecifiedFields: string[];
    questionsForSeller: string[];
    provider: string;
  } | null>(null);
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDesc, setEditableDesc] = useState("");
  const [descApplied, setDescApplied] = useState(false);

  // --- Price Suggestion State ---
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceResult, setPriceResult] = useState<{
    suggestedMinPrice: number | null;
    suggestedMaxPrice: number | null;
    recommendedPrice: number | null;
    confidence: string;
    sampleSize: number;
    activeCount: number;
    soldCount: number;
    insufficientData: boolean;
    benchmarkUsed?: string;
    comparables: Array<{
      id: string;
      title: string;
      price: number;
      status: string;
      category: string;
      locationName: string;
    }>;
    methodologyNotes: string[];
    limitations: string[];
    explanation: string;
    provider: string;
  } | null>(null);
  const [selectedPriceToApply, setSelectedPriceToApply] = useState<number | null>(null);
  const [priceApplied, setPriceApplied] = useState(false);

  // --- Quality Audit State ---
  const [auditingQuality, setAuditingQuality] = useState(false);
  const [qualityResult, setQualityResult] = useState<{
    completenessScore: number;
    ratingTier: string;
    passedCount: number;
    totalChecks: number;
    checks: Array<{
      id: string;
      title: string;
      passed: boolean;
      impact: string;
      recommendation: string;
    }>;
    improvementSuggestions: string[];
    disclaimer: string;
  } | null>(null);

  // --- Image Presentation State ---
  const [imageTips, setImageTips] = useState<{
    imageCount: number;
    hasSufficientImages: boolean;
    presentationTips: string[];
    suggestedAngles: string[];
    disclaimer: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  // Sync initial facts when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescFacts((prev) => ({
        ...prev,
        yearsUsed: listingData.yearsUsed ? String(listingData.yearsUsed) : prev.yearsUsed,
      }));
      // Auto run quality check upon open so user immediately sees their checklist score
      handleAuditQuality();
    }
  }, [isOpen]);

  // --- 1. Generate Description Handler ---
  const handleGenerateDescription = async () => {
    if (!listingData.title) {
      setErrorMessage("Please enter a title in your listing first.");
      return;
    }
    setGeneratingDesc(true);
    setErrorMessage("");
    setDescApplied(false);

    try {
      const res = await fetch("/api/seller/assistant/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: listingData.title,
          category: listingData.category,
          brand: descFacts.brand,
          model: descFacts.model,
          condition: descFacts.condition,
          yearsUsed: descFacts.yearsUsed,
          defects: descFacts.defects,
          accessories: descFacts.accessories,
          specs: descFacts.specs,
          askingPrice: Number(listingData.price) || undefined,
          listingId: listingData.listingId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to generate description");
      }

      setDescResult(data);
      setEditableTitle(data.titleSuggestion || listingData.title);
      setEditableDesc(data.description || "");
    } catch (err: any) {
      setErrorMessage(err.message || "Error generating description");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleApplyDescription = () => {
    onApplyChanges({
      title: editableTitle || undefined,
      description: editableDesc || undefined,
    });
    setDescApplied(true);
  };

  // --- 2. Price Suggestion Handler ---
  const handleFetchPriceSuggestion = async () => {
    if (!listingData.title) {
      setErrorMessage("Please enter a title to check market pricing.");
      return;
    }
    setFetchingPrice(true);
    setErrorMessage("");
    setPriceApplied(false);

    try {
      const res = await fetch("/api/seller/assistant/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: listingData.title,
          category: listingData.category,
          brand: descFacts.brand,
          model: descFacts.model,
          condition: descFacts.condition,
          yearsUsed: descFacts.yearsUsed,
          askingPrice: Number(listingData.price) || undefined,
          listingId: listingData.listingId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to calculate price suggestion");
      }

      setPriceResult(data);
      if (data.recommendedPrice) {
        setSelectedPriceToApply(data.recommendedPrice);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error retrieving price suggestion");
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleApplyPrice = (priceVal: number) => {
    onApplyChanges({ price: String(priceVal) });
    setPriceApplied(true);
  };

  // --- 3. Quality Audit Handler ---
  const handleAuditQuality = async () => {
    setAuditingQuality(true);
    try {
      const res = await fetch("/api/seller/assistant/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: listingData.title,
          description: listingData.description,
          price: Number(listingData.price) || 0,
          category: listingData.category,
          images: listingData.images,
          condition: descFacts.condition,
          yearsUsed: descFacts.yearsUsed,
          defects: descFacts.defects,
          accessories: descFacts.accessories,
          specs: descFacts.specs,
          listingId: listingData.listingId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setQualityResult(data);
      }
    } catch {
      // Ignored non-blocking audit
    } finally {
      setAuditingQuality(false);
    }
  };

  // --- 4. Image Presentation Handler ---
  const handleFetchImageTips = async () => {
    try {
      const res = await fetch("/api/seller/assistant/image-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: listingData.images,
          productTitle: listingData.title,
          category: listingData.category,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setImageTips(data);
      }
    } catch {
      // Ignored non-blocking
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-card/60 backdrop-blur flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <FiZap size={20} className="fill-primary/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  AI Seller Assistant & Listing Optimizer
                </h2>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Phase 5
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Honest facts only • Comparable MongoDB data • Seller approval required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-muted/30 px-6 gap-2 shrink-0 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("description")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "description"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FiFileText size={14} /> Description Generator
          </button>
          <button
            onClick={() => {
              setActiveTab("price");
              if (!priceResult) handleFetchPriceSuggestion();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "price"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FiTrendingUp size={14} /> Market Price Suggestions
          </button>
          <button
            onClick={() => {
              setActiveTab("quality");
              handleAuditQuality();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "quality"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FiCheckCircle size={14} /> Listing Quality Audit
            {qualityResult && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-card/40">
                {qualityResult.completenessScore}%
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("images");
              if (!imageTips) handleFetchImageTips();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "images"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FiCamera size={14} /> Photo Presentation
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiAlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage("")} className="text-destructive font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DESCRIPTION GENERATOR */}
          {activeTab === "description" && (
            <div className="space-y-6">
              {/* Fact Input Grid */}
              <div className="bg-muted/30 border border-border p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FiList /> Step 1: Supply Actual Product Facts
                  </h3>
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-full">
                    Zero Hallucinations Guarantee
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apple, Sony, Dell"
                      value={descFacts.brand}
                      onChange={(e) => setDescFacts({ ...descFacts, brand: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Model / Sub-model
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. iPhone 13 Pro 128GB"
                      value={descFacts.model}
                      onChange={(e) => setDescFacts({ ...descFacts, model: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Condition
                    </label>
                    <select
                      value={descFacts.condition}
                      onChange={(e) => setDescFacts({ ...descFacts, condition: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/40 font-semibold text-foreground"
                    >
                      <option value="Brand New">Brand New (Sealed)</option>
                      <option value="Like New">Like New / Mint</option>
                      <option value="Good">Good (Normal wear)</option>
                      <option value="Fair">Fair (Noticeable cosmetic wear)</option>
                      <option value="For Parts">For Parts / Defective</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Years / Months Used
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1.5 years"
                      value={descFacts.yearsUsed}
                      onChange={(e) => setDescFacts({ ...descFacts, yearsUsed: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Included Accessories
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Original box, charger, bill"
                      value={descFacts.accessories}
                      onChange={(e) => setDescFacts({ ...descFacts, accessories: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                    Known Defects / Wear (Transparent disclosures build buyer trust)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Minor scratches on back glass, battery health 84%, screen flawless"
                    value={descFacts.defects}
                    onChange={(e) => setDescFacts({ ...descFacts, defects: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={generatingDesc}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {generatingDesc ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Generating From Facts...
                    </>
                  ) : (
                    <>
                      <FiZap /> Generate Structured Description
                    </>
                  )}
                </button>
              </div>

              {/* Generated Description & Approval Panel */}
              {descResult && (
                <div className="bg-card border-2 border-primary/30 p-5 rounded-2xl space-y-5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="text-sm font-black text-foreground">
                        Generated Suggestion (Ready for Review)
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Provider: {descResult.provider}
                    </span>
                  </div>

                  {/* Clarifying Questions / Missing Details alert */}
                  {descResult.unspecifiedFields && descResult.unspecifiedFields.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold">
                        <FiHelpCircle />
                        <span>Missing Information Marked as Unspecified:</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {descResult.unspecifiedFields.join(", ")}
                      </p>
                      {descResult.questionsForSeller.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] text-muted-foreground pt-1 space-y-0.5">
                          {descResult.questionsForSeller.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Highlights */}
                  {descResult.highlights && descResult.highlights.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1.5">
                        Key Highlights
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {descResult.highlights.map((h, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-foreground font-semibold"
                          >
                            ✓ {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title Suggestion */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Title Suggestion (You may edit before applying)
                    </label>
                    <input
                      type="text"
                      value={editableTitle}
                      onChange={(e) => setEditableTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-muted border border-border text-foreground"
                    />
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Listing Description (Editable preview)
                    </label>
                    <textarea
                      value={editableDesc}
                      onChange={(e) => setEditableDesc(e.target.value)}
                      className="w-full px-4 py-3 text-xs leading-relaxed font-mono rounded-xl bg-muted border border-border text-foreground min-h-[170px]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={generatingDesc}
                      className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg border border-border hover:bg-muted transition-all"
                    >
                      <FiRefreshCw size={13} /> Regenerate
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {descApplied ? (
                        <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                          <FiCheck /> Applied to listing form!
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleApplyDescription}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <FiCheck size={16} /> Apply to Listing Form
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRICE SUGGESTION ENGINE */}
          {activeTab === "price" && (
            <div className="space-y-6">
              <div className="bg-muted/30 border border-border p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    Market-Driven Price Valuation
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Analyzes live MongoDB active listings & verified completed sales in your category.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFetchPriceSuggestion}
                  disabled={fetchingPrice}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {fetchingPrice ? <FiRefreshCw className="animate-spin" /> : <FiTrendingUp />}
                  {fetchingPrice ? "Analyzing Market..." : "Refresh Valuation"}
                </button>
              </div>

              {priceResult && (
                <div className="space-y-5">
                  {/* Valuation Summary Card */}
                  {priceResult.insufficientData ? (
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <FiAlertCircle size={18} />
                        <span>Insufficient Comparable Market Data</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {priceResult.explanation}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-card border-2 border-primary/20 p-6 rounded-2xl shadow-sm space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                            Recommended Target
                          </span>
                          <span className="text-2xl font-black text-foreground">
                            ₹{(priceResult.recommendedPrice || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            Balanced for fair buyer conversion
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                            Realistic Asking Range
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            ₹{(priceResult.suggestedMinPrice || 0).toLocaleString()} – ₹
                            {(priceResult.suggestedMaxPrice || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            Market bounds for condition
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                            Sample Size & Confidence
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-foreground">
                              {priceResult.sampleSize} listings
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                priceResult.confidence === "high"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {priceResult.confidence}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            {priceResult.activeCount} active, {priceResult.soldCount} sold
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs text-foreground font-medium leading-relaxed">
                          {priceResult.explanation}
                        </p>
                      </div>

                      {/* Explicit Action: Apply Selected Price */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">Select:</span>
                          {priceResult.suggestedMinPrice && (
                            <button
                              type="button"
                              onClick={() => setSelectedPriceToApply(priceResult.suggestedMinPrice!)}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                                selectedPriceToApply === priceResult.suggestedMinPrice
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-foreground border-border"
                              }`}
                            >
                              Min: ₹{priceResult.suggestedMinPrice.toLocaleString()}
                            </button>
                          )}
                          {priceResult.recommendedPrice && (
                            <button
                              type="button"
                              onClick={() => setSelectedPriceToApply(priceResult.recommendedPrice!)}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                                selectedPriceToApply === priceResult.recommendedPrice
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-foreground border-border"
                              }`}
                            >
                              Target: ₹{priceResult.recommendedPrice.toLocaleString()}
                            </button>
                          )}
                          {priceResult.suggestedMaxPrice && (
                            <button
                              type="button"
                              onClick={() => setSelectedPriceToApply(priceResult.suggestedMaxPrice!)}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                                selectedPriceToApply === priceResult.suggestedMaxPrice
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-foreground border-border"
                              }`}
                            >
                              Max: ₹{priceResult.suggestedMaxPrice.toLocaleString()}
                            </button>
                          )}
                        </div>

                        {priceApplied ? (
                          <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                            <FiCheck /> Price applied to form!
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => selectedPriceToApply && handleApplyPrice(selectedPriceToApply)}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <FiCheck size={14} /> Apply ₹{(selectedPriceToApply || 0).toLocaleString()} to Form
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Comparables Table */}
                  {priceResult.comparables && priceResult.comparables.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Comparable Listings Used in Analysis ({priceResult.comparables.length})
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Sorted by relevance
                        </span>
                      </div>

                      <div className="divide-y divide-border/50 text-xs max-h-48 overflow-y-auto">
                        {priceResult.comparables.slice(0, 8).map((comp) => (
                          <div key={comp.id} className="py-2.5 flex items-center justify-between">
                            <div className="truncate pr-4">
                              <span className="font-bold text-foreground block truncate max-w-sm">
                                {comp.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {comp.category} • {comp.locationName}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-foreground block">
                                ₹{comp.price.toLocaleString()}
                              </span>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  comp.status === "sold"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-blue-500/10 text-blue-500"
                                }`}
                              >
                                {comp.status === "sold" ? "Sold Transaction" : "Active Asking"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Limitations & Disclaimers */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
                    <span className="font-bold text-foreground block">
                      Methodology Disclosures & Limitations:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {priceResult.limitations.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUALITY AUDIT */}
          {activeTab === "quality" && (
            <div className="space-y-6">
              <div className="bg-muted/30 border border-border p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    Listing Completeness & Quality Checklist
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deterministic 7-point audit based on your current listing content.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAuditQuality}
                  disabled={auditingQuality}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl border border-primary/20 transition-all flex items-center gap-1.5"
                >
                  <FiRefreshCw className={auditingQuality ? "animate-spin" : ""} /> Re-audit
                </button>
              </div>

              {qualityResult && (
                <div className="space-y-6">
                  {/* Score Banner */}
                  <div className="bg-card border-2 border-border p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="relative w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/30 flex flex-col items-center justify-center text-primary shadow-inner">
                        <span className="text-2xl font-black">
                          {qualityResult.completenessScore}%
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-bold">
                          Score
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-foreground">
                            {qualityResult.ratingTier}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            ({qualityResult.passedCount} of {qualityResult.totalChecks} checks passed)
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md">
                          High completeness listings answer buyer questions upfront and reduce chat friction.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">
                      Checklist Breakdown
                    </h4>

                    <div className="space-y-2.5">
                      {qualityResult.checks.map((chk) => (
                        <div
                          key={chk.id}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                            chk.passed
                              ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                              : "bg-muted/40 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {chk.passed ? (
                              <FiCheckCircle className="text-emerald-500" size={17} />
                            ) : (
                              <FiAlertCircle className="text-amber-500" size={17} />
                            )}
                          </div>
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">
                                {chk.title}
                              </span>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                  chk.passed
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-amber-500/10 text-amber-500"
                                }`}
                              >
                                {chk.passed ? "Passed" : "Action Needed"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              {chk.recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Improvement suggestions */}
                  {qualityResult.improvementSuggestions.length > 0 && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-2">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <FiEdit2 /> Actionable Suggestions to Reach 100%:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                        {qualityResult.improvementSuggestions.map((sug, i) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Honest Disclaimer */}
                  <p className="text-[10px] text-muted-foreground/70 italic px-2">
                    {qualityResult.disclaimer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IMAGE PRESENTATION */}
          {activeTab === "images" && (
            <div className="space-y-6">
              <div className="bg-muted/30 border border-border p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    Photo Coverage & Presentation
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tips based on current uploaded images ({listingData.images.length} photos attached).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFetchImageTips}
                  className="px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1.5"
                >
                  <FiRefreshCw /> Refresh Tips
                </button>
              </div>

              {imageTips && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                        <FiCamera className="text-primary" /> Recommended Angles for {listingData.category || "Your Item"}
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {imageTips.suggestedAngles.map((angle, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span>{angle}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                        <FiInfo className="text-primary" /> Presentation Tips
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {imageTips.presentationTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground/70 italic px-2">
                    {imageTips.disclaimer}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-card/60 backdrop-blur flex items-center justify-between shrink-0">
          <div className="text-[11px] text-muted-foreground">
            No automatic updates • Seller confirmation mandatory
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all"
          >
            Close Assistant
          </button>
        </div>
      </motion.div>
    </div>
  );
}
