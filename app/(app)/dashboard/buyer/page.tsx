"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";
import AdGrid from "@/components/ads/AdGrid";

import {
  FiHeart, FiStar, FiMonitor, FiTruck, FiHome, 
  FiShoppingBag, FiSearch, FiZap, FiNavigation, FiArrowRight, FiMessageCircle

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
    <div className="min-h-screen bg-background text-foreground selection:bg-blue-100/30">
      
      <div className="max-w-[1700px] mx-auto grid grid-cols-12 gap-10 px-8 py-12">
        
        {/* --- 🏰 SIDEBAR --- */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-12 flex flex-col h-[calc(100vh-6rem)]">
            <div className="flex items-center gap-3 px-2 mb-8 shrink-0">
              <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black italic shadow-2xl shadow-primary/20">B</div>
              <span className="text-2xl font-black tracking-tighter uppercase text-foreground">Bazaari</span>
            </div>

            <div className="flex-1 min-h-0 bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border/50 flex items-center justify-between shrink-0">
                <h3 className="font-black text-lg text-foreground tracking-tight">Recent Chats</h3>
                <Link href="/messages" className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                  View All
                </Link>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {chats.length > 0 ? chats.map((chat) => {
                  const otherUser = chat.buyer?._id === userId ? chat.seller : chat.buyer;
                  return (
                    <Link key={chat._id} href={`/chats/${chat._id}`}>
                      <div className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">
                          {otherUser?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-foreground text-sm truncate">{otherUser?.name || "User"}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground truncate font-medium">{chat.lastMessage || "Started a conversation"}</p>
                          {chat.adId && (
                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1 truncate">
                              Ad: {chat.adId.title}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                }) : (
                  <div className="py-20 text-center">
                    <FiMessageCircle className="mx-auto text-3xl text-slate-200 mb-3" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No messages yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* --- 🚀 MAIN CONTENT --- */}
        <main className="col-span-12 lg:col-span-9 space-y-12">
          
          {/* 🔍 THE BOLD SEARCH BAR */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[2.5rem] blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative flex flex-col xl:flex-row items-center justify-between gap-8 bg-card p-10 rounded-[2.5rem] border-2 border-primary shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.05)]">
              <div>
                <h1 className="text-5xl font-black tracking-tighter text-foreground">The Curation.</h1>
                <p className="text-muted-foreground font-medium mt-2">Premium deals tailored for your lifestyle.</p>
                
                <Link href="/price-estimator" className="inline-flex mt-6 group items-center gap-2 bg-blue-600 hover:bg-black text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-blue-500/20">
                  <FiZap className="group-hover:text-amber-400 transition-colors" />
                  <span className="font-bold text-sm">Smart Price Check</span>
                </Link>
              </div>
              <div className="relative w-full xl:max-w-md">
                <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-foreground" size={22} />
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-muted/50 border-2 border-primary outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* 🌟 SECTIONS WITH SHADOW EFFECTS */}
          <div className="space-y-12">
            
            <Section 
              title="Daily Highlights"
               href="/dashboard/products" 
              icon={<FiStar className="text-blue-600" fill="currentColor" />} 
              bgColor="bg-blue-50/50" 
              borderColor="border-blue-100"
            >
              <AdGrid search={search} layout="horizontal" hoverEffect="lift" />
            </Section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              <Section 
                title="Wishlist" 
                href="/saved"
                icon={<FiHeart className="text-rose-500" fill="currentColor" />} 
                bgColor="bg-rose-50/50" 
                borderColor="border-rose-100"
              >
                <AdGrid search={search} type="saved" limit={2} hoverEffect="lift" />
              </Section>

              <Section 
                title="Nearby" 
                href="/nearby"
                icon={<FiNavigation className="text-emerald-600" />} 
                bgColor="bg-emerald-50/50" 
                borderColor="border-emerald-100"
              >
                <AdGrid search={search} type="nearby" limit={2} hoverEffect="lift" />
              </Section>
            </div>

            <Section 
              title="Hyper Trending" 
              href="/dashboard/products"
              icon={<FiZap className="text-amber-500" fill="currentColor" />} 
              bgColor="bg-amber-50/50" 
              borderColor="border-amber-100"
            >
              <AdGrid search={search} type="trending" hoverEffect="lift" />
            </Section>
          </div>

        </main>
      </div>
    </div>
  );
}

/* --- 🧊 ENHANCED SECTION COMPONENT --- */
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
  href?: string;
}

function Section({ title, icon, bgColor, borderColor, children, href }: SectionProps) {
  return (
    <section className={`relative group p-10 rounded-[3.5rem] ${bgColor} border ${borderColor} shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_40px_80px_rgba(0,0,0,0.3)] hover:bg-card`}>
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center shadow-sm border border-border group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-foreground">{title}</h2>
        </div>
        {href ? (
          <Link href={href}>
            <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2">
              See All <FiArrowRight />
            </button>
          </Link>
        ) : (
          <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2">
            See All <FiArrowRight />
          </button>
        )}
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}