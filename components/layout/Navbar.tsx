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

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
  const isChatRoom = pathname?.match(/^\/chats\/[a-zA-Z0-9_-]+$/);
  if (isChatRoom) return null;

  return (
    <header 
      className={clsx(
        "sticky top-0 z-[100] transition-all duration-500 w-full px-4 md:px-8 py-3 md:py-4",
        scrolled 
          ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-2xl" 
          : "bg-background/90 backdrop-blur-md border-b border-border/50"
      )}
    >
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-10">
        
        {/* --- BRANDING --- */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic shadow-2xl shadow-primary/20 transition-all group-hover:scale-110">
            B
          </div>
          <span className="hidden md:block text-2xl font-black tracking-tighter uppercase text-foreground">
            Bazaari
          </span>
        </Link>

        {/* --- REFINED SEARCH BAR --- */}
        <form
          onSubmit={(e) => { e.preventDefault(); router.push(`/nearby?search=${search}`); }}
          className="hidden lg:flex flex-1 max-w-lg items-center relative bg-muted/30 border border-input rounded-2xl px-5 py-2.5 transition-all focus-within:border-primary focus-within:bg-muted/50"
        >
          <FiSearch className="text-muted-foreground group-focus-within:text-primary" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the marketplace..."
            className="bg-transparent outline-none text-sm w-full ml-3 pr-16 text-foreground placeholder-muted-foreground font-medium"
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
             className="absolute right-12 text-muted-foreground hover:text-primary transition-colors"
             title="Search by Object Image"
          >
             {isAnalyzing ? <FiLoader size={18} className="animate-spin" /> : <FiCamera size={18} />}
          </button>
          <kbd className="hidden xl:block absolute right-3 text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded">⌘ K</kbd>
        </form>

        {/* --- NAVIGATION --- */}
        <nav className="hidden xl:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "relative px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {active && (
                  <motion.div 
                    layoutId="navbar-pill"
                    className="absolute inset-0 bg-muted border border-border rounded-xl"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                   <DynamicIcon iconName={item.icon} />
                   {item.title}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* --- ACTIONS --- */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-4 border-l border-white/10">
            {user ? (
              <>
                <Link
                  href="/dashboard/seller"
                  className="bg-primary hover:bg-primary/90 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center gap-2"
                >
                  <FiPlus size={16} />
                  <span className="hidden sm:inline">List Ad</span>
                </Link>
                <button 
                  onClick={() => api.post("/auth/logout").then(clearUser)}
                  className="p-2.5 rounded-xl bg-muted border border-border text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                >
                  <FiLogOut size={18} />
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-primary text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20">
                Join
              </Link>
            )}

          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="xl:hidden text-foreground p-2">
            {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden mt-4 rounded-3xl bg-card border border-border p-6 space-y-4 shadow-xl"
          >
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-4 text-muted-foreground hover:text-foreground font-black text-xs uppercase tracking-widest p-2 transition-colors">
                <DynamicIcon iconName={item.icon} /> {item.title}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}