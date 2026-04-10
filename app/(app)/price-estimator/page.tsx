"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search, Info, TrendingDown, TrendingUp, Sparkles, History, ShoppingBag, Tag, Calculator, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

interface SuggestionResult {
  productName: string;
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  message: string;
  dataSource: string;
  similarAds: any[];
}

export default function PriceEstimatorPage() {
  const [mode, setMode] = useState<"selling" | "buying">("selling");
  const [productName, setProductName] = useState("");
  const [condition, setCondition] = useState("good");
  const [yearsUsed, setYearsUsed] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [error, setError] = useState("");

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/price-estimator?productName=${encodeURIComponent(productName)}&condition=${condition}&yearsUsed=${yearsUsed}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Something went wrong");

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDealAssessment = () => {
    if (!result || mode === "selling" || !currentPrice) return null;
    
    const price = Number(currentPrice);
    if (price < result.minPrice) return { label: "Great Deal!", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: <CheckCircle2 className="w-5 h-5" />, desc: "This is significantly below market value. Grab it if the item is authentic!" };
    if (price <= result.maxPrice) return { label: "Fair Price", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", icon: <Info className="w-5 h-5" />, desc: "This price is within the expected market range for this condition." };
    return { label: "Overpriced", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", icon: <AlertCircle className="w-5 h-5" />, desc: "This is higher than most similar listings. You might want to negotiate." };
  };

  const deal = getDealAssessment();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 md:px-6 md:py-12 selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" />
            AI-Powered Valuation
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Smart Price <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Estimator</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Market-driven insights for smarter {mode === "buying" ? "buying" : "selling"}. We analyze real-time data to give you the most accurate valuation.
          </p>
        </motion.div>

        {/* MODE TOGGLE */}
        <div className="flex justify-center mb-10">
          <div className="p-1 bg-slate-200 dark:bg-slate-800 rounded-2xl flex relative overflow-hidden">
            <motion.div 
              className="absolute inset-y-1 bg-white dark:bg-slate-700 rounded-xl shadow-sm"
              initial={false}
              animate={{ 
                x: mode === "selling" ? 0 : "100%",
                width: "50%"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button 
              onClick={() => { setMode("selling"); setResult(null); }}
              className={`relative z-10 px-8 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${mode === "selling" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <Tag className="w-4 h-4" />
              I'm Selling
            </button>
            <button 
              onClick={() => { setMode("buying"); setResult(null); }}
              className={`relative z-10 px-8 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${mode === "buying" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <ShoppingBag className="w-4 h-4" />
              I'm Buying
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* FORM SECTION */}
          <motion.div 
            layout
            className="lg:col-span-5"
          >
            <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-500" />
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calculator className="text-blue-500 w-5 h-5" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEstimate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Product Name
                    </label>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                      <Input
                        placeholder="e.g. iPhone 15 Pro, Sony PS5"
                        className="pl-10 h-14 bg-slate-50 dark:bg-slate-800/50 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-base"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Condition
                      </label>
                      <select
                        className="w-full h-14 rounded-md bg-slate-50 dark:bg-slate-800/50 border-none ring-1 ring-slate-200 dark:ring-slate-700 px-3 focus:ring-2 focus:ring-blue-500 text-sm font-medium cursor-pointer"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                      >
                        <option value="new">Like New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Years Used
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="h-14 bg-slate-50 dark:bg-slate-800/50 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
                        value={yearsUsed}
                        onChange={(e) => setYearsUsed(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {mode === "buying" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          Price you saw (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <Input
                            type="number"
                            placeholder="Current listing price"
                            className="pl-8 h-14 bg-slate-50 dark:bg-slate-800/50 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 transition-all font-mono font-bold"
                            value={currentPrice}
                            onChange={(e) => setCurrentPrice(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg transition-all shadow-xl shadow-blue-500/20 active:scale-95 group"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Get Valuation
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30"
            >
              <h4 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2 text-sm">
                <Info className="w-4 h-4" />
                Deeper Insights
              </h4>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-300/60 leading-relaxed">
                Our algorithm processes thousands of listings, removes statistical outliers, and calculates a fair market corridor based on condition and age.
              </p>
            </motion.div>
          </motion.div>

          {/* RESULTS SECTION */}
          <div className="lg:col-span-7 h-full">
            <AnimatePresence mode="wait">
              {!result && !loading && !error && (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 0.6, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-64 lg:h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl"
                >
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <TrendingUp className="text-slate-400 w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Waiting for data</h3>
                  <p className="text-slate-500 text-sm mt-2 max-w-xs">Enter some details on the left to unlock market insights.</p>
                </motion.div>
              )}

              {loading && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-900 rounded-3xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-800"
                >
                  <div className="relative w-20 h-20 mb-6">
                     <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                     <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                     <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
                  </div>
                  <p className="text-slate-900 dark:text-white font-black text-xl">Processing Market Data</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Cross-referencing similar ads...</p>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-8 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 rounded-3xl text-rose-600 dark:text-rose-400"
                >
                   <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-6 h-6" />
                    <h3 className="text-xl font-black">Something went wrong</h3>
                  </div>
                  <p className="text-sm font-medium opacity-80">{error}</p>
                </motion.div>
              )}

              {result && result.suggestedPrice && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <Card className="border-none shadow-[0_20px_50px_rgba(37,99,235,0.25)] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden relative min-h-[300px] flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                      <Calculator className="w-64 h-64 rotate-12" />
                    </div>
                    
                    <CardContent className="p-8 md:p-10 flex-grow">
                       <div className="flex items-center justify-between mb-4">
                         <div className="flex flex-col gap-1">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider w-fit border ${result.dataSource === "global_market_insights" ? "bg-purple-100/10 border-purple-300/30 text-purple-300" : result.dataSource === "market_benchmark" ? "bg-amber-100/10 border-amber-300/30 text-amber-300" : "bg-emerald-100/10 border-emerald-300/30 text-emerald-300"}`}>
                            {result.dataSource === "global_market_insights" ? <Sparkles className="w-3 h-3" /> : result.dataSource === "market_benchmark" ? <TrendingUp className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {result.dataSource === "global_market_insights" ? "AI Global Market Insights" : result.dataSource === "market_benchmark" ? "Historical Benchmarks" : "Platform Verified Data"}
                          </div>
                          <p className="text-blue-100 font-bold uppercase tracking-[0.2em] text-[10px]">{result.dataSource === "global_market_insights" ? "Fair Market Value (AI)" : "Estimated Market Value"}</p>
                         </div>
                         {mode === "buying" && deal && (
                            <div className={`px-4 py-2 rounded-2xl ${deal.bg} backdrop-blur-md flex items-center gap-2 border border-white/20 whitespace-nowrap`}>
                              {deal.icon}
                              <span className="font-black text-sm">{deal.label}</span>
                            </div>
                         )}
                       </div>

                       <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8">
                         ₹<CountUp end={result.suggestedPrice} duration={2} separator="," />
                       </h2>
                      
                      <div className="space-y-6">
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden relative">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, delay: 0.2 }}
                            className="absolute inset-y-0 bg-white/20"
                          />
                          <div className="absolute inset-y-0 left-[10%] w-[80%] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-blue-100/70">
                          <div className="text-left">
                             <p>Min Value</p>
                             <p className="text-white text-lg mt-1">₹{result.minPrice.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                             <p>Max Value</p>
                             <p className="text-white text-lg mt-1">₹{result.maxPrice.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {(result.message || (mode === "buying" && deal)) && (
                         <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 p-4 bg-black/20 rounded-2xl border border-white/10 space-y-2"
                         >
                            {result.message && (
                              <p className="text-[10px] font-black uppercase tracking-wider text-blue-300 mb-1">Note:</p>
                            )}
                            <p className="text-sm leading-relaxed text-blue-50 font-medium">
                              {result.message || deal?.desc}
                            </p>
                         </motion.div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-500" />
                        Market Evidence
                      </h3>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full font-bold text-slate-500 uppercase">
                        {result.similarAds.length} Listings Found
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {result.similarAds.map((ad, idx) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * idx }}
                          key={ad._id}
                        >
                          <Link 
                            href={`/dashboard/buyer/ad/${ad._id}`}
                            className="group flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50"
                          >
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 relative shadow-inner">
                              {ad.images?.[0] ? (
                                <Image 
                                  src={ad.images[0]} 
                                  alt={ad.title} 
                                  fill 
                                  className="object-cover group-hover:scale-110 transition-transform duration-700" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <ShoppingBag className="w-6 h-6 opacity-20" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col justify-center min-w-0 pr-2">
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors uppercase text-xs tracking-tight">
                                {ad.title}
                              </h4>
                              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                                ₹{ad.price.toLocaleString()}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 opacity-60">
                                <TrendingDown className="w-3 h-3" />
                                <span className="text-[10px] font-bold truncate">Verified Listing</span>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {result && !result.suggestedPrice && (
                <motion.div 
                  key="no-data"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-800"
                >
                   <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <Search className="text-slate-400 w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Insufficient Data</h3>
                  <p className="text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">
                    We couldn't find enough active listings for "<span className="text-slate-900 dark:text-slate-200 font-bold">{result.productName}</span>" to calculate a reliable baseline. Try refining your keywords.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => { setProductName(""); setResult(null); }}
                    className="mt-8 rounded-xl font-bold"
                  >
                    Start Over
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
      
      {/* BACKGROUND ACCENTS */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden opacity-20 dark:opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
