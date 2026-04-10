"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useUserStore } from "@/store/userStore"; 
import { 
  FiMapPin, FiClock, FiHeart, FiMessageSquare, 
  FiShare2, FiChevronLeft, FiChevronRight, FiShield, FiNavigation, FiCheck, FiZap, FiLoader
} from "react-icons/fi";

type Ad = {
  _id: string;
  title: string;
  price: number;
  description: string;
  locationName: string;
  location: { type: string; coordinates: number[] };
  yearsUsed: number;
  images: string[];
  user: { name: string; _id: string };
  status: "active" | "pending" | "spam";
  isGroupBuy?: boolean;
  groupBuyTarget?: number;
  groupBuyPrice?: number;
  groupBuyers?: string[];
};

export default function AdDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUserStore(); 

  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [joiningGroupBuy, setJoiningGroupBuy] = useState(false);
  const [pricingInsight, setPricingInsight] = useState<{ discountPercent: number; explanation: string } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await api.get(`/ads/${id}`);
        setAd(res.data);
        if (res.data.isGroupBuy) {
          fetchPricingInsight(res.data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAd();
  }, [id]);

  const fetchPricingInsight = async (adData: Ad) => {
    try {
      setLoadingInsight(true);
      const res = await fetch("/api/ai/group-buy-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          productName: adData.title, 
          originalPrice: adData.price, 
          buyersCount: adData.groupBuyers?.length || 0 
        }),
      });
      const data = await res.json();
      if (res.ok) setPricingInsight(data.pricing);
    } catch (err) {
      console.warn("Failed to fetch pricing insight");
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.post(`/ads/saved/${id}`);
      setSaved(res.data.saved);
    } catch (err) {
      alert("Failed to save ad");
    } finally {
      setSaving(false);
    }
  };

  const handleJoinGroupBuy = async () => {
    if (!user) return alert("Please login to join the group buy");

    if (user.id === ad?.user._id) {
      return alert("You cannot join your own group buy.");
    }

    try {
      setJoiningGroupBuy(true);
      const res = await api.post(`/ads/${id}/group-buy`, { userId: user.id });
      setAd(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          groupBuyers: [...(prev.groupBuyers || []), user.id]
        };
      });
      alert(res.data.message || "Successfully joined!");
    } catch (err: any) {
      if (err?.response?.status === 401) alert("Please login first");
      else alert(err.response?.data?.message || "Unable to join group buy");
    } finally {
      setJoiningGroupBuy(false);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    
    if (user.id === ad?.user?._id) {
      return alert("You cannot start a conversation on your own listing.");
    }

    try {
      setStartingChat(true);
      const res = await api.post(`/chats/start/${ad?._id}`);
      router.push(`/chats/${res.data.chatId}`);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.push("/login");
      } else {
        alert(err.response?.data?.message || "Unable to start chat");
      }
    } finally {
      setStartingChat(false);
    }
  };

  const handleNavigate = () => {
    if (!ad) return;
    const [lng, lat] = ad.location?.coordinates ?? [];
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
    } else if (ad.locationName) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(ad.locationName)}`, "_blank");
    }
  };

  const handleShare = async () => {
    if (!ad) return;
    const shareData = {
      title: ad.title,
      text: `Check this item on Bazaari: ${ad.title} for ₹${ad.price}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
      }
    } catch (error) {
      console.log("Share failed:", error);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div>
      </div>
    );

  if (!ad)
    return <div className="p-20 text-center font-bold">Listing not found.</div>;

  // --- LOGIC CONSTANTS ---
  const isOwner = user?.id === ad?.user?._id;
  const hasJoined = !!user?.id && (ad.groupBuyers || []).includes(user.id);

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <Link
          href="/ads"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
        >
          <FiChevronLeft /> Back to Marketplace
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-8 mb-8">
        {ad.status === "spam" && (
          <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-rose-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
               <FiShield size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-900 tracking-tight">Potentially Fraudulent Listing</h2>
              <p className="text-sm font-bold text-rose-700/80 leading-relaxed uppercase tracking-widest mt-1">
                This item has been flagged by our professional security system. Proceed with extreme caution.
              </p>
            </div>
          </div>
        )}
        {ad.status === "pending" && (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-amber-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
               <FiShield size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-900 tracking-tight">Under Professional Review</h2>
              <p className="text-sm font-bold text-amber-700/80 leading-relaxed uppercase tracking-widest mt-1">
                Our team is currently verifying this listing. Some details may be inaccurate.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-6">
          <div className="relative aspect-[16/10] rounded-[3rem] overflow-hidden bg-slate-100 shadow-2xl group">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full"
              >
                <Image
                  src={ad.images?.[current] || "/placeholder.png"}
                  alt={ad.title}
                  fill
                  className="object-cover"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {ad.images.length > 1 && (
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <NavBtn icon={<FiChevronLeft />} onClick={() => setCurrent(current === 0 ? ad.images.length - 1 : current - 1)} />
                <NavBtn icon={<FiChevronRight />} onClick={() => setCurrent(current === ad.images.length - 1 ? 0 : current + 1)} />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-tight">
              {ad.title}
            </h1>

            <div className="flex items-center gap-6 text-slate-400 font-bold text-sm">
              <span className="flex items-center gap-1.5"><FiMapPin className="text-blue-600" /> {ad.locationName || "Remote"}</span>
              <span className="flex items-center gap-1.5"><FiClock className="text-blue-600" /> {ad.yearsUsed} Years Used</span>
            </div>

            <p className="text-5xl font-black text-blue-600 tracking-tighter pt-2">
              ₹{ad.price.toLocaleString("en-IN")}
            </p>
          </div>

          {ad.isGroupBuy && ad.groupBuyTarget && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100 rounded-[2rem] p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-black text-purple-900 tracking-tight flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> Group Buy Active
                  </h3>
                  <p className="text-[10px] font-bold text-purple-700/70 uppercase tracking-widest mt-1">Unlock massive savings</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-purple-600 tracking-tighter">₹{(ad.groupBuyPrice || 0).toLocaleString("en-IN")}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-through">₹{ad.price.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                 <div className="w-full h-3 bg-purple-200/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((ad.groupBuyers?.length || 0) / ad.groupBuyTarget) * 100)}%` }}
                    />
                 </div>
                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-purple-600">{ad.groupBuyers?.length || 0} Joined</span>
                    <span className="text-slate-400">Target: {ad.groupBuyTarget}</span>
                 </div>
              </div>

              {loadingInsight ? (
                <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase text-purple-400 animate-pulse">
                  <FiLoader className="animate-spin" /> AI Analyzing Marketplace...
                </div>
              ) : pricingInsight && (
                <div className="mb-6 bg-white/50 border border-purple-100 rounded-2xl p-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl group-hover:bg-purple-500/10 transition-colors"></div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-200">
                       <FiZap size={14} className="fill-current" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">AI Pricing Assistant</p>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                        "{pricingInsight.explanation}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleJoinGroupBuy}
                disabled={joiningGroupBuy || isOwner || hasJoined}
                className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
                  hasJoined
                    ? "bg-purple-600 text-white cursor-default"
                    : isOwner 
                      ? "bg-purple-100 text-purple-400 cursor-not-allowed" 
                      : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-purple-500/20 active:scale-95"
                }`}
              >
                {joiningGroupBuy && <FiLoader className="animate-spin" />}
                {!joiningGroupBuy && hasJoined && <FiCheck />}
                <span className="ml-2">
                  {joiningGroupBuy ? "Joining..." : hasJoined ? "You've Joined!" : "Join Group Buy"}
                </span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {isOwner ? (
              <button
                onClick={() => router.push("/dashboard/seller")}
                className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-[0.98]"
              >
                <FiMessageSquare size={18} /> 
                View Inquiries
              </button>
            ) : (
              <button
                onClick={handleStartChat}
                disabled={startingChat}
                className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-blue-600 active:scale-[0.98]"
              >
                <FiMessageSquare size={18} /> 
                {startingChat ? "Opening Chat..." : "Start Conversation"}
              </button>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                  saved ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FiHeart fill={saved ? "currentColor" : "none"} />
                {saved ? "Saved" : "Save Listing"}
              </button>

              <button onClick={handleShare} className="px-8 py-5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                <FiShare2 />
              </button>

              <button onClick={handleNavigate} className="px-8 py-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                <FiNavigation />
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Location Card */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-[2rem] p-6 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">📍 Seller Location</h3>
            <p className="text-slate-700 font-bold text-sm">{ad.locationName || "Location not specified"}</p>
            <button onClick={handleNavigate} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md">
              <FiNavigation size={14} /> Get Directions
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Description</h3>
            <p className="text-slate-600 leading-relaxed font-medium">{ad.description}</p>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
              <FiShield size={24} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-blue-900">Bazaari Shield</h4>
              <p className="text-[10px] font-bold text-blue-700/70 mt-1">Never pay in advance. Inspect items in person.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ icon, onClick }: { icon: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 shadow-xl hover:bg-blue-600 hover:text-white transition-all active:scale-90">
      {icon}
    </button>
  );
}