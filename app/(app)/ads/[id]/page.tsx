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
  FiShare2, FiChevronLeft, FiChevronRight, FiShield, FiNavigation, FiCheck, FiZap, FiLoader, FiTrendingUp
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
  fraudCheck?: {
    score: number;
    status: "active" | "pending" | "spam";
    reasons: string[];
  };
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
  const [showInviteModal, setShowInviteModal] = useState(false);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );

  if (!ad)
    return <div className="p-20 text-center font-bold">Listing not found.</div>;

  // --- LOGIC CONSTANTS ---
  const isOwner = user?.id === ad?.user?._id;
  const hasJoined = !!user?.id && (ad.groupBuyers || []).includes(user.id);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <Link
          href="/ads"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          <FiChevronLeft /> Back to Marketplace
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-8 mb-8">
        {ad.status === "spam" && (
          <div className="bg-rose-500/10 border-2 border-rose-500/20 p-6 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-rose-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
               <FiShield size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-500 tracking-tight">Potentially Fraudulent Listing</h2>
              <p className="text-sm font-bold text-rose-400 leading-relaxed uppercase tracking-widest mt-1">
                This item has been flagged by our professional security system. Proceed with extreme caution.
              </p>
            </div>
          </div>
        )}
        {ad.status === "pending" && (
          <div className="bg-amber-500/10 border-2 border-amber-500/20 p-6 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-amber-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
               <FiShield size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-500 tracking-tight">Under Professional Review</h2>
              <p className="text-sm font-bold text-amber-400 leading-relaxed uppercase tracking-widest mt-1">
                Our team is currently verifying this listing. Some details may be inaccurate.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-6">
          <div className="relative aspect-[16/10] rounded-[3rem] overflow-hidden bg-muted shadow-2xl group">
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
                  src={ad.images?.[current] || "/placeholder.svg"}
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
            <h1 className="text-4xl font-black tracking-tighter text-foreground leading-tight">
              {ad.title}
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground font-bold text-sm">
              <span className="flex items-center gap-1.5"><FiMapPin className="text-primary" /> {ad.locationName || "Remote"}</span>
              <span className="flex items-center gap-1.5"><FiClock className="text-primary" /> {ad.yearsUsed} Years Used</span>
            </div>

            <p className="text-5xl font-black text-primary tracking-tighter pt-2">
              ₹{ad.price.toLocaleString("en-IN")}
            </p>

            {/* ── Price Estimator CTA ── */}
            <Link
              href={`/price-estimator?product=${encodeURIComponent(ad.title)}&mode=buying`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 transition-all group w-fit"
            >
              <FiTrendingUp size={15} className="text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-indigo-400">Is this a fair price?</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80 group-hover:text-indigo-400 transition-colors">Check with AI Estimator →</span>
            </Link>
          </div>

          {ad.isGroupBuy && ad.groupBuyTarget && (
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20 rounded-[2rem] p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-black text-primary tracking-tight flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Group Buy Active
                  </h3>
                  <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mt-1">Unlock massive savings</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-primary tracking-tighter">₹{(ad.groupBuyPrice || 0).toLocaleString("en-IN")}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest line-through">₹{ad.price.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                 <div className="w-full h-3 bg-primary/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((ad.groupBuyers?.length || 0) / ad.groupBuyTarget) * 100)}%` }}
                    />
                 </div>
                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-primary">{ad.groupBuyers?.length || 0} Joined</span>
                    <span className="text-muted-foreground">Target: {ad.groupBuyTarget}</span>
                 </div>
              </div>

              {loadingInsight ? (
                <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase text-primary animate-pulse">
                  <FiLoader className="animate-spin" /> AI Analyzing Marketplace...
                </div>
              ) : pricingInsight && (
                <div className="mb-6 bg-card/50 border border-primary/20 rounded-2xl p-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-xl group-hover:bg-primary/20 transition-colors"></div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                       <FiZap size={14} className="fill-current" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AI Pricing Assistant</p>
                      <p className="text-xs font-bold text-foreground leading-relaxed italic">
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
                    ? "bg-primary text-primary-foreground cursor-default"
                    : isOwner 
                      ? "bg-primary/20 text-primary cursor-not-allowed" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 active:scale-95"
                }`}
              >
                {joiningGroupBuy && <FiLoader className="animate-spin" />}
                {!joiningGroupBuy && hasJoined && <FiCheck />}
                <span className="ml-2">
                  {joiningGroupBuy ? "Joining..." : hasJoined ? "You've Joined!" : "Join Group Buy"}
                </span>
              </button>

              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-3 w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest bg-card hover:bg-muted border border-primary/20 text-primary shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <FiShare2 /> Invite Friends to Save
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {isOwner ? (
              <button
                onClick={() => router.push("/dashboard/seller")}
                className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98]"
              >
                <FiMessageSquare size={18} /> 
                View Inquiries
              </button>
            ) : (
              <button
                onClick={handleStartChat}
                disabled={startingChat}
                className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
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
                  saved ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <FiHeart fill={saved ? "currentColor" : "none"} />
                {saved ? "Saved" : "Save Listing"}
              </button>

              <button onClick={handleShare} className="px-8 py-5 rounded-2xl border border-border text-muted-foreground hover:bg-muted transition-all">
                <FiShare2 />
              </button>

              <button onClick={handleNavigate} className="px-8 py-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all">
                <FiNavigation />
              </button>
            </div>
          </div>

          <hr className="border-border" />

          {/* Location Card */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">📍 Seller Location</h3>
            <p className="text-foreground font-bold text-sm">{ad.locationName || "Location not specified"}</p>
            <button onClick={handleNavigate} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md">
              <FiNavigation size={14} /> Get Directions
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Description</h3>
            <p className="text-muted-foreground leading-relaxed font-medium">{ad.description}</p>
          </div>

          <div className={`p-6 rounded-[2rem] border flex flex-col gap-4 ${
            !ad.fraudCheck || ad.fraudCheck.score < 5
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : ad.fraudCheck.score < 7
                ? "bg-amber-500/5 border-amber-500/20"
                : "bg-rose-500/5 border-rose-500/20"
          }`}>
            <div className="flex gap-4">
              <div className={`w-12 h-12 bg-card rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                !ad.fraudCheck || ad.fraudCheck.score < 5
                  ? "text-emerald-500" 
                  : ad.fraudCheck.score < 7
                    ? "text-amber-500"
                    : "text-rose-500"
              }`}>
                <FiShield size={24} />
              </div>
              <div className="space-y-1">
                <h4 className={`font-black text-xs uppercase tracking-widest ${
                  !ad.fraudCheck || ad.fraudCheck.score < 5
                    ? "text-emerald-500" 
                    : ad.fraudCheck.score < 7
                      ? "text-amber-500"
                      : "text-rose-500"
                }`}>
                  {!ad.fraudCheck || ad.fraudCheck.score < 5
                    ? "Bazaari Shield: High Trust" 
                    : ad.fraudCheck.score < 7
                      ? "Bazaari Shield: Moderate Trust"
                      : "Bazaari Shield: Security Warning"
                  }
                </h4>
                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-wider">
                  {!ad.fraudCheck || ad.fraudCheck.score < 5
                    ? "Safe listing. Matches all standard security parameters." 
                    : ad.fraudCheck.score < 7
                      ? "Some anomalies detected. Keep interactions strictly inside the platform."
                      : "Aggressive spam keywords or off-platform payment signals found."
                  }
                </p>
              </div>
            </div>

            {ad.fraudCheck && ad.fraudCheck.reasons && ad.fraudCheck.reasons.length > 0 && (
              <div className="mt-2 pt-4 border-t border-dashed border-border/60 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">AI Risk Indicators:</p>
                <ul className="space-y-1.5">
                  {ad.fraudCheck.reasons.map((reason, idx) => (
                    <li key={idx} className="text-[10px] font-medium text-muted-foreground flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${ad.fraudCheck!.score < 7 ? "bg-amber-400" : "bg-rose-400"}`}></span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-[2.5rem] w-full max-w-md overflow-hidden border border-border shadow-2xl relative text-foreground"
            >
              {/* Neon Accent Header */}
              <div className="h-2 w-full bg-gradient-to-r from-[hsl(var(--luxury-violet))] to-[hsl(var(--luxury-rose))]" />
              
              <div className="p-8 space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black tracking-tight uppercase">Co-Buy Invite Ticket</h3>
                  <p className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Save Together on Bazaari</p>
                </div>

                {/* Styled Ticket graphic card */}
                <div className="bg-muted/40 p-6 rounded-[2rem] border border-border/60 relative overflow-hidden flex flex-col items-center text-center shadow-inner">
                  {/* Left Notch */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-6 h-6 rounded-full bg-card border border-border" />
                  {/* Right Notch */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-6 h-6 rounded-full bg-card border border-border" />
                  
                  {/* Image */}
                  <div className="w-24 h-24 relative rounded-2xl overflow-hidden border-2 border-border shadow-md mb-4 bg-muted">
                    <Image
                      src={ad.images?.[0] || "/placeholder.svg"}
                      alt={ad.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <h4 className="font-black text-sm uppercase tracking-tight max-w-[220px] truncate">{ad.title}</h4>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] bg-primary/20 px-2.5 py-1 rounded-full font-black text-primary uppercase tracking-widest">
                      Save {Math.round((1 - (ad.groupBuyPrice || ad.price) / ad.price) * 100)}%
                    </span>
                    <span className="text-[10px] bg-muted px-2.5 py-1 rounded-full font-black text-muted-foreground uppercase tracking-widest">
                      {(ad.groupBuyTarget ?? 0) - (ad.groupBuyers?.length || 0)} Slots Left
                    </span>
                  </div>

                  {/* Dashed Separator Line */}
                  <div className="w-full border-t border-dashed border-border my-4" />

                  <div className="flex justify-between w-full px-2 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    <div className="text-left">
                      <p>Deal Price</p>
                      <p className="text-primary text-sm mt-0.5">₹{ad.groupBuyPrice?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p>Retail Value</p>
                      <p className="line-through text-sm mt-0.5">₹{ad.price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const shareText = `Hey! I joined a Group Buy for "${ad.title}" on Bazaari. If we get ${ad.groupBuyTarget} people to join, we get it for only ₹${ad.groupBuyPrice?.toLocaleString()} (normally ₹${ad.price.toLocaleString()})! Join my group deal here: ${window.location.href}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
                    }}
                    className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    Share on WhatsApp
                  </button>

                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95"
                  >
                    Close Ticket
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavBtn({ icon, onClick }: { icon: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-12 h-12 bg-card/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-foreground shadow-xl hover:bg-primary hover:text-primary-foreground transition-all active:scale-90">
      {icon}
    </button>
  );
}