"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiDollarSign,
  FiSearch,
  FiZap,
  FiArrowRight,
  FiCheckCircle,
  FiLoader,
  FiTrendingUp,
} from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";

type Recommendation = {
  name: string;
  price: number;
  reason: string;
  ad?: {
    _id?: string;
    images?: string[];
  };
};

export default function BudgetShoppingPage() {
  const [mounted, setMounted] = useState(false);
  const [budget, setBudget] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = async () => {
    if (!budget) {
      setError("Please enter your budget");
      return;
    }

    setError("");
    setLoading(true);
    setRecommendations([]);

    try {
      const res = await fetch("/api/ai/budget-deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget: Number(budget),
          query,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setRecommendations(data.recommendations || []);
        if (!data.recommendations?.length) {
          setError("No exact matches, AI is searching for similar deals...");
        }
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Failed to connect to AI assistant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      {!mounted ? null : (
        <>
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-slate-900 py-24 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#3b82f61a_0%,transparent_50%)]"></div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-slate-800"></div>

            <div className="max-w-7xl mx-auto px-8 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl"
              >
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
                  <FiZap className="fill-current" /> Powered by xAI Grok-Beta
                </div>

                <h1 className="text-5xl font-black tracking-tighter italic mb-6">
                  Shop Smarter<span className="text-blue-500">.</span> AI Assistant
                </h1>

                <p className="text-slate-400 font-medium text-lg leading-relaxed mb-12">
                  Tell us your budget and what you're looking for. Our AI analyzes
                  the entire marketplace to find the absolute best value for your
                  money.
                </p>

                <div className="flex flex-col md:flex-row gap-4">
                  {/* Budget */}
                  <div className="flex-1 relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500">
                      <FiDollarSign size={20} />
                    </div>
                    <input
                      type="number"
                      placeholder="Enter Budget (e.g. 10000)"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full pl-16 pr-8 py-5 rounded-3xl bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>

                  {/* Query */}
                  <div className="flex-1 relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">
                      <FiSearch size={20} />
                    </div>
                    <input
                      type="text"
                      placeholder="What are you looking for?"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full pl-16 pr-8 py-5 rounded-3xl bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>

                  {/* Button */}
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-10 py-5 bg-blue-600 text-white rounded-3xl flex items-center gap-3"
                  >
                    {loading ? <FiLoader className="animate-spin" /> : <FiZap />}
                    {loading ? "Analyzing..." : "Find Deals"}
                  </button>
                </div>

                {error && (
                  <p className="mt-6 text-red-400 font-bold">{error}</p>
                )}
              </motion.div>
            </div>
          </div>

          {/* Results */}
          <div className="max-w-7xl mx-auto px-8 -mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white p-8 rounded-3xl shadow animate-pulse"
                >
                  Loading...
                </div>
              ))
            ) : (
              <AnimatePresence>
                {recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl shadow"
                  >
                    {/* Image */}
                    <div className="h-48 bg-gray-100 rounded-xl mb-6 relative">
                      {rec.ad?.images?.[0] && (
                        <Image
                          src={rec.ad.images[0]}
                          fill
                          className="object-cover rounded-xl"
                          alt={rec.name}
                        />
                      )}
                    </div>

                    <h3 className="text-xl font-bold">{rec.name}</h3>
                    <p className="text-gray-600">{rec.reason}</p>

                    <div className="mt-4 flex justify-between items-center">
                      <span className="font-bold">
                        ₹{rec.price.toLocaleString("en-IN")}
                      </span>

                      <Link href={`/ads/${rec.ad?._id || "#"}`}>
                        <FiArrowRight />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Empty */}
          {!loading && recommendations.length === 0 && !error && (
            <div className="text-center mt-20">
              <FiDollarSign size={40} className="mx-auto text-blue-500" />
              <h2 className="text-2xl font-bold mt-4">Ready to save?</h2>
              <p className="text-gray-500">
                Enter your budget above and find best deals.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}