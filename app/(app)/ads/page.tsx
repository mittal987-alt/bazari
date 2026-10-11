"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { 
  FiSearch, FiMapPin, FiArrowUp, 
  FiChevronDown, FiInbox, FiFilter,
  FiX, FiZap, FiClock, FiTag, FiSliders,
  FiBell, FiCheck
} from "react-icons/fi";

type Ad = {
  _id: string;
  title: string;
  price: number;
  category?: string;
  location?: any;
  locationName: string;
  images: string[];
  relevanceScore?: number;
  matchReasons?: string[];
  reasons?: string[];
  status?: string;
};

interface SidebarInputProps {
  icon?: React.ReactElement;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isSmall?: boolean;
}

const POPULAR_SUGGESTIONS = [
  "Laptops under ₹50,000",
  "iPhones in good condition",
  "Used bikes",
  "Furniture for living room",
  "PlayStation 5",
];

const CATEGORIES = [
  "All",
  "Electronics",
  "Mobiles",
  "Vehicles",
  "Bikes",
  "Furniture",
  "Fashion",
  "Books",
];

function AdsPageContent() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("relevance");

  // Mobile filters drawer state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Recent searches (localStorage)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Saved Search state
  const [savingSearch, setSavingSearch] = useState(false);
  const [savedAlertMsg, setSavedAlertMsg] = useState<string | null>(null);

  // Load initial params from URL and recent searches from localStorage
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const catParam = sp.get("category");
      const searchParam = sp.get("search") || sp.get("q") || "";
      const cityParam = sp.get("city") || "";
      const minParam = sp.get("min") || "";
      const maxParam = sp.get("max") || "";
      const sortParam = sp.get("sort") || "relevance";
      const condParam = sp.get("condition") || "";

      if (searchParam) setSearch(searchParam);
      if (catParam) setCategory(catParam === "all" ? "" : catParam);
      if (cityParam) setCity(cityParam);
      if (minParam) setMin(minParam);
      if (maxParam) setMax(maxParam);
      if (sortParam) setSort(sortParam);
      if (condParam) setCondition(condParam);

      // Load recent searches
      const stored = localStorage.getItem("bazari_recent_searches");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 5));
        } catch {
          // ignore corrupted data
        }
      }
    } catch {
      // ignore SSR
    }
  }, []);

  // Update URL params when filters change
  const syncUrlParams = useCallback((newSearch: string, newCat: string, newCity: string, newMin: string, newMax: string, newSort: string, newCond: string) => {
    try {
      const sp = new URLSearchParams();
      if (newSearch.trim()) sp.set("search", newSearch.trim());
      if (newCat.trim() && newCat !== "All") sp.set("category", newCat.trim());
      if (newCity.trim()) sp.set("city", newCity.trim());
      if (newMin.trim()) sp.set("min", newMin.trim());
      if (newMax.trim()) sp.set("max", newMax.trim());
      if (newSort && newSort !== "relevance") sp.set("sort", newSort);
      if (newCond.trim()) sp.set("condition", newCond.trim());

      const newUrl = `${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
      window.history.replaceState({}, "", newUrl);
    } catch {
      // ignore
    }
  }, []);

  // Save query to recent searches
  const saveRecentSearch = useCallback((term: string) => {
    if (!term || term.trim().length < 2) return;
    const clean = term.trim();
    setRecentSearches((prev) => {
      const updated = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem("bazari_recent_searches", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const fetchAds = useCallback(async (pageNumber: number, reset = false) => {
    try {
      setLoading(true);
      setFetchError(null);

      const params: Record<string, string | number> = {
        page: pageNumber,
        limit: 12,
      };
      if (search.trim()) params.search = search.trim();
      if (category && category !== "All") params.category = category;
      if (city.trim()) params.city = city.trim();
      if (min.trim()) params.min = min.trim();
      if (max.trim()) params.max = max.trim();
      if (sort) params.sort = sort;
      if (condition.trim()) params.condition = condition.trim();

      const res = await api.get("/ads", { params });

      const newAds: Ad[] = res.data.ads || [];
      setTotalPages(res.data.totalPages || 1);

      if (reset) {
        setAds(newAds);
      } else {
        setAds((prev) => {
          const existingIds = new Set(prev.map((a) => a._id));
          const filteredNew = newAds.filter((a) => !existingIds.has(a._id));
          return [...prev, ...filteredNew];
        });
      }

      if (search.trim()) {
        saveRecentSearch(search.trim());
      }

      syncUrlParams(search, category, city, min, max, sort, condition);
    } catch (err: any) {
      console.error("[AdsPage] Fetch error:", err);
      setFetchError("Unable to load listings. Please check your connection or retry.");
    } finally {
      setLoading(false);
    }
  }, [search, category, city, min, max, sort, condition, saveRecentSearch, syncUrlParams]);

  useEffect(() => {
    fetchAds(1, true);
  }, [fetchAds]);

  useEffect(() => {
    if (page > 1) fetchAds(page);
  }, [page, fetchAds]);

  // Infinite Scroll Observer
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        !loading &&
        page < totalPages
      ) {
        setPage((prev) => prev + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, page, totalPages]);

  const applyFilters = () => {
    setPage(1);
    fetchAds(1, true);
    setMobileFiltersOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAllFilters = () => {
    setSearch("");
    setCategory("");
    setCity("");
    setMin("");
    setMax("");
    setCondition("");
    setSort("relevance");
    setPage(1);
    try {
      window.history.replaceState({}, "", window.location.pathname);
    } catch {}
    // Next render will trigger fetchAds due to dependency change
  };

  const handleSaveSearch = async () => {
    try {
      setSavingSearch(true);
      const res = await api.post("/saved-searches", {
        criteria: {
          query: search,
          category,
          minPrice: min,
          maxPrice: max,
          city,
          condition,
        },
      });

      if (res.data.isDuplicate) {
        setSavedAlertMsg("Already Saved");
      } else {
        setSavedAlertMsg("Alert Activated!");
      }

      setTimeout(() => setSavedAlertMsg(null), 3500);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        alert("Please log in to save search alerts.");
      } else if (err?.response?.status === 409) {
        setSavedAlertMsg("Already Saved");
        setTimeout(() => setSavedAlertMsg(null), 3500);
      } else {
        alert("Could not save alert. Please try again.");
      }
    } finally {
      setSavingSearch(false);
    }
  };

  const applySuggestion = (text: string) => {
    setSearch(text);
    setPage(1);
    // User can click search or wait for automatic refetch
  };

  const hasActiveFilters = Boolean(
    search.trim() || (category && category !== "All") || city.trim() || min.trim() || max.trim() || condition.trim() || (sort && sort !== "relevance")
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      
      {/* 🌌 AMBIENT TOP BAR */}
      <div className="bg-card/80 border-b border-border sticky top-0 z-30 py-4 px-4 md:px-8 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase">
              Marketplace<span className="text-primary">.</span>
            </h1>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted px-3 py-1 rounded-full border border-border whitespace-nowrap">
              {ads.length} Listings
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className="lg:hidden flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl text-xs font-bold border border-border transition-colors"
            >
              <FiSliders />
              <span>Filters {hasActiveFilters && "•"}</span>
            </button>
          </div>
        </div>

        {/* 💡 POPULAR SUGGESTIONS & PROMPTS BAR */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0">
            <FiZap className="text-primary" /> Popular:
          </span>
          {POPULAR_SUGGESTIONS.map((sugg, idx) => (
            <button
              key={idx}
              onClick={() => applySuggestion(sugg)}
              className="shrink-0 bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border/60 text-muted-foreground px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            >
              {sugg}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">

        {/* --- 🔎 PREMIUM SIDEBAR --- */}
        <aside className={`lg:col-span-3 ${mobileFiltersOpen ? "block" : "hidden lg:block"}`}>
          <div className="sticky top-28 space-y-6 bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-sm">
            
            <div className="flex items-center justify-between text-primary mb-2">
              <div className="flex items-center gap-2">
                <FiFilter />
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">Filter Engine</h2>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[10px] font-bold text-muted-foreground hover:text-destructive uppercase tracking-wider transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Keyword Search */}
              <SidebarInput 
                icon={<FiSearch />} 
                placeholder="Product, brand, or query..." 
                value={search} 
                onChange={setSearch} 
              />

              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Category</label>
                <div className="relative">
                  <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-muted border-none rounded-2xl px-5 py-3.5 text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat === "All" ? "" : cat}>
                        {cat === "All" ? "All Categories" : cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* City Filter */}
              <SidebarInput 
                icon={<FiMapPin />} 
                placeholder="All Cities / Locations" 
                value={city} 
                onChange={setCity} 
              />
              
              {/* Budget Range */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Budget Range (₹)</label>
                <div className="flex gap-2">
                  <SidebarInput placeholder="Min ₹" value={min} onChange={setMin} isSmall />
                  <SidebarInput placeholder="Max ₹" value={max} onChange={setMax} isSmall />
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Condition</label>
                <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-2xl">
                  {["", "used", "new"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCondition(c)}
                      className={`py-2 text-[10px] font-bold rounded-xl transition-all capitalize ${
                        condition === c 
                          ? "bg-card text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c || "Any"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Sort By</label>
                <div className="relative group">
                  <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select 
                    value={sort} 
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full bg-muted border-none rounded-2xl px-5 py-3.5 text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                  >
                    <option value="relevance">Best Match / Relevance</option>
                    <option value="newest">Recently Added</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="trending">Trending & Popular</option>
                  </select>
                </div>
              </div>

              <button
                onClick={applyFilters}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
              >
                Apply Filters
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  disabled={savingSearch}
                  className="w-full bg-muted/60 hover:bg-muted text-foreground border border-border/80 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {savedAlertMsg ? (
                    <>
                      <FiCheck className="text-emerald-500" size={13} />
                      <span className="text-emerald-500 font-bold">{savedAlertMsg}</span>
                    </>
                  ) : (
                    <>
                      <FiBell className="text-primary" size={13} />
                      <span>{savingSearch ? "Saving..." : "Save Search Alert"}</span>
                    </>
                  )}
                </button>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="pt-4 border-t border-border/60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-2">
                    <FiClock /> Recent Searches
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSearch(term);
                          setPage(1);
                        }}
                        className="text-[10px] bg-muted/80 hover:bg-muted text-foreground/80 px-2.5 py-1 rounded-lg border border-border/40 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* --- 🛒 LISTINGS GRID & ACTIVE FILTERS --- */}
        <main className="lg:col-span-9 space-y-6">

          {/* ACTIVE FILTER CHIPS */}
          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-2 bg-card/60 border border-border/80 p-3.5 rounded-2xl backdrop-blur-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mr-1">
                <FiTag className="text-primary" /> Active Filters:
              </span>

              {search.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
                  Keyword: &quot;{search}&quot;
                  <button onClick={() => setSearch("")} className="hover:text-destructive"><FiX size={12} /></button>
                </span>
              )}

              {category && category !== "All" && (
                <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
                  {category}
                  <button onClick={() => setCategory("")} className="hover:text-destructive"><FiX size={12} /></button>
                </span>
              )}

              {city.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
                  City: {city}
                  <button onClick={() => setCity("")} className="hover:text-destructive"><FiX size={12} /></button>
                </span>
              )}

              {min.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
                  Min: ₹{min}
                  <button onClick={() => setMin("")} className="hover:text-destructive"><FiX size={12} /></button>
                </span>
              )}

              {max.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
                  Max: ₹{max}
                  <button onClick={() => setMax("")} className="hover:text-destructive"><FiX size={12} /></button>
                </span>
              )}

              {condition.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium capitalize">
                  {condition}
                  <button onClick={() => setCondition("")} className="hover:text-destructive"><FiX size={12} /></button>
                </span>
              )}

              {sort && sort !== "relevance" && (
                <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
                  Sort: {sort}
                  <button onClick={() => setSort("relevance")} className="hover:text-destructive"><FiX size={12} /></button>
                </span>
              )}

              <button
                onClick={clearAllFilters}
                className="text-[10px] font-black uppercase tracking-wider text-destructive hover:underline ml-auto"
              >
                Clear All
              </button>
            </div>
          )}

          {/* ERROR STATE */}
          {fetchError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 text-center">
              <p className="text-destructive text-xs font-bold mb-2">{fetchError}</p>
              <button
                onClick={() => fetchAds(1, true)}
                className="bg-destructive text-destructive-foreground px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Retry Search
              </button>
            </div>
          )}

          {/* EMPTY STATE */}
          {ads.length === 0 && !loading && !fetchError ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col items-center justify-center py-24 bg-card/40 rounded-[2.5rem] border-2 border-dashed border-border text-center px-4"
            >
              <FiInbox className="text-muted-foreground/30 text-6xl mb-4" />
              <h3 className="font-black uppercase text-sm tracking-widest text-foreground mb-1">
                No matching listings found
              </h3>
              <p className="text-muted-foreground text-xs max-w-sm mb-6">
                We couldn&apos;t find any active listings matching your current search criteria. Try relaxing your filters or exploring top categories.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 transition-all"
                  >
                    Reset All Filters
                  </button>
                )}
                <button
                  onClick={() => {
                    setCategory("Electronics");
                    setPage(1);
                  }}
                  className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 rounded-xl font-bold text-xs"
                >
                  Browse Electronics
                </button>
                <button
                  onClick={() => {
                    setCategory("Mobiles");
                    setPage(1);
                  }}
                  className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 rounded-xl font-bold text-xs"
                >
                  Browse Mobiles
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              <AnimatePresence mode="popLayout">
                {ads.map((ad, idx) => {
                  const reasons = ad.matchReasons || ad.reasons || [];
                  return (
                    <motion.div 
                      key={ad._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (idx % 12) * 0.04 }}
                    >
                      <Link 
                        href={`/ads/${ad._id}`} 
                        className="group block bg-card rounded-[2.2rem] border border-border p-4 transition-all hover:shadow-2xl hover:-translate-y-1 hover:border-primary/40 h-full flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-[4/3] bg-muted rounded-[1.6rem] overflow-hidden mb-4 relative">
                            <Image 
                              fill 
                              src={ad.images?.[0] || "/placeholder.svg"} 
                              className="object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt={ad.title} 
                            />
                            {typeof ad.relevanceScore === "number" && ad.relevanceScore >= 80 && (
                              <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-md">
                                <FiZap size={10} /> Top Match
                              </div>
                            )}
                          </div>
                          
                          <div className="px-1 space-y-1">
                            <p className="text-2xl font-black text-primary tracking-tighter">
                              ₹{ad.price.toLocaleString("en-IN")}
                            </p>
                            <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors uppercase tracking-tight text-sm">
                              {ad.title}
                            </h3>

                            {/* Transparent Match Reasons if available */}
                            {reasons.length > 0 && (
                              <div className="pt-1">
                                <span className="inline-block text-[10px] font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-full">
                                  ✓ {reasons[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground pt-3 border-t border-border mt-3 px-1 text-[10px] font-black uppercase tracking-widest">
                          <div className="flex items-center gap-1 truncate max-w-[140px]">
                            <FiMapPin className="text-primary/70 shrink-0" size={11} />
                            <span className="truncate">{ad.locationName || "—"}</span>
                          </div>
                          {ad.category && (
                            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[90px]">
                              {ad.category}
                            </span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* SKELETON LOADING STATE */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-muted/60 animate-pulse rounded-[2.2rem] border border-border" />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 🚀 SCROLL TO TOP FAB */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-10 right-10 w-13 h-13 bg-card border border-border rounded-2xl shadow-2xl flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all active:scale-90 z-20"
        title="Scroll to top"
      >
        <FiArrowUp size={18} />
      </button>
    </div>
  );
}

/* --- 🧊 SIDEBAR INPUT HELPER --- */
function SidebarInput({ icon, placeholder, value, onChange, isSmall = false }: SidebarInputProps) {
  return (
    <div className="relative group">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          {icon}
        </div>
      )}
      <input 
        type="text" 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${icon ? "pl-11" : "px-4"} ${isSmall ? "py-2.5" : "py-3.5"} w-full bg-muted border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 focus:bg-background transition-all placeholder:text-muted-foreground/50 text-foreground`}
      />
    </div>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse text-muted-foreground">LOADING MARKETPLACE DISCOVERY...</div>}>
      <AdsPageContent />
    </Suspense>
  );
}