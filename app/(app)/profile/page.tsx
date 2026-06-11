"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMail, FiShield, FiMessageSquare, FiHeart,
  FiLogOut, FiPackage, FiArrowRight, FiEdit2,
  FiZap, FiUser, FiStar, FiTrendingUp,
} from "react-icons/fi";

type User = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
};

type Ad = {
  _id: string;
  title: string;
  price: number;
  images: string[];
  category?: string;
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const userRes = await api.get("/auth/me");
        if (!mounted) return;
        setUser(userRes.data);
        if (userRes.data.role === "seller") {
          const adsRes = await api.get("/ads/my");
          if (!mounted) return;
          setAds(adsRes.data);
        }
      } catch (err: any) {
        console.error("Profile Error:", err?.response?.status);
        if (mounted) { setUser(null); setAds([]); }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const handleLogout = () => {
    api.post("/auth/logout").then(() => { window.location.href = "/"; });
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
        />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Loading Profile</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground font-bold">Session expired. <Link href="/login" className="text-primary underline">Log in again</Link></p>
    </div>
  );

  const initial = user.name.charAt(0).toUpperCase();
  const isSeller = user.role === "seller";

  const roleConfig = {
    buyer:  { label: "Buyer",  from: "from-[hsl(var(--luxury-violet))]", to: "to-primary",   badge: "bg-primary/10 text-primary border-primary/20" },
    seller: { label: "Seller", from: "from-primary",                      to: "to-sky-500",   badge: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
    admin:  { label: "Admin",  from: "from-rose-500",                     to: "to-orange-500",badge: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  };
  const rc = roleConfig[user.role];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">

      {/* ── Ambient BG ── */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-[hsl(var(--luxury-violet)/0.07)] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[hsl(var(--luxury-rose)/0.06)] rounded-full blur-[140px] pointer-events-none" />

      {/* ── Cinematic Cover Banner ── */}
      <div className={`relative h-64 md:h-80 bg-gradient-to-br ${rc.from} ${rc.to} overflow-hidden`}>
        <div className="absolute inset-0 bg-dot-grid opacity-20" />
        <div className="absolute inset-0 bg-black/20" />
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8  w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        {/* Subtle pattern lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 relative z-10">

        {/* ── Identity Card (overlaps the banner) ── */}
        <motion.div
          variants={fadeUp} custom={0} initial="hidden" animate="show"
          className="-mt-20 md:-mt-24 bg-card/60 backdrop-blur-3xl border border-border/60 rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-black/10 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={`w-28 h-28 md:w-36 md:h-36 rounded-[2rem] bg-gradient-to-br ${rc.from} ${rc.to} flex items-center justify-center text-5xl font-black text-white shadow-2xl ring-4 ring-background`}>
                {initial}
              </div>
              <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-background">
                <FiShield size={14} className="text-white" />
              </div>
            </div>

            {/* Name / Email / Role */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">{user.name}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${rc.badge}`}>
                  {rc.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5"><FiMail size={13} />{user.email}</span>
                <span className="flex items-center gap-1.5 text-green-500"><FiShield size={13} />Verified</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 shrink-0">
              {isSeller && (
                <StatBadge value={ads.length} label="Listings" icon={<FiPackage size={14}/>} />
              )}
              <StatBadge value="4.9" label="Rating" icon={<FiStar size={14}/>} />
              <StatBadge value="100%" label="Trust" icon={<FiShield size={14}/>} />
            </div>
          </div>
        </motion.div>

        {/* ── Quick Actions Grid ── */}
        <motion.div
          variants={fadeUp} custom={1} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <QuickAction
            href="/chats"
            icon={<FiMessageSquare size={22} />}
            label="Messages"
            desc="Chat with buyers & sellers"
            gradient="from-primary/10 to-[hsl(var(--luxury-violet)/0.1)]"
            iconColor="text-primary"
            hoverBg="hover:from-primary hover:to-[hsl(var(--luxury-violet))]"
            index={0}
          />
          <QuickAction
            href="/saved"
            icon={<FiHeart size={22} />}
            label="Wishlist"
            desc="Your saved collection"
            gradient="from-[hsl(var(--luxury-rose)/0.1)] to-rose-500/5"
            iconColor="text-[hsl(var(--luxury-rose))]"
            hoverBg="hover:from-[hsl(var(--luxury-rose))] hover:to-rose-600"
            index={1}
          />
          <button onClick={handleLogout} className="w-full text-left">
            <QuickAction
              icon={<FiLogOut size={22} />}
              label="Sign Out"
              desc="Securely close session"
              gradient="from-slate-500/10 to-slate-400/5"
              iconColor="text-slate-500"
              hoverBg="hover:from-slate-800 hover:to-slate-700"
              index={2}
              isButton
            />
          </button>
        </motion.div>

        {/* ── Account Info Panel ── */}
        <motion.div
          variants={fadeUp} custom={2} initial="hidden" animate="show"
          className="dashboard-card p-6 md:p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FiUser size={16} />
              </div>
              <h2 className="font-black tracking-tight text-lg">Account Details</h2>
            </div>
            <Link
              href="/profile/edit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <FiEdit2 size={12} /> Edit
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Full Name",  value: user.name,  icon: <FiUser size={14}/> },
              { label: "Email",      value: user.email, icon: <FiMail size={14}/> },
              { label: "Account Type", value: `${rc.label} Account`, icon: <FiShield size={14}/> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-background/50 rounded-2xl px-5 py-4 border border-border/50 flex items-start gap-3">
                <span className="text-primary mt-0.5 shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">{label}</p>
                  <p className="font-bold text-sm text-foreground truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Seller Listings Section ── */}
        {isSeller && (
          <motion.section
            variants={fadeUp} custom={3} initial="hidden" animate="show"
            className="space-y-6"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                  <FiTrendingUp size={16} />
                </div>
                <div>
                  <h2 className="font-black tracking-tight text-lg leading-none">Active Listings</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                    {ads.length} {ads.length === 1 ? "listing" : "listings"} published
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/seller"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-border text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:border-transparent transition-all"
              >
                Manage All <FiArrowRight size={12} />
              </Link>
            </div>

            {ads.length === 0 ? (
              <div className="dashboard-card py-20 text-center">
                <div className="w-16 h-16 bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <FiPackage size={28} />
                </div>
                <p className="font-black text-muted-foreground uppercase text-[10px] tracking-[0.2em] mb-4">No listings yet</p>
                <Link
                  href="/create-ad"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-105 transition-transform"
                >
                  <FiZap size={14} /> Create First Listing
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence>
                  {ads.map((ad, i) => (
                    <motion.div
                      key={ad._id}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      whileHover={{ y: -6 }}
                      className="dashboard-card overflow-hidden group cursor-pointer"
                    >
                      {/* Image */}
                      <div className="relative h-44 bg-muted overflow-hidden rounded-t-[calc(var(--radius)-2px)]">
                        {ad.images?.[0] ? (
                          <Image
                            src={ad.images[0]}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            alt={ad.title}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <FiPackage size={32} />
                          </div>
                        )}
                        {ad.category && (
                          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-md text-white rounded-lg text-[9px] font-black uppercase tracking-widest">
                            {ad.category}
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-1">
                        <p className="text-xl font-black tracking-tighter text-primary leading-none">
                          ₹{ad.price.toLocaleString("en-IN")}
                        </p>
                        <h3 className="font-bold text-foreground truncate text-sm">{ad.title}</h3>
                        <div className="flex items-center justify-between pt-2">
                          <Link
                            href={`/dashboard/seller/edit/${ad._id}`}
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                          >
                            <FiEdit2 size={11} /> Edit Listing
                          </Link>
                          <FiArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors group-hover:translate-x-1 transform duration-300" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.section>
        )}

        {/* ── Buyer-only CTA banner ── */}
        {!isSeller && (
          <motion.div
            variants={fadeUp} custom={3} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-[hsl(var(--luxury-violet))] to-[hsl(var(--luxury-violet))] p-8 md:p-10 text-white shadow-2xl"
          >
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-6 -bottom-6  w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-2">Unlock more</p>
                <h3 className="text-2xl font-black tracking-tight leading-tight">Want to sell on Bazaari?</h3>
                <p className="mt-2 text-white/70 text-sm font-medium max-w-sm">
                  Start listing your items and reach thousands of buyers near you instantly.
                </p>
              </div>
              <Link
                href="/create-ad"
                className="shrink-0 flex items-center gap-2 px-7 py-4 bg-white text-primary rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <FiZap size={14} /> Start Selling
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Stat Badge ── */
function StatBadge({ value, label, icon }: { value: string | number; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-primary">{icon}</div>
      <p className="text-xl font-black tracking-tight leading-none">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Quick Action Tile ── */
interface QuickActionProps {
  href?: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  gradient: string;
  iconColor: string;
  hoverBg: string;
  index: number;
  isButton?: boolean;
}

function QuickAction({ href, icon, label, desc, gradient, iconColor, hoverBg, isButton }: QuickActionProps) {
  const inner = (
    <div
      className={`group w-full text-left p-6 rounded-[2rem] bg-gradient-to-br ${gradient} ${hoverBg} border border-border/50 hover:border-transparent transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 cursor-pointer`}
    >
      <div className={`w-12 h-12 rounded-2xl bg-background/60 backdrop-blur flex items-center justify-center mb-5 ${iconColor} group-hover:bg-white/20 group-hover:text-white transition-all duration-300 shadow-sm`}>
        {icon}
      </div>
      <h3 className="text-base font-black tracking-tight text-foreground group-hover:text-white transition-colors">{label}</h3>
      <p className="text-sm text-muted-foreground font-medium mt-1 group-hover:text-white/70 transition-colors">{desc}</p>
    </div>
  );

  if (isButton || !href) return inner;
  return <Link href={href}>{inner}</Link>;
}