"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
  FiPlus, FiEdit3, FiTrash2, FiMessageCircle, FiEye, FiActivity,
  FiArrowUpRight, FiPackage, FiStar, FiSearch, FiClock, FiChevronRight
} from "react-icons/fi";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";

export default function UltraPremiumSellerDashboard() {
  const [ads, setAds] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ revenue: 0, leads: 0, views: 0, rating: 0 });

  const { user } = useUserStore();
  const userId = user?.id;

  const fetchSellerData = async () => {
    try {
      const [adsRes, chatsRes] = await Promise.all([
        api.get("/ads/my"),
        api.get("/chats"),
      ]);

      const adsData = adsRes.data || [];
      const chatsData = chatsRes.data || [];
      setAds(adsData);

      const sellerChats = chatsData.filter((c: any) => c.seller?._id === userId);
      setChats(sellerChats);

      const revenue = adsData.reduce((sum: number, ad: any) => (ad.status === "sold" ? sum + (ad.price || 0) : sum), 0);
      const views = adsData.reduce((sum: number, ad: any) => sum + (ad.views || 0), 0);
      const rating = adsData.length > 0 
        ? adsData.reduce((sum: number, ad: any) => sum + (ad.rating || 0), 0) / adsData.length 
        : 4.9; // Default premium rating if none

      setStats({ revenue, leads: sellerChats.length, views, rating: Number(rating.toFixed(1)) });
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchSellerData();
    socket.connect();
    socket.emit("register_user", userId);
    socket.on("new_notification", fetchSellerData);
    return () => { socket.off("new_notification", fetchSellerData); };
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/ads/${id}`);
      setAds((prev) => prev.filter((ad) => ad._id !== id));
    } catch {
      alert("Error deleting ad");
    }
  };

  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesFilter = filter === "all" || (filter === "active" && ad.status !== "sold") || (filter === "sold" && ad.status === "sold");
      const matchesSearch = (ad.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [ads, filter, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-primary/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40" />
      <div className="relative z-10">
      <div className="bg-card/30 backdrop-blur-xl border-b border-border pt-20 pb-16 relative overflow-hidden">
        {/* Decorative Blur Background */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-0" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
            <div>
              <motion.p 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-3"
              >
                Seller Command Center
              </motion.p>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                Console<span className="text-primary">.</span>
              </h1>
            </div>

            <Link
              href="/create-ad"
              className="group flex items-center justify-center w-full md:w-auto gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-[2rem] transition-all shadow-xl shadow-primary/20 active:scale-95"
            >
              <FiPlus className="text-xl group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-bold tracking-tight">Post New Listing</span>
            </Link>
          </div>

          {/* STATS BENTO GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={<FiActivity />} color="blue" />
            <StatCard label="Leads" value={stats.leads} icon={<FiMessageCircle />} color="indigo" />
            <StatCard label="Views" value={stats.views} icon={<FiEye />} color="emerald" />
            <StatCard label="Rating" value={stats.rating} icon={<FiStar />} color="amber" />
          </div>
        </div>
      </div>

      {/* --- MAIN DASHBOARD BODY --- */}
      <div className="max-w-7xl mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT: LISTINGS (8/12) */}
        <div className="lg:col-span-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
              {["all", "active", "sold"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`relative px-4 sm:px-8 py-2 md:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filter === tab ? "text-white" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {filter === tab && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-[#1A1C21] rounded-xl -z-0" />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory..."
                className="w-full pl-12 pr-5 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredAds.length > 0 ? (
                filteredAds.map((ad) => (
                  <PremiumListingCard key={ad._id} ad={ad} onDelete={handleDelete} />
                ))
              ) : (
                <EmptyState />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT: COMPACT CHATS (4/12) */}
        <div className="lg:col-span-4">
          <div className="sticky top-28 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-2 shadow-sm">
              <div className="p-6 pb-2 flex justify-between items-center">
                <h3 className="font-black text-lg tracking-tight">Recent Inquiries</h3>
                <Link href="/messages" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
              </div>
              
              <div className="space-y-1">
                {chats.length > 0 ? chats.slice(0, 5).map((chat) => (
                  <ChatListItem key={chat._id} chat={chat} currentUserId={userId} />
                )) : (
                  <div className="py-12 text-center text-slate-400 opacity-50">
                    <FiClock className="mx-auto text-2xl mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No messages</p>
                  </div>
                )}
              </div>
            </div>

            {/* UPSELL / TIPS CARD */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Pro Seller Tip</p>
                 <h4 className="text-lg font-bold leading-tight mb-4">Improve your ads with high-quality photos.</h4>
                 <button className="bg-white/10 hover:bg-white/20 transition-colors px-5 py-2 rounded-full text-xs font-bold backdrop-blur-md border border-white/20">Learn More</button>
               </div>
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
);
}

// --- DESIGN COMPONENTS ---

 function StatCard({ label, value, icon, color }: any) {
  const colorMap: any = {
    blue: "from-blue-600/90 to-blue-700 text-white shadow-blue-500/20",
    indigo: "from-indigo-600/90 to-indigo-700 text-white shadow-indigo-500/20",
    emerald: "from-emerald-600/90 to-emerald-700 text-white shadow-emerald-500/20",
    amber: "from-amber-500/90 to-amber-600 text-white shadow-amber-500/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }} 
      className={`relative overflow-hidden bg-gradient-to-br ${colorMap[color]} p-8 rounded-[2.5rem] shadow-2xl transition-all group border border-white/10`}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className={`p-4 rounded-2xl bg-white/10 backdrop-blur-md transition-transform group-hover:rotate-12 duration-300`}>{icon}</div>
          <FiArrowUpRight className="text-white/40 group-hover:text-white transition-colors" />
        </div>
        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black tracking-tighter">{value}</h3>
      </div>
      
      {/* Decorative inner glow */}
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
    </motion.div>
  );
}

function PremiumListingCard({ ad, onDelete }: any) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "spam":
        return { label: "Flagged (Spam)", color: "text-rose-600 bg-rose-50 border-rose-100", icon: <FiActivity className="w-3 h-3" /> };
      case "pending":
        return { label: "Under Review", color: "text-amber-600 bg-amber-50 border-amber-100", icon: <FiClock className="w-3 h-3" /> };
      default:
        return { label: "Active", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: <FiActivity className="w-3 h-3" /> };
    }
  };

  const statusInfo = getStatusInfo(ad.status);

  return (
     <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-card/60 backdrop-blur-md p-5 rounded-[2.5rem] border border-border/50 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8"
    >
      <div className="relative w-full h-48 sm:w-32 sm:h-32 rounded-[2rem] overflow-hidden shrink-0 shadow-lg group-hover:shadow-blue-200/40 transition-shadow">
        <Image src={ad.images?.[0] || "/placeholder.png"} fill className="object-cover group-hover:scale-110 transition-transform duration-700" alt="listing" />
        {ad.status === "sold" && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-[10px] text-white font-black uppercase tracking-widest border border-white/40 px-3 py-1 rounded-full">Sold Out</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
               <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate tracking-tight">{ad.title}</h3>
               <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
               </div>
            </div>
             <p className="text-3xl font-black text-primary mt-1">₹{ad.price?.toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
             <Link href={`/dashboard/seller/edit/${ad._id}`} className="w-12 h-12 bg-slate-50 hover:bg-[#1A1C21] rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm">
              <FiEdit3 size={18} />
             </Link>
             <button onClick={() => onDelete(ad._id)} className="w-12 h-12 bg-slate-50 hover:bg-red-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all shadow-sm">
              <FiTrash2 size={18} />
             </button>
          </div>
        </div>

        <div className="flex gap-4 sm:gap-6 mt-5 sm:mt-6 border-t border-slate-50 pt-4 sm:pt-5 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
            <FiEye className="text-blue-500" /> {ad.views || 0} <span className="hidden sm:inline">Views</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
            <FiMessageCircle className="text-indigo-500" /> {ad.chatCount || 0} <span className="hidden md:inline">Inquiries</span>
          </div>
          {ad.status !== "active" && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
               * Visible only to you while {ad.status}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ChatListItem({ chat, currentUserId }: any) {
  const otherUser = chat.buyer?._id === currentUserId ? chat.seller : chat.buyer;
  
  return (
    <Link href={`/messages/${chat._id}`} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-[2rem] transition-all group">
      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-500 border-2 border-white shadow-sm shrink-0 overflow-hidden">
        {otherUser?.avatar ? <img src={otherUser.avatar} className="object-cover w-full h-full" /> : otherUser?.name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <p className="text-sm font-black text-slate-900 truncate pr-2 tracking-tight">{otherUser?.name || "User"}</p>
          <FiChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
        </div>
        <p className="text-xs text-slate-400 truncate font-medium">{chat.lastMessage || "No messages yet..."}</p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
        <FiPackage className="text-4xl text-slate-200" />
      </div>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Your shop is empty</h3>
      <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto font-medium">
        Ready to make some money? Post your first listing and reach thousands of buyers.
      </p>
      <Link href="/create-ad" className="inline-block mt-8 bg-blue-600 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all">
        Create First Ad
      </Link>
    </div>
  );
}