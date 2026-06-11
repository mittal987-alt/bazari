"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiZap,
  FiArrowRight,
  FiLoader,
  FiTrendingUp,
  FiClock,
  FiX,
  FiTag,
  FiAward,
  FiCheckCircle,
  FiStar,
  FiBarChart2,
} from "react-icons/fi";
import { TbCurrencyRupee } from "react-icons/tb";
import Image from "next/image";
import Link from "next/link";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Recommendation = {
  name: string;
  price: number;
  reason: string;
  isMock?: boolean;
  ad?: {
    _id?: string;
    images?: string[];
    category?: string;
    condition?: string;
    yearsUsed?: number;
  };
};

type RecentSearch = {
  budget: string;
  query: string;
  label: string;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const CATEGORY_CHIPS = [
  { label: "📱 Phones",       q: "smartphone"   },
  { label: "💻 Laptops",      q: "laptop"        },
  { label: "🎮 Gaming",       q: "gaming"        },
  { label: "🚗 Cars",         q: "car"           },
  { label: "🏠 Furniture",    q: "furniture"     },
  { label: "👗 Fashion",      q: "fashion"       },
  { label: "📷 Cameras",      q: "camera"        },
  { label: "🏋️ Fitness",      q: "fitness"       },
];

const BUDGET_PRESETS = [5_000, 10_000, 25_000, 50_000, 1_00_000];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function valueScore(price: number, budget: number): { label: string; color: string; bg: string } {
  const ratio = price / budget;
  if (ratio <= 0.6)  return { label: "🔥 Hot Deal",    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  if (ratio <= 0.85) return { label: "✅ Great Value",  color: "text-blue-600",    bg: "bg-blue-50 border-blue-200"       };
  if (ratio <= 1.0)  return { label: "👍 Good Match",   color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200"   };
  return               { label: "⚠️ Over Budget",   color: "text-orange-600",  bg: "bg-orange-50 border-orange-200"   };
}

function savingsPct(price: number, budget: number) {
  if (price >= budget) return null;
  return Math.round(((budget - price) / budget) * 100);
}

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function BudgetShoppingPage() {
  const [mounted, setMounted]                 = useState(false);
  const [budget, setBudget]                   = useState("");
  const [query, setQuery]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError]                     = useState("");
  const [recentSearches, setRecentSearches]   = useState<RecentSearch[]>([]);
  const [hasSearched, setHasSearched]         = useState(false);
  const queryInputRef                         = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = JSON.parse(localStorage.getItem("bz_recent_budget") || "[]");
      setRecentSearches(stored);
    } catch {}
  }, []);

  // ── Search ──────────────────────────────────
  const handleSearch = async (overrideBudget?: string, overrideQuery?: string) => {
    const b = overrideBudget ?? budget;
    const q = overrideQuery  ?? query;
    if (!b) { setError("Please enter your budget"); return; }

    setError("");
    setLoading(true);
    setRecommendations([]);
    setHasSearched(true);

    // Save to recent
    const newEntry: RecentSearch = {
      budget: b,
      query: q,
      label: q ? `${q} under ${formatINR(Number(b))}` : `Deals under ${formatINR(Number(b))}`,
    };
    setRecentSearches(prev => {
      const updated = [newEntry, ...prev.filter(r => r.label !== newEntry.label)].slice(0, 5);
      localStorage.setItem("bz_recent_budget", JSON.stringify(updated));
      return updated;
    });

    try {
      const res = await fetch("/api/ai/budget-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: Number(b), query: q }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.recommendations || []);
        if (!data.recommendations?.length) setError("No matches found. Try a different budget or query.");
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Failed to connect to AI assistant.");
    } finally {
      setLoading(false);
    }
  };

  const applyChip = (q: string) => {
    setQuery(q);
    queryInputRef.current?.focus();
  };

  const applyRecent = (r: RecentSearch) => {
    setBudget(r.budget);
    setQuery(r.query);
    handleSearch(r.budget, r.query);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("bz_recent_budget");
  };

  // ── Stats ────────────────────────────────────
  const budgetNum  = Number(budget) || 0;
  const avgPrice   = recommendations.length
    ? Math.round(recommendations.reduce((s, r) => s + r.price, 0) / recommendations.length)
    : 0;
  const maxSaving  = recommendations.length
    ? Math.max(...recommendations.map(r => Math.max(0, budgetNum - r.price)))
    : 0;
  const withinBudget = recommendations.filter(r => r.price <= budgetNum).length;

  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F8FC] pb-32">
      {!mounted ? null : (
        <>
          {/* ══════════════════════════════════════
              HERO
          ══════════════════════════════════════ */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-16 md:py-24 text-white">
            {/* Background glows */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,#3b82f620_0%,transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,#6366f115_0%,transparent_60%)]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

            <div className="max-w-5xl mx-auto px-5 md:px-8 relative">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
                  <FiZap className="fill-current" /> Powered by Gemini 2.5 Flash
                </div>

                <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic mb-4 leading-tight">
                  Shop Smarter<span className="text-blue-500">.</span><br />
                  <span className="text-slate-400">AI Budget Assistant</span>
                </h1>
                <p className="text-slate-400 font-medium text-base md:text-lg leading-relaxed mb-10 max-w-2xl">
                  Set your budget, tell us what you want — our AI scans the entire marketplace and ranks the best deals by value, not just price.
                </p>

                {/* ── Search Row ────────────────────────── */}
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Budget */}
                  <div className="flex-1 relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                      <TbCurrencyRupee size={22} />
                    </div>
                    <input
                      type="number"
                      placeholder="Your budget (e.g. 15000)"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                      className="w-full pl-12 pr-5 py-4 md:py-5 rounded-2xl bg-white/8 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white/12 transition-all"
                    />
                  </div>

                  {/* Query */}
                  <div className="flex-1 relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                      <FiSearch size={20} />
                    </div>
                    <input
                      ref={queryInputRef}
                      type="text"
                      placeholder="What are you looking for?"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                      className="w-full pl-12 pr-5 py-4 md:py-5 rounded-2xl bg-white/8 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white/12 transition-all"
                    />
                  </div>

                  <button
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className="px-10 py-4 md:py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-bold shadow-lg shadow-blue-500/30 active:scale-95"
                  >
                    {loading ? <FiLoader className="animate-spin" /> : <FiZap />}
                    {loading ? "Analyzing…" : "Find Deals"}
                  </button>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 text-red-400 font-semibold flex items-center gap-2">
                    <FiX /> {error}
                  </motion.p>
                )}

                {/* ── Budget Presets ─────────────────────── */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest self-center mr-1">Quick Budget:</span>
                  {BUDGET_PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setBudget(String(p))}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        budget === String(p)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-white/10 text-slate-400 hover:border-blue-500 hover:text-white"
                      }`}
                    >
                      {formatINR(p)}
                    </button>
                  ))}
                </div>

                {/* ── Category Chips ─────────────────────── */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest self-center mr-1">Categories:</span>
                  {CATEGORY_CHIPS.map(chip => (
                    <button
                      key={chip.q}
                      onClick={() => applyChip(chip.q)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        query === chip.q
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-white/10 text-slate-400 hover:border-indigo-400 hover:text-white"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* ── Recent Searches ────────────────────── */}
                {recentSearches.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <FiClock className="text-slate-500" size={14} />
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Recent:</span>
                    {recentSearches.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => applyRecent(r)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all"
                      >
                        {r.label}
                      </button>
                    ))}
                    <button onClick={clearRecent} className="text-slate-600 hover:text-red-400 transition-colors ml-1" title="Clear history">
                      <FiX size={14} />
                    </button>
                  </div>
                )}

              </motion.div>
            </div>
          </div>

          {/* ══════════════════════════════════════
              STATS BAR  (only after search)
          ══════════════════════════════════════ */}
          <AnimatePresence>
            {hasSearched && !loading && recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white border-b border-slate-100 shadow-sm"
              >
                <div className="max-w-5xl mx-auto px-5 md:px-8 py-4 flex flex-wrap gap-6 md:gap-12 text-sm">
                  <Stat icon={<FiTag className="text-blue-500" />}      label="Results Found"   value={String(recommendations.length)} />
                  <Stat icon={<FiBarChart2 className="text-indigo-500" />} label="Avg Price"    value={formatINR(avgPrice)} />
                  <Stat icon={<FiTrendingUp className="text-emerald-500" />} label="Max Saving"  value={maxSaving > 0 ? formatINR(maxSaving) : "—"} />
                  <Stat icon={<FiCheckCircle className="text-green-500" />}  label="Within Budget" value={`${withinBudget} / ${recommendations.length}`} />
                  {budgetNum > 0 && avgPrice > 0 && (
                    <Stat icon={<FiAward className="text-amber-500" />} label="Budget Left (avg)" value={budgetNum > avgPrice ? formatINR(budgetNum - avgPrice) : "Over budget"} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════════════════════════════════
              RESULTS
          ══════════════════════════════════════ */}
          <div className="max-w-5xl mx-auto px-5 md:px-8 mt-10">

            {/* Loading Skeletons */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-3xl shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-slate-100" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-full w-full" />
                      <div className="h-3 bg-slate-100 rounded-full w-5/6" />
                      <div className="h-8 bg-slate-100 rounded-xl mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cards */}
            {!loading && recommendations.length > 0 && (
              <>
                <p className="text-slate-500 text-sm font-semibold mb-6">
                  AI found <span className="text-slate-800 font-bold">{recommendations.length} deals</span> matching your search
                  {budgetNum > 0 && <> within <span className="text-blue-600 font-bold">{formatINR(budgetNum)}</span></>}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {recommendations.map((rec, i) => {
                      const score    = valueScore(rec.price, budgetNum || rec.price);
                      const saving   = budgetNum ? savingsPct(rec.price, budgetNum) : null;
                      const leftover = budgetNum ? budgetNum - rec.price : 0;
                      const adId     = rec.ad?._id;

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col"
                        >
                          {/* Image */}
                          <div className="relative h-48 bg-slate-100">
                            {rec.ad?.images?.[0] ? (
                              <Image src={rec.ad.images[0]} fill className="object-cover group-hover:scale-105 transition-transform duration-500" alt={rec.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <TbCurrencyRupee size={48} />
                              </div>
                            )}

                            {/* Value Score Badge */}
                            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold border ${score.bg} ${score.color}`}>
                              {score.label}
                            </div>

                            {/* Savings Badge */}
                            {saving !== null && saving > 0 && (
                              <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">
                                {saving}% under budget
                              </div>
                            )}

                            {/* Rank */}
                            {i === 0 && (
                              <div className="absolute bottom-3 right-3 bg-amber-400 text-amber-900 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                                <FiStar className="fill-current" /> TOP PICK
                              </div>
                            )}
                          </div>

                          {/* Body */}
                          <div className="p-6 flex flex-col flex-1">
                            {/* Category + condition */}
                            <div className="flex items-center gap-2 mb-3">
                              {rec.ad?.category && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wide">
                                  {rec.ad.category}
                                </span>
                              )}
                              {rec.ad?.yearsUsed !== undefined && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wide">
                                  {rec.ad.yearsUsed === 0 ? "New" : `${rec.ad.yearsUsed}yr used`}
                                </span>
                              )}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 leading-snug mb-2 line-clamp-2">{rec.name}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 flex-1">{rec.reason}</p>

                            {/* Price row */}
                            <div className="mt-5 pt-4 border-t border-slate-100">
                              <div className="flex items-end justify-between mb-3">
                                <div>
                                  <p className="text-2xl font-black text-slate-900">{formatINR(rec.price)}</p>
                                  {leftover > 0 && budgetNum > 0 && (
                                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                                      {formatINR(leftover)} left from your budget
                                    </p>
                                  )}
                                  {leftover < 0 && budgetNum > 0 && (
                                    <p className="text-xs text-orange-500 font-semibold mt-0.5">
                                      {formatINR(Math.abs(leftover))} over budget
                                    </p>
                                  )}
                                </div>
                                {budgetNum > 0 && (
                                  <div className="text-right">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${rec.price <= budgetNum ? "bg-emerald-500" : "bg-orange-400"}`}
                                        style={{ width: `${Math.min(100, (rec.price / budgetNum) * 100)}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                      {Math.round((rec.price / budgetNum) * 100)}% of budget
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* CTA */}
                              <Link
                                href={adId ? `/ads/${adId}` : "/ads"}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                              >
                                View Deal <FiArrowRight />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Budget tip banner */}
                {budgetNum > 0 && withinBudget < recommendations.length && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-5 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-4"
                  >
                    <div className="text-orange-500 mt-0.5"><FiTrendingUp size={20} /></div>
                    <div>
                      <p className="font-bold text-orange-800 text-sm">Some results are slightly over your budget</p>
                      <p className="text-orange-700 text-xs mt-1">
                        {recommendations.length - withinBudget} item(s) exceed {formatINR(budgetNum)}. They are shown because AI rated them as relevant matches — you can negotiate the price directly with sellers.
                      </p>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* Empty / Idle State */}
            {!loading && recommendations.length === 0 && !hasSearched && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-20"
              >
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <TbCurrencyRupee size={48} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Find Your Best Deal</h2>
                <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                  Set a budget above, pick a category, and let our AI rank the best marketplace listings by value — not just price.
                </p>

                {/* How it works */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
                  {[
                    { icon: "💰", title: "Set Your Budget", desc: "Enter the max you want to spend. Use presets or type a custom amount." },
                    { icon: "🤖", title: "AI Scans the Market", desc: "Gemini 2.5 analyses every active listing and ranks by value score." },
                    { icon: "🏆", title: "Get Ranked Deals", desc: "See Hot Deals, savings %, budget leftover, and a direct link to each ad." },
                  ].map(step => (
                    <div key={step.title} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                      <div className="text-3xl mb-3">{step.icon}</div>
                      <h3 className="font-bold text-slate-800 mb-1">{step.title}</h3>
                      <p className="text-slate-500 text-sm">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* No results after search */}
            {!loading && recommendations.length === 0 && hasSearched && !error && (
              <div className="text-center mt-20">
                <p className="text-4xl mb-4">🔍</p>
                <h2 className="text-xl font-bold text-slate-700 mb-2">No deals found</h2>
                <p className="text-slate-400 text-sm">Try increasing your budget or using a broader search term.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-component: Stat
// ─────────────────────────────────────────────
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}