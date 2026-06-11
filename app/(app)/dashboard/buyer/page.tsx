"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";
import AdGrid from "@/components/ads/AdGrid";

import {
  FiHeart, FiStar, FiSearch, FiZap, FiNavigation, FiArrowRight,
  FiMessageCircle, FiCamera, FiLoader, FiTrendingUp, FiShoppingBag,
  FiMapPin, FiClock, FiChevronRight, FiUser, FiX,
} from "react-icons/fi";
import { TbCurrencyRupee } from "react-icons/tb";

/* ─── QUICK ACTIONS ─────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { icon: <FiTrendingUp size={20} />, label: "Price Estimator", sub: "AI fair price check",     href: "/price-estimator", gradient: "from-violet-500 to-indigo-600",  shadow: "shadow-indigo-500/30" },
  { icon: <TbCurrencyRupee size={20} />, label: "Budget Shop",  sub: "Deals in your limit",     href: "/budget-shopping", gradient: "from-emerald-500 to-teal-600",   shadow: "shadow-emerald-500/30" },
  { icon: <FiMapPin size={20} />,        label: "Nearby",        sub: "Listings near you",       href: "/nearby",          gradient: "from-rose-500 to-pink-600",     shadow: "shadow-rose-500/30" },
  { icon: <FiHeart size={20} />,         label: "Wishlist",      sub: "Your saved items",        href: "/saved",           gradient: "from-amber-500 to-orange-600",  shadow: "shadow-amber-500/30" },
  { icon: <FiShoppingBag size={20} />,   label: "Browse All",    sub: "Full marketplace",        href: "/ads",             gradient: "from-blue-500 to-cyan-600",     shadow: "shadow-blue-500/30" },
  { icon: <FiMessageCircle size={20} />, label: "Messages",      sub: "Seller conversations",    href: "/messages",        gradient: "from-purple-500 to-fuchsia-600", shadow: "shadow-purple-500/30" },
];

/* ─── CATEGORIES ─────────────────────────────────────────────── */
const CATEGORIES = [
  { label: "All",          emoji: "✨", value: "" },
  { label: "Electronics",  emoji: "📱", value: "Electronics" },
  { label: "Vehicles",     emoji: "🚗", value: "Vehicles" },
  { label: "Property",     emoji: "🏠", value: "Property" },
  { label: "Fashion",      emoji: "👗", value: "Fashion" },
  { label: "Furniture",    emoji: "🛋️", value: "Furniture" },
  { label: "Fitness",      emoji: "🏋️", value: "Fitness" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function BuyerDashboard() {
  const [search, setSearch]           = useState("");
  const [activeCategory, setCategory] = useState("");
  const [chats, setChats]             = useState<any[]>([]);
  const [chatOpen, setChatOpen]       = useState(false);   // mobile chat drawer
  const { user }                      = useUserStore();
  const userId                        = user?.id;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Reviews
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [reviewModal, setReviewModal]       = useState<{ isOpen: boolean; ad: any | null }>({ isOpen: false, ad: null });
  const [rating, setRating]                 = useState(5);
  const [comment, setComment]               = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  /* ── image search ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAnalyzing(true);
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/analyze-image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.searchQuery) setSearch(data.searchQuery);
      else alert(data.message || "Failed to analyze image");
    } catch { alert("Error recognizing image"); }
    finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ── chats + socket ── */
  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get("/chats");
        setChats(r.data.filter((c: any) => c.buyer?._id === userId));
        
        const revs = await api.get("/reviews/pending");
        setPendingReviews(revs.data);
      } catch {}
    };
    load();

    if (!userId) return;
    socket.connect();
    socket.emit("register_user", userId);

    const onNotif = (data: any) => {
      setChats(prev => {
        const found = prev.find(c => c._id === data.chatId);
        if (found) {
          const upd  = prev.map(c => c._id === data.chatId ? { ...c, lastMessage: data.text } : c);
          const hit  = upd.find(c => c._id === data.chatId)!;
          return [hit, ...upd.filter(c => c._id !== data.chatId)];
        }
        api.get("/chats").then(r => setChats(r.data.filter((c: any) => c.buyer?._id === userId))).catch(() => {});
        return prev;
      });
    };
    socket.on("new_notification", onNotif);
    return () => { socket.off("new_notification", onNotif); };
  }, [userId]);

  const submitReview = async () => {
    if (!reviewModal.ad) return;
    setSubmittingReview(true);
    try {
      await api.post("/reviews", {
        adId: reviewModal.ad._id,
        rating,
        comment,
      });
      setPendingReviews(prev => prev.filter(r => r._id !== reviewModal.ad._id));
      setReviewModal({ isOpen: false, ad: null });
      setRating(5);
      setComment("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      {/* ambient blobs — hidden on tiny screens to save perf */}
      <div className="hidden sm:block absolute top-0 left-0 w-[500px] h-[500px] bg-[hsl(var(--luxury-violet)/0.05)] rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="hidden sm:block absolute bottom-0 right-0 w-[400px] h-[400px] bg-[hsl(var(--luxury-rose)/0.05)]   rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none -z-0" />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MOBILE CHAT DRAWER (slides up)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setChatOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-[2rem] border-t border-border shadow-2xl lg:hidden overflow-hidden"
              style={{ maxHeight: "70vh" }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <FiMessageCircle className="text-primary" size={16} />
                  <h3 className="font-black text-sm uppercase tracking-widest">Inquiries</h3>
                  {chats.length > 0 && (
                    <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-black rounded-full">{chats.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/messages" className="text-[10px] font-black text-primary uppercase tracking-widest">View All</Link>
                  <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <FiX size={14} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto p-3 space-y-1" style={{ maxHeight: "calc(70vh - 73px)" }}>
                <ChatList chats={chats} userId={userId} onSelect={() => setChatOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          REVIEW MODAL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {reviewModal.isOpen && reviewModal.ad && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setReviewModal({ isOpen: false, ad: null })} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-[101] w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8">
              <button onClick={() => setReviewModal({ isOpen: false, ad: null })} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"><FiX /></button>
              
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
                <FiStar size={20} className="fill-amber-500" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Review Your Purchase</h3>
              <p className="text-sm text-muted-foreground mb-6 font-medium">How was your experience buying <strong className="text-foreground">{reviewModal.ad.title}</strong> from <strong className="text-foreground">{reviewModal.ad.user.name}</strong>?</p>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                    <FiStar size={36} className={`${rating >= star ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'} transition-colors`} />
                  </button>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Write a comment (optional)</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Great seller, item exactly as described!"
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/40 transition-all resize-none h-24"
                />
              </div>

              <button 
                onClick={submitReview}
                disabled={submittingReview}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingReview ? <FiLoader className="animate-spin" /> : "Submit Review"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          LAYOUT: sidebar + main
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-12 flex gap-8">

        {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-5 w-72 xl:w-80 shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="sticky top-10 flex flex-col gap-5 h-[calc(100vh-5rem)]"
          >
            {/* Profile */}
            <div className="bg-card/60 backdrop-blur-2xl rounded-[1.75rem] border border-border/60 p-5 flex items-center gap-4 shadow-sm hover:border-primary/20 transition-all duration-500">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-primary/30 shrink-0">
                {user?.name?.[0]?.toUpperCase() || <FiUser size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm tracking-tight truncate">{user?.name || "Guest Buyer"}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">Buyer Account</p>
              </div>
              <Link href="/profile" className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all border border-border shrink-0">
                <FiChevronRight size={14} />
              </Link>
            </div>

            {/* Chats panel */}
            <div className="flex-1 min-h-0 bg-card/40 backdrop-blur-3xl rounded-[1.75rem] border border-border/50 shadow-sm overflow-hidden flex flex-col hover:border-primary/20 transition-all duration-500">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FiMessageCircle className="text-primary" size={14} />
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em]">Inquiries</h3>
                  {chats.length > 0 && (
                    <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-black rounded-full">{chats.length}</span>
                  )}
                </div>
                <Link href="/messages" className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                  <FiArrowRight size={12} />
                </Link>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-1">
                <ChatList chats={chats} userId={userId} />
              </div>
            </div>
          </motion.div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-6 sm:space-y-8">

          {/* ── PENDING REVIEWS ALERT ──────────────────────────── */}
          <AnimatePresence>
            {pendingReviews.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -20, height: 0 }} className="overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                      <FiStar size={20} className="fill-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-black text-amber-600 tracking-tight">You have {pendingReviews.length} pending review{pendingReviews.length > 1 ? 's' : ''}</h3>
                      <p className="text-xs font-medium text-amber-600/70 mt-0.5">Please rate your recent purchases to help the community.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setReviewModal({ isOpen: true, ad: pendingReviews[0] })}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-amber-500/20 whitespace-nowrap"
                  >
                    Review Now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── HERO / WELCOME BAR ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-card/50 backdrop-blur-2xl border border-border/50 rounded-2xl sm:rounded-[2rem] shadow-sm p-5 sm:p-7"
          >
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

            {/* Mobile: stack, Tablet+: row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600">Live Marketplace</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter leading-tight">
                  Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
                  <span className="text-primary">.</span>
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Curated deals, tailored just for you.</p>
              </div>

              {/* Search + camera + mobile chat toggle */}
              <div className="flex items-center gap-2 w-full sm:w-auto sm:max-w-xs">
                {/* Search */}
                <div className="relative flex-1 group">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 sm:py-3.5 rounded-xl bg-background/80 border border-border focus:border-primary/50 outline-none text-sm font-medium placeholder:text-muted-foreground/40 transition-all"
                  />
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    title="Search by Image"
                  >
                    {isAnalyzing ? <FiLoader className="animate-spin" size={16} /> : <FiCamera size={16} />}
                  </button>
                </div>

                {/* Mobile — chat bubble button */}
                <button
                  onClick={() => setChatOpen(true)}
                  className="lg:hidden relative shrink-0 w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  <FiMessageCircle size={18} />
                  {chats.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                      {chats.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── QUICK ACTION GRID ──────────────────────────────── */}
          {/* 2-col on phone, 3-col on tablet, 6-col on xl */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <SectionHeader label="Quick Actions" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              {QUICK_ACTIONS.map((a, i) => (
                <motion.div
                  key={a.href}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link href={a.href}>
                    <div className={`group relative rounded-2xl sm:rounded-[1.4rem] bg-gradient-to-br ${a.gradient} p-4 sm:p-5 text-white flex flex-col gap-2 sm:gap-3 hover:-translate-y-1 transition-all duration-300 shadow-lg ${a.shadow} hover:shadow-xl overflow-hidden cursor-pointer`}>
                      <div className="absolute -right-3 -bottom-3 w-14 h-14 bg-white/10 rounded-full blur-xl" />
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                        {a.icon}
                      </div>
                      <div>
                        <p className="font-black text-xs sm:text-[13px] leading-tight">{a.label}</p>
                        <p className="text-white/60 text-[9px] sm:text-[10px] font-medium mt-0.5 leading-tight hidden sm:block">{a.sub}</p>
                      </div>
                      <FiArrowRight size={11} className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ── CATEGORY CHIPS ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide"
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-all duration-200 ${
                  activeCategory === cat.value
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span>{cat.emoji}</span>
                <span className="hidden xs:inline sm:inline">{cat.label}</span>
              </button>
            ))}
          </motion.div>

          {/* ── DAILY HIGHLIGHTS ───────────────────────────────── */}
          <LuxeSection
            title="Daily Highlights"
            subtitle="Fresh listings added today"
            href="/ads"
            icon={<FiStar size={15} />}
            accentColor="hsl(var(--primary))"
            bgGradient="from-primary/5 via-card/40 to-card/10"
          >
            <AdGrid search={search} category={activeCategory} layout="horizontal" hoverEffect="lift" limit={6} compact />
          </LuxeSection>

          {/* ── WISHLIST + NEARBY — side-by-side on md+ ──────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LuxeSection
              title="Your Wishlist"
              subtitle="Items you've saved"
              href="/saved"
              icon={<FiHeart size={15} />}
              accentColor="hsl(var(--luxury-rose))"
              bgGradient="from-[hsl(var(--luxury-rose)/0.07)] via-card/40 to-card/10"
            >
              <AdGrid search={search} type="saved" limit={2} hoverEffect="lift" compact />
            </LuxeSection>

            <LuxeSection
              title="Around You"
              subtitle="Listings near your location"
              href="/nearby"
              icon={<FiNavigation size={15} />}
              accentColor="hsl(var(--luxury-violet))"
              bgGradient="from-[hsl(var(--luxury-violet)/0.07)] via-card/40 to-card/10"
            >
              <AdGrid search={search} type="nearby" limit={2} hoverEffect="lift" compact />
            </LuxeSection>
          </div>

          {/* ── TRENDING ───────────────────────────────────────── */}
          <LuxeSection
            title="Trending Now"
            subtitle="Most viewed & chatted listings"
            href="/ads?sort=trending"
            icon={<FiZap size={15} />}
            accentColor="hsl(var(--primary))"
            bgGradient="from-primary/5 via-card/30 to-card/5"
          >
            <AdGrid search={search} category={activeCategory} type="trending" hoverEffect="lift" limit={8} compact />
          </LuxeSection>

          {/* Bottom spacer for mobile nav bars */}
          <div className="h-6 sm:h-2" />
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHAT LIST (reused in sidebar + drawer)
═══════════════════════════════════════════════════════════════ */
function ChatList({ chats, userId, onSelect }: { chats: any[]; userId?: string; onSelect?: () => void }) {
  if (!chats.length) return (
    <div className="py-10 text-center px-4">
      <FiMessageCircle className="mx-auto text-muted-foreground/20 mb-3" size={22} />
      <p className="text-muted-foreground/50 font-black uppercase text-[9px] tracking-[0.2em]">No Active Chats</p>
      <p className="text-muted-foreground/30 text-[10px] mt-1">View an ad to start talking</p>
    </div>
  );
  return (
    <AnimatePresence mode="popLayout">
      {chats.map(chat => {
        const other = chat.buyer?._id === userId ? chat.seller : chat.buyer;
        return (
          <motion.div layout key={chat._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            <Link href={`/chats/${chat._id}`} onClick={onSelect}>
              <div className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-violet-400/10 text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/10 group-hover:scale-105 transition-transform">
                  {other?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate">{other?.name || "Member"}</p>
                  <p className="text-[9px] text-muted-foreground truncate mt-0.5">{chat.lastMessage || "Sent an inquiry…"}</p>
                </div>
                <FiClock size={9} className="text-muted-foreground/30 shrink-0" />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER
═══════════════════════════════════════════════════════════════ */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 sm:mb-4">
      <h2 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</h2>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LUXE SECTION WRAPPER
═══════════════════════════════════════════════════════════════ */
interface LuxeSectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  accentColor: string;
  bgGradient: string;
}

function LuxeSection({ title, subtitle, icon, children, href, accentColor, bgGradient }: LuxeSectionProps) {
  return (
    <section
      style={{ "--accent": accentColor } as React.CSSProperties}
      className={`relative group p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-gradient-to-br ${bgGradient} backdrop-blur-2xl border border-border/50 shadow-sm transition-all duration-500 hover:shadow-lg hover:border-[var(--accent)]/25`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-background/80 rounded-xl flex items-center justify-center shadow-sm border border-border text-foreground/60 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)] transition-all duration-500 shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tighter text-foreground leading-none">{title}</h2>
            {subtitle && <p className="text-[10px] text-muted-foreground font-medium mt-0.5 hidden sm:block">{subtitle}</p>}
          </div>
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
            <FiArrowRight size={11} />
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}