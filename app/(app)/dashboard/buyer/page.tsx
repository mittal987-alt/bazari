"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";
import AdGrid from "@/components/ads/AdGrid";

import {
  FiHeart, FiStar, FiSearch, FiZap, FiNavigation, FiArrowRight, FiMessageCircle,
  FiCompass, FiLayers
} from "react-icons/fi";

export default function BuyerDashboard() {
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<any[]>([]);
  const { user } = useUserStore();
  const userId = user?.id;

  useEffect(() => {
    const fetchBuyerChats = async () => {
      try {
        const chatsRes = await api.get("/chats");
        const buyerChats = chatsRes.data.filter((c: any) => c.buyer?._id === userId);
        setChats(buyerChats);
      } catch (err) { console.error(err); }
    };
    fetchBuyerChats();

    if (userId) {
      socket.connect();
      socket.emit("register_user", userId);

      const handleNewNotification = (data: any) => {
        setChats((prev) => {
          const chatExists = prev.find((c) => c._id === data.chatId);
          if (chatExists) {
            const updatedChats = prev.map((c) => {
              if (c._id === data.chatId) {
                return { ...c, lastMessage: data.text };
              }
              return c;
            });
            const chatToMove = updatedChats.find(c => c._id === data.chatId);
            const otherChats = updatedChats.filter(c => c._id !== data.chatId);
            return [chatToMove!, ...otherChats];
          } else {
            api.get("/chats").then(res => {
              const buyerChats = res.data.filter((c: any) => c.buyer?._id === userId);
              setChats(buyerChats);
            }).catch(console.error);
            return prev;
          }
        });
      };

      socket.on("new_notification", handleNewNotification);

      return () => {
        socket.off("new_notification", handleNewNotification);
      };
    }
  }, [userId]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40" />
      
      {/* Dynamic Background Washes */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[hsl(var(--luxury-violet)/0.08)] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[hsl(var(--luxury-rose)/0.08)] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1750px] mx-auto grid grid-cols-12 gap-8 px-10 py-12 relative z-10">
        
        {/* --- 🏰 COMPACT SIDEBAR --- */}
        <aside className="hidden lg:block lg:col-span-3">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="sticky top-10 flex flex-col h-[calc(100vh-6rem)]"
          >
            <div className="flex items-center gap-4 px-4 mb-6 shrink-0 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic shadow-2xl shadow-primary/30 group-hover:scale-110 transition-transform">B</div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter uppercase leading-none">Lounge<span className="text-primary space-x-0">.</span></span>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Premium Access</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden flex flex-col hover:border-primary/20 transition-all duration-500">
              <div className="p-6 border-b border-border/50 flex items-center justify-between shrink-0">
                <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-foreground">Inquiries</h3>
                <Link href="/messages" className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary transition-colors hover:text-white">
                  <FiArrowRight size={12} />
                </Link>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {chats.length > 0 ? chats.map((chat) => {
                    const otherUser = chat.buyer?._id === userId ? chat.seller : chat.buyer;
                    return (
                      <motion.div layout key={chat._id}>
                        <Link href={`/chats/${chat._id}`}>
                          <div className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-card/80 transition-all cursor-pointer border border-transparent hover:border-border hover:shadow-xl">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/10 group-hover:scale-105 transition-transform">
                              {otherUser?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-foreground text-xs truncate tracking-tight">{otherUser?.name || "Member"}</h4>
                              <p className="text-[9px] text-muted-foreground truncate font-medium mt-0.5">{chat.lastMessage || "Requested access..."}</p>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  }) : (
                    <div className="py-16 text-center px-4">
                      <FiMessageCircle className="mx-auto text-muted-foreground/30 mb-4" size={20} />
                      <p className="text-muted-foreground font-black uppercase text-[8px] tracking-[0.2em]">No Active Chats</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </aside>

        {/* --- 🚀 REFINED DISCOVERY HUB --- */}
        <main className="col-span-12 lg:col-span-9 space-y-8">
          
          {/* COMPACT HERO */}
          <div className="relative">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-center justify-between gap-10 bg-gradient-to-br from-card/40 to-card/10 backdrop-blur-3xl p-8 rounded-[3rem] border border-border/50 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all duration-700"
            >
              <div className="relative z-10 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/10 mb-4">
                  <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Discovery Mode</span>
                </div>
                <h1 className="text-4xl xl:text-5xl font-black tracking-tighter text-foreground leading-[0.95]">
                  Luxe<span className="text-primary italic">Lounge</span>.
                </h1>
                <p className="text-muted-foreground font-medium mt-4 max-w-sm text-sm leading-relaxed">
                  Elevated marketplace curation. Vetted for the sophisticated buyer.
                </p>
                
                <div className="flex flex-wrap items-center gap-4 mt-6 justify-center md:justify-start">
                  <Link href="/price-estimator" className="group flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl transition-all shadow-xl shadow-primary/35 hover:scale-105 active:scale-95">
                    <FiZap className="text-amber-300" size={16} />
                    <span className="font-black text-[9px] uppercase tracking-widest">Smart Tool</span>
                  </Link>
                  <button className="flex items-center gap-2 bg-muted/40 hover:bg-muted/80 text-foreground px-6 py-2.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border border-border">
                    <FiLayers size={16} />
                    Explore
                  </button>
                </div>
              </div>

              <div className="relative w-full xl:max-w-md shrink-0">
                <div className="relative bg-background/50 backdrop-blur-2xl p-2 rounded-2xl border border-border/50 shadow-xl group-focus-within:border-primary transition-all">
                  <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="Search the curation..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 rounded-xl bg-background border-none outline-none focus:ring-0 font-black text-sm text-foreground placeholder:text-muted-foreground/50 transition-all uppercase tracking-tight"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* 🌟 BENTO DISCOVERY GRID with UNIQUE BACKGROUNDS */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* DAILY HIGHLIGHTS - INDIGO WASH */}
            <div className="xl:col-span-8">
              <LuxeSection 
                title="Daily Highlights"
                href="/nearby" 
                icon={<FiStar size={18} />} 
                accentColor="hsl(var(--primary))"
                bgGradient="from-primary/5 via-card/40 to-card/10"
              >
                <div className="mt-4">
                  <AdGrid search={search} layout="horizontal" hoverEffect="lift" limit={4} compact />
                </div>
              </LuxeSection>
            </div>

            {/* QUICK ACTIONS / ALERTS - VIOLET GLOW */}
            <div className="xl:col-span-4 space-y-10">
              <div className="bg-gradient-to-br from-primary via-[hsl(var(--luxury-violet))] to-[hsl(var(--luxury-violet))] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group h-full flex flex-col justify-center">
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-6 border border-white/20">
                    <FiCompass className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight leading-tight">Need a perfect deal?</h3>
                  <p className="mt-4 text-white/70 text-xs font-medium leading-relaxed">Let our AI agent scan thousands of local listings for you.</p>
                  <button className="mt-6 w-full py-3 bg-white text-primary rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-white/90 transition-all">Start Scanning</button>
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              </div>
            </div>

            {/* WISHLIST - ROSE WASH */}
            <div className="xl:col-span-6">
              <LuxeSection 
                title="Your Wishlist" 
                href="/saved"
                icon={<FiHeart size={18} />} 
                accentColor="hsl(var(--luxury-rose))"
                bgGradient="from-[hsl(var(--luxury-rose)/0.08)] via-card/40 to-card/10"
              >
                <div className="mt-4">
                   <AdGrid search={search} type="saved" limit={2} hoverEffect="lift" compact />
                </div>
              </LuxeSection>
            </div>

            {/* NEARBY - VIOLET WASH */}
            <div className="xl:col-span-6">
              <LuxeSection 
                title="Around You" 
                href="/nearby"
                icon={<FiNavigation size={18} />} 
                accentColor="hsl(var(--luxury-violet))"
                bgGradient="from-[hsl(var(--luxury-violet)/0.08)] via-card/40 to-card/10"
              >
                <div className="mt-4">
                   <AdGrid search={search} type="nearby" limit={2} hoverEffect="lift" compact />
                </div>
              </LuxeSection>
            </div>

            {/* TRENDING - BRAND WASH */}
            <div className="xl:col-span-12">
              <LuxeSection 
                title="Hyper Trending" 
                href="/nearby?sort=trending"
                icon={<FiZap size={18} />} 
                accentColor="hsl(var(--primary))"
                bgGradient="from-primary/5 via-card/30 to-card/5"
              >
                <div className="mt-4">
                  <AdGrid search={search} type="trending" hoverEffect="lift" limit={8} compact />
                </div>
              </LuxeSection>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

/* --- 🧊 REFINED LUXE SECTION COMPONENT --- */
interface LuxeSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  accentColor: string;
  bgGradient: string;
}

function LuxeSection({ title, icon, children, href, accentColor, bgGradient }: LuxeSectionProps) {
  return (
    <section 
      style={{ '--accent': accentColor } as any}
      className={`relative group p-6 rounded-[2.5rem] bg-gradient-to-br ${bgGradient} backdrop-blur-3xl border border-border/50 shadow-sm transition-all duration-700 hover:shadow-2xl hover:border-[var(--accent)]/30`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-background rounded-2xl flex items-center justify-center shadow-lg border border-border group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-500 text-foreground/50">
            {icon}
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tighter text-foreground leading-none">{title}</h2>
            <div className="h-0.5 w-0 bg-[var(--accent)] mt-1 rounded-full group-hover:w-full transition-all duration-700 opacity-50" />
          </div>
        </div>
        {href && (
          <Link href={href} className="w-8 h-8 bg-background rounded-xl flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white border border-border transition-all">
            <FiArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}