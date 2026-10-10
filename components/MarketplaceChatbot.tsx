"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Loader2, Star, ShieldCheck,
  TrendingDown, TrendingUp, Minus, ChevronRight, AlertCircle, RotateCcw
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Product {
  _id: string;
  title: string;
  price: number;
  category: string;
  locationName: string;
  images: string[];
  description?: string;
  listingUrl?: string;
  status?: string;
  score?: number;
  reasons?: string[];
}

interface ComparisonListing extends Product {
  createdAt?: string;
  views?: number;
}

interface Comparison {
  listings: ComparisonListing[];
  summary: {
    cheapest: string | null;
    mostExpensive: string | null;
    newestListing: string | null;
    oldestListing: string | null;
  };
}

interface PriceFairness {
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  averageMarketPrice: number | null;
  assessment: "fair" | "below_market" | "above_market" | "insufficient_data";
  percentageDiff: number | null;
  note: string;
}

interface SellerInfo {
  _id: string;
  name: string;
  averageRating: number;
  reviewCount: number;
  isTrusted: boolean;
  accountAgeDays: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  products?: Product[];
  comparison?: Comparison;
  priceFairness?: PriceFairness;
  sellerInfo?: SellerInfo;
  suggestions?: string[];
  isError?: boolean;
}

function ProductCard({ product }: { product: Product }) {
  const href = product.listingUrl || `/ads/${product._id}`;
  return (
    <div className="min-w-[165px] flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm snap-start hover:shadow-md transition-shadow">
      <div className="h-28 bg-gray-100 dark:bg-gray-700 relative">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.title} fill className="object-cover" sizes="165px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
        )}
      </div>
      <div className="p-2.5">
        <h4 className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100" title={product.title}>{product.title}</h4>
        <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mt-0.5">Rs.{product.price.toLocaleString("en-IN")}</p>
        <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 mt-1">
          <span className="truncate max-w-[80px]">{product.category}</span>
          <span className="truncate max-w-[70px] text-right">{product.locationName}</span>
        </div>
        {product.reasons && product.reasons.length > 0 && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 truncate">checked {product.reasons[0]}</p>
        )}
        <Link href={href} target="_blank" rel="noopener noreferrer"
          className="mt-2 block text-center text-xs bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 py-1.5 rounded-lg transition-colors w-full font-medium">
          View Listing
        </Link>
      </div>
    </div>
  );
}

function ComparisonTable({ comparison }: { comparison: Comparison }) {
  const { listings, summary } = comparison;
  return (
    <div className="w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Comparison</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left p-2 text-gray-500 dark:text-gray-400 font-medium">Attribute</th>
              {listings.map((l) => (
                <th key={l._id} className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold max-w-[120px]">
                  <span className="truncate block" title={l.title}>{l.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="p-2 text-gray-500 dark:text-gray-400">Price</td>
              {listings.map((l) => (
                <td key={l._id} className={"p-2 font-bold " + (l.title === summary.cheapest ? "text-emerald-600 dark:text-emerald-400" : "text-gray-800 dark:text-gray-200")}>
                  Rs.{l.price.toLocaleString("en-IN")}
                  {l.title === summary.cheapest && <span className="ml-1 text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1 rounded">Best</span>}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="p-2 text-gray-500 dark:text-gray-400">Category</td>
              {listings.map((l) => (<td key={l._id} className="p-2 text-gray-700 dark:text-gray-300">{l.category}</td>))}
            </tr>
            <tr className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="p-2 text-gray-500 dark:text-gray-400">Location</td>
              {listings.map((l) => (<td key={l._id} className="p-2 text-gray-700 dark:text-gray-300">{l.locationName}</td>))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
        {listings.map((l) => (
          <Link key={l._id} href={l.listingUrl || "/ads/" + l._id} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
            View {l.title.slice(0, 20)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PriceFairnessCard({ fairness }: { fairness: PriceFairness }) {
  const iconMap = {
    fair: <Minus size={14} className="text-blue-500" />,
    below_market: <TrendingDown size={14} className="text-emerald-500" />,
    above_market: <TrendingUp size={14} className="text-orange-500" />,
    insufficient_data: <AlertCircle size={14} className="text-gray-400" />,
  };
  const labelMap = { fair: "Fair Price", below_market: "Below Market", above_market: "Above Market", insufficient_data: "Insufficient Data" };
  const colorMap = {
    fair: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    below_market: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    above_market: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    insufficient_data: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
  };
  return (
    <div className={"mt-2 rounded-xl border p-3 " + colorMap[fairness.assessment]}>
      <div className="flex items-center gap-1.5 mb-1">
        {iconMap[fairness.assessment]}
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Price Assessment: {labelMap[fairness.assessment]}</span>
      </div>
      <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
        <span>Listed: <strong className="text-gray-900 dark:text-gray-100">Rs.{fairness.listingPrice.toLocaleString("en-IN")}</strong></span>
        {fairness.averageMarketPrice && (
          <span>Market avg: <strong className="text-gray-900 dark:text-gray-100">Rs.{fairness.averageMarketPrice.toLocaleString("en-IN")}</strong></span>
        )}
        {fairness.percentageDiff !== null && (
          <span className={fairness.percentageDiff >= 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"}>
            {fairness.percentageDiff >= 0 ? "+" : ""}{fairness.percentageDiff}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 italic">Approximate estimate only</p>
    </div>
  );
}

function SellerInfoCard({ seller }: { seller: SellerInfo }) {
  const stars = Math.round(seller.averageRating);
  return (
    <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
          {seller.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{seller.name}</span>
            {seller.isTrusted && <ShieldCheck size={12} className="text-emerald-500" aria-label="Trusted Seller" />}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Member for {seller.accountAgeDays} days</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map((n) => (
            <Star key={n} size={10} className={n <= stars ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"} />
          ))}
          <span className="ml-1">{seller.averageRating.toFixed(1)}</span>
        </div>
        <span>{seller.reviewCount} review{seller.reviewCount !== 1 ? "s" : ""}</span>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 italic">Ratings based on verified completed transactions only.</p>
    </div>
  );
}

export default function MarketplaceChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "init", role: "ai",
    content: "Hi! I am Bazari AI, your intelligent marketplace assistant. I can search listings, compare products, check price fairness, and give you personalised recommendations. How can I help you today?",
    suggestions: ["Find laptops under 50000", "Show me cheap bikes in Mumbai", "Best DSLR cameras"],
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const buildHistory = useCallback(() => {
    return messages.filter((m) => m.id !== "init").slice(-20).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      content: m.content,
    }));
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    const userMessage = messageText.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }]);
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history: buildHistory() }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(), role: "ai",
          content: data.answer || "Here are the results I found.",
          products: data.products, comparison: data.comparison,
          priceFairness: data.priceFairness, sellerInfo: data.sellerInfo, suggestions: data.suggestions,
        }]);
      } else {
        throw new Error(data.error || "Failed to fetch response");
      }
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "ai", content: "Sorry, I encountered an error. Please try again.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, buildHistory]);

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); await sendMessage(input); };

  const handleRetry = () => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (last) sendMessage(last.content);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}
        className={"fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700 z-50 " + (isOpen ? "hidden" : "flex items-center justify-center")}
        aria-label="Open AI Chat">
        <MessageCircle size={28} />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[92vw] max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 dark:border-gray-800"
          style={{ height: "82vh", maxHeight: "720px" }}>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2"><MessageCircle size={20} /> Bazari AI</h3>
              <p className="text-xs text-blue-100 opacity-80">Powered by Gemini - Agentic Marketplace Assistant</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 transition-colors" aria-label="Close chat">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
            {messages.map((msg) => (
              <div key={msg.id} className={"flex flex-col " + (msg.role === "user" ? "items-end" : "items-start")}>
                <div className={"max-w-[88%] p-3 rounded-2xl text-sm whitespace-pre-wrap " + (
                  msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" :
                  msg.isError ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-none" :
                  "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-none"
                )}>
                  {msg.content}
                  {msg.isError && (
                    <button onClick={handleRetry} className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline">
                      <RotateCcw size={10} /> Retry
                    </button>
                  )}
                </div>
                {msg.products && msg.products.length > 0 && !msg.comparison && (
                  <div className="flex overflow-x-auto gap-3 py-3 w-full pb-2 snap-x">
                    {msg.products.slice(0, 8).map((product) => <ProductCard key={product._id} product={product} />)}
                  </div>
                )}
                {msg.comparison && <div className="w-full max-w-[88%]"><ComparisonTable comparison={msg.comparison} /></div>}
                {msg.priceFairness && <div className="w-full max-w-[88%]"><PriceFairnessCard fairness={msg.priceFairness} /></div>}
                {msg.sellerInfo && <div className="w-full max-w-[88%]"><SellerInfoCard seller={msg.sellerInfo} /></div>}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 w-full max-w-[88%]">
                    {msg.suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)} disabled={isLoading}
                        className="text-xs bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1 disabled:opacity-50">
                        {s} <ChevronRight size={10} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Searching marketplace...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2 flex-shrink-0">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to find, compare, or recommend..."
              className="flex-1 bg-gray-100 dark:bg-gray-800 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-0 rounded-full px-4 py-2 text-sm outline-none transition-colors"
              disabled={isLoading} maxLength={2000} />
            <button type="submit" disabled={isLoading || !input.trim()}
              className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0" aria-label="Send message">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
