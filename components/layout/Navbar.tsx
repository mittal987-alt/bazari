"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store/userStore";
import api from "@/lib/api";
import ThemeToggle from "@/components/common/ThemeToggle";
import DynamicIcon from "@/components/common/DynamicIcon";

const FiMenu = dynamic(() => import("react-icons/fi").then((m) => m.FiMenu), { ssr: false });
const FiX = dynamic(() => import("react-icons/fi").then((m) => m.FiX), { ssr: false });
const FiSearch = dynamic(() => import("react-icons/fi").then((m) => m.FiSearch), { ssr: false });
const FiBell = dynamic(() => import("react-icons/fi").then((m) => m.FiBell), { ssr: false });
const FiLogOut = dynamic(() => import("react-icons/fi").then((m) => m.FiLogOut), { ssr: false });
const FiPlus = dynamic(() => import("react-icons/fi").then((m) => m.FiPlus), { ssr: false });
const FiCamera = dynamic(() => import("react-icons/fi").then((m) => m.FiCamera), { ssr: false });
const FiLoader = dynamic(() => import("react-icons/fi").then((m) => m.FiLoader), { ssr: false });
const FiMapPin = dynamic(() => import("react-icons/fi").then((m) => m.FiMapPin), { ssr: false });
const FiChevronDown = dynamic(() => import("react-icons/fi").then((m) => m.FiChevronDown), { ssr: false });
const FiFilter = dynamic(() => import("react-icons/fi").then((m) => m.FiFilter), { ssr: false });
const FiArrowRight = dynamic(() => import("react-icons/fi").then((m) => m.FiArrowRight), { ssr: false });
const FiUser = dynamic(() => import("react-icons/fi").then((m) => m.FiUser), { ssr: false });

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search filter dropdown state
  const [searchFocused, setSearchFocused] = useState(false);
  const [city, setCity] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { title: "Lounge", href: "/dashboard/buyer", icon: "FiLayout" },
    { title: "Wishlist", href: "/saved", icon: "FiHeart" },
    { title: "Messages", href: "/messages", icon: "FiMessageSquare" },
    { title: "Budget AI", href: "/budget-shopping", icon: "FiZap" },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok && data.searchQuery) {
        router.push(`/ads?search=${encodeURIComponent(data.searchQuery)}`);
      } else {
        alert(data.message || "Failed to analyze image");
      }
    } catch (err) {
      console.error(err);
      alert("Error recognizing image");
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (city) params.set("city", city);
    if (min) params.set("min", min);
    if (max) params.set("max", max);
    if (sort) params.set("sort", sort);
    setSearchFocused(false);
    setMobileOpen(false);
    router.push(`/ads?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setCity("");
    setMin("");
    setMax("");
    setSort("");
  };

  const hasFilters = city || min || max || sort;

  const isChatRoom = pathname?.match(/^\/chats\/[a-zA-Z0-9_-]+$/);
  if (isChatRoom) return null;

  return (
    <>
      <header 
        className={clsx(
          "sticky top-0 z-[100] transition-all duration-500 w-full px-4 sm:px-6 lg:px-8 py-3",
          scrolled 
            ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-sm" 
            : "bg-background/90 backdrop-blur-md border-b border-border/50"
        )}
      >
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4 md:gap-8 lg:gap-10">
          
          {/* --- BRANDING --- */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-primary/20 transition-all group-hover:scale-105">
              B
            </div>
            <span className="hidden md:block text-xl sm:text-2xl font-black tracking-tighter uppercase text-foreground">
              Bazaari
            </span>
          </Link>

          {/* --- DESKTOP SEARCH BAR WITH FILTER DROPDOWN --- */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl relative mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className={clsx(
                "flex w-full items-center relative bg-muted/40 border rounded-2xl px-4 sm:px-5 py-2.5 transition-all duration-300",
                searchFocused
                  ? "border-primary bg-muted/60 shadow-lg shadow-primary/10 rounded-b-none rounded-t-2xl"
                  : "border-border hover:border-primary/50 focus-within:border-primary focus-within:bg-muted/60"
              )}
            >
              <FiSearch className="text-muted-foreground" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search the marketplace..."
                className="bg-transparent outline-none text-sm w-full ml-3 pr-14 text-foreground placeholder-muted-foreground font-medium"
              />
              <input 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 ref={fileInputRef}
                 onChange={handleImageUpload}
              />
              <button 
                 type="button"
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isAnalyzing}
                 className="absolute right-10 text-muted-foreground hover:text-primary transition-colors"
                 title="Search by Object Image"
              >
                 {isAnalyzing ? <FiLoader size={16} className="animate-spin" /> : <FiCamera size={16} />}
              </button>
              <kbd className="hidden lg:block absolute right-3 text-[9px] font-black uppercase text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded">⌘ K</kbd>
            </form>

            {/* --- DESKTOP FILTER DROPDOWN PANEL --- */}
            <AnimatePresence>
              {searchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{ originY: 0 }}
                  className="absolute top-full left-0 right-0 z-50 bg-background border border-primary/30 border-t-0 rounded-b-2xl shadow-xl shadow-primary/10 p-5 space-y-5"
                >
                  {/* Filter header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <FiFilter size={14} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Filters</span>
                      {hasFilters && (
                        <span className="bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                          {[city, min, max, sort].filter(Boolean).length}
                        </span>
                      )}
                    </div>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* City filter */}
                    <div className="relative col-span-2">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <FiMapPin size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="City or area..."
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-primary focus:bg-muted/60 transition-all placeholder:text-muted-foreground/60 text-foreground"
                      />
                    </div>

                    {/* Price range */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Budget Range (₹)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={min}
                          onChange={(e) => setMin(e.target.value)}
                          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-primary focus:bg-muted/60 transition-all placeholder:text-muted-foreground/60 text-foreground"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={max}
                          onChange={(e) => setMax(e.target.value)}
                          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-primary focus:bg-muted/60 transition-all placeholder:text-muted-foreground/60 text-foreground"
                        />
                      </div>
                    </div>

                    {/* Sort */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sort By</label>
                      <div className="relative">
                        <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-primary focus:bg-muted/60 transition-all appearance-none text-foreground"
                        >
                          <option value="">Recently Added</option>
                          <option value="price_low">Price: Low to High</option>
                          <option value="price_high">Price: High to Low</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Apply button */}
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    Apply & Search
                    <FiArrowRight size={13} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --- MOBILE SEARCH ICON (if screen is tiny) --- */}
          <div className="flex md:hidden flex-1 justify-end mr-2">
            <button 
              onClick={() => setMobileOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 text-foreground hover:bg-muted transition-colors border border-border/50"
            >
              <FiSearch size={18} />
            </button>
          </div>

          {/* --- NAVIGATION (Desktop) --- */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "relative px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {active && (
                    <motion.div 
                      layoutId="navbar-pill"
                      className="absolute inset-0 bg-muted border border-border rounded-xl"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                     <DynamicIcon iconName={item.icon} className="text-current" />
                     {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* --- ACTIONS --- */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 pl-0 sm:pl-4 sm:border-l sm:border-border/60">
              {user ? (
                <>
                  <Link
                    href="/dashboard/seller"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center gap-1.5 sm:gap-2"
                  >
                    <FiPlus size={16} />
                    <span className="hidden sm:inline">Sell</span>
                  </Link>
                  <Link
                    href="/profile"
                    title={user.name}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white text-[10px] sm:text-[11px] font-black uppercase flex items-center justify-center shadow-md hover:scale-105 transition-all border border-primary/20 shrink-0"
                  >
                    {user.name
                      ? user.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n: string) => n[0])
                          .join("")
                      : <FiUser size={16} />}
                  </Link>
                </>
              ) : (
                <Link href="/login" className="bg-primary text-primary-foreground px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20 active:scale-95">
                  Join
                </Link>
              )}

            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileOpen(true)} 
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border text-foreground shadow-sm shrink-0"
            >
              <FiMenu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* --- MOBILE FULL-SCREEN OVERLAY MENU --- */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-80 bg-card border-l border-border shadow-2xl z-[101] lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border bg-muted/20">
                <span className="text-sm font-black uppercase tracking-widest text-foreground">Menu</span>
                <button 
                  onClick={() => setMobileOpen(false)}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8">
                
                {/* Mobile Search & Filters */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <FiSearch size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Search & Filter</span>
                  </div>
                  
                  <div className="relative">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input type="text" placeholder="Search keyword..." value={search} onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/60 transition-all" />
                  </div>
                  
                  <div className="relative">
                    <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input type="text" placeholder="City or area..." value={city} onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/60 transition-all" />
                  </div>
                  
                  <div className="flex gap-3">
                    <input type="number" placeholder="Min ₹" value={min} onChange={(e) => setMin(e.target.value)}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/60 transition-all" />
                    <input type="number" placeholder="Max ₹" value={max} onChange={(e) => setMax(e.target.value)}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/60 transition-all" />
                  </div>
                  
                  <div className="relative">
                    <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                    <select value={sort} onChange={(e) => setSort(e.target.value)}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-primary text-foreground appearance-none transition-all">
                      <option value="">Recently Added</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                    </select>
                  </div>
                  
                  <button onClick={handleSearchSubmit}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                    Search <FiArrowRight size={14} />
                  </button>
                </div>

                <div className="h-px bg-border/60 w-full" />

                {/* Mobile Navigation Links */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 block pl-2">Navigation</span>
                  {navItems.map((item) => (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        "flex items-center gap-4 font-black text-sm uppercase tracking-widest p-4 rounded-2xl transition-colors",
                        pathname === item.href 
                          ? "bg-primary/10 text-primary" 
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <DynamicIcon iconName={item.icon} className="text-lg" /> {item.title}
                    </Link>
                  ))}
                </div>

              </div>
              
              {/* Mobile Footer Actions */}
              <div className="p-5 sm:p-6 border-t border-border bg-muted/10 space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Theme Preference</span>
                    <ThemeToggle />
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}