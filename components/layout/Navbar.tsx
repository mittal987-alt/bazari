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
      
      if (res.ok && data.category) {
        router.push(`/nearby?category=${encodeURIComponent(data.category)}`);
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

  return (
    <header 
      className={clsx(
        "sticky top-0 z-[100] transition-all duration-500 w-full px-8 py-4",
        scrolled 
          ? "bg-[#020617]/85 backdrop-blur-xl border-b border-white/20 shadow-2xl" 
          : "bg-[#020617]/90 backdrop-blur-md border-b border-white/5"
      )}
    >
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-10">
        
        {/* --- BRANDING --- */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all group-hover:scale-110">
            B
          </div>
          <span className="hidden md:block text-2xl font-black tracking-tighter uppercase text-white">
            Bazaari
          </span>
        </Link>

        {/* --- REFINED SEARCH BAR --- */}
        <form
          onSubmit={(e) => { e.preventDefault(); router.push(`/nearby?search=${search}`); }}
          className="hidden lg:flex flex-1 max-w-lg items-center relative bg-white/5 border border-white/10 rounded-2xl px-5 py-2.5 transition-all focus-within:border-blue-500 focus-within:bg-white/10"
        >
          <FiSearch className="text-slate-400 group-focus-within:text-blue-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the marketplace..."
            className="bg-transparent outline-none text-sm w-full ml-3 pr-16 text-white placeholder-slate-500 font-medium"
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
             className="absolute right-12 text-slate-400 hover:text-blue-400 transition-colors"
             title="Search by Object Image"
          >
             {isAnalyzing ? <FiLoader size={18} className="animate-spin" /> : <FiCamera size={18} />}
          </button>
          <kbd className="hidden xl:block absolute right-3 text-[10px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded">⌘ K</kbd>
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
                  active ? "text-white" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                {active && (
                  <motion.div 
                    layoutId="navbar-pill"
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl"
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
          
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            {user ? (
              <>
                <Link
                  href="/dashboard/seller"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
                >
                  <FiPlus size={16} />
                  List Ad
                </Link>
                <button 
                  onClick={() => api.post("/auth/logout").then(clearUser)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <FiLogOut size={18} />
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-white text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                Join
              </Link>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="xl:hidden text-white p-2">
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
            className="xl:hidden mt-4 rounded-3xl bg-[#070e20] border border-white/10 p-6 space-y-4"
          >
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-4 text-white/70 font-black text-xs uppercase tracking-widest p-2">
                <DynamicIcon iconName={item.icon} /> {item.title}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}