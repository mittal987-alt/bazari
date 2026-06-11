"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
  FiPlus, FiEdit3, FiTrash2, FiMessageCircle, FiEye, FiActivity,
  FiArrowUpRight, FiPackage, FiStar, FiSearch, FiClock, FiChevronRight,
  FiAlertCircle, FiCheckCircle, FiX
} from "react-icons/fi";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";

export default function SellerDashboard() {
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
        : 4.9;

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
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await api.delete(`/ads/${id}`);
      setAds((prev) => prev.filter((ad) => ad._id !== id));
    } catch {
      alert("Error deleting ad");
    }
  };

  const handleMarkSold = async (adId: string, buyerId: string | null) => {
    try {
      await api.post(`/ads/${adId}/sold`, { buyerId });
      setAds(prev => prev.map(ad => ad._id === adId ? { ...ad, status: 'sold', buyerId } : ad));
    } catch (err) {
      alert("Failed to mark as sold");
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
      {/* Ambient backgrounds */}
      <div className="hidden sm:block absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[hsl(var(--luxury-violet)/0.05)] rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="hidden sm:block absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[hsl(var(--luxury-rose)/0.05)] rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-30 -z-0" />

      <div className="relative z-10">
        <div className="bg-card/40 backdrop-blur-2xl border-b border-border pt-8 sm:pt-16 pb-8 sm:pb-16 relative overflow-hidden">
          
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 sm:mb-12">
              <div>
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 mb-2 sm:mb-3"
                >
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Seller Command Center</span>
                </motion.div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none text-foreground">
                  Console<span className="text-primary">.</span>
                </h1>
              </div>

              <Link
                href="/create-ad"
                className="group flex items-center justify-center w-full lg:w-auto gap-2 sm:gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-[2rem] transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                <FiPlus className="text-lg sm:text-xl group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-bold text-sm sm:text-base tracking-tight">Post New Listing</span>
              </Link>
            </div>

            {/* STATS BENTO GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <StatCard label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={<FiActivity />} gradient="from-blue-600 to-indigo-600" shadow="shadow-blue-500/20" />
              <StatCard label="Leads" value={stats.leads} icon={<FiMessageCircle />} gradient="from-violet-600 to-purple-600" shadow="shadow-violet-500/20" />
              <StatCard label="Views" value={stats.views} icon={<FiEye />} gradient="from-emerald-500 to-teal-600" shadow="shadow-emerald-500/20" />
              <StatCard label="Rating" value={stats.rating} icon={<FiStar />} gradient="from-amber-500 to-orange-600" shadow="shadow-amber-500/20" />
            </div>
          </div>
        </div>

        {/* --- MAIN DASHBOARD BODY --- */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
          
          {/* LEFT: LISTINGS (8/12) */}
          <div className="lg:col-span-8">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="flex bg-muted/50 p-1 rounded-xl sm:rounded-2xl border border-border">
                {["all", "active", "sold"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`flex-1 sm:flex-none relative px-4 sm:px-8 py-2.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      filter === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filter === tab && (
                      <motion.div layoutId="activeTab" className="absolute inset-0 bg-background shadow-sm border border-border rounded-lg sm:rounded-xl -z-0" />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search inventory..."
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <div className="py-20 text-center animate-pulse">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Loading Inventory...</span>
                  </div>
                ) : filteredAds.length > 0 ? (
                  filteredAds.map((ad) => {
                    const adChats = chats.filter(c => 
                      c.adId === ad._id || 
                      (c.adId?._id === ad._id) || 
                      (c.ad === ad._id)
                    );
                    return (
                      <PremiumListingCard 
                        key={ad._id} 
                        ad={ad} 
                        onDelete={handleDelete} 
                        onMarkSold={handleMarkSold} 
                        chats={adChats} 
                      />
                    );
                  })
                ) : (
                  <EmptyState />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT: COMPACT CHATS & TIPS (4/12) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6 sm:space-y-8">
              
              <div className="bg-card/60 backdrop-blur-2xl rounded-2xl sm:rounded-[2rem] border border-border/50 shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6 pb-2 sm:pb-3 flex justify-between items-center border-b border-border/50">
                  <h3 className="font-black text-sm sm:text-base tracking-tight flex items-center gap-2">
                     <FiMessageCircle className="text-primary" />
                     Recent Inquiries
                  </h3>
                  <Link href="/messages" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">View All</Link>
                </div>
                
                <div className="p-2 sm:p-3 space-y-1 max-h-[400px] overflow-y-auto">
                  {loading ? (
                     <div className="py-8 text-center animate-pulse">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Loading...</span>
                     </div>
                  ) : chats.length > 0 ? chats.slice(0, 5).map((chat) => (
                    <ChatListItem key={chat._id} chat={chat} currentUserId={userId} />
                  )) : (
                    <div className="py-12 text-center text-muted-foreground/50">
                      <FiClock className="mx-auto text-xl mb-3 opacity-50" />
                      <p className="text-[9px] font-black uppercase tracking-widest">No messages</p>
                    </div>
                  )}
                </div>
              </div>

              {/* UPSELL / TIPS CARD */}
              <div className="bg-gradient-to-br from-primary to-[hsl(var(--luxury-violet))] rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden group">
                 <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-3">
                     <FiAlertCircle className="opacity-80" size={14} />
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Pro Seller Tip</p>
                   </div>
                   <h4 className="text-base sm:text-lg font-bold leading-tight mb-5">Listings with high-quality photos sell <span className="underline decoration-wavy decoration-emerald-400">3x faster</span>.</h4>
                   <Link href="/create-ad" className="inline-block bg-background/20 hover:bg-background/30 transition-colors px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                     Update Ads
                   </Link>
                 </div>
                 <div className="absolute -bottom-10 -right-10 w-32 sm:w-40 h-32 sm:h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- DESIGN COMPONENTS ---

function StatCard({ label, value, icon, gradient, shadow }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }} 
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] shadow-lg ${shadow} transition-all group border border-white/10`}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md transition-transform group-hover:rotate-12 duration-300 text-white">
            {icon}
          </div>
          <FiArrowUpRight className="text-white/40 group-hover:text-white transition-colors" size={16} />
        </div>
        <p className="text-white/70 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">{value}</h3>
      </div>
      
      {/* Decorative inner glow */}
      <div className="absolute -bottom-6 -right-6 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
    </motion.div>
  );
}

function PremiumListingCard({ ad, onDelete, onMarkSold, chats }: any) {
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "sold":
        return { label: "Sold", color: "text-amber-600 bg-amber-500/10 border-amber-500/20", icon: <FiPackage className="w-3 h-3" /> };
      case "spam":
        return { label: "Flagged", color: "text-destructive bg-destructive/10 border-destructive/20", icon: <FiAlertCircle className="w-3 h-3" /> };
      case "pending":
        return { label: "Under Review", color: "text-amber-600 bg-amber-500/10 border-amber-500/20", icon: <FiClock className="w-3 h-3" /> };
      default:
        return { label: "Active", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", icon: <FiActivity className="w-3 h-3" /> };
    }
  };

  const statusInfo = getStatusInfo(ad.status);

  return (
     <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-card/60 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-border/50 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6"
    >
      <div className="relative w-full h-48 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-sm border border-border/50 group-hover:border-primary/20 transition-colors bg-muted">
        <Image src={ad.images?.[0] || "/placeholder.png"} fill className="object-cover group-hover:scale-105 transition-transform duration-700" alt="listing" />
        {ad.status === "sold" && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-[10px] text-foreground font-black uppercase tracking-widest border border-border px-3 py-1 rounded-full bg-card/50">Sold Out</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 w-full flex flex-col h-full justify-between">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
               <h3 className="text-base sm:text-lg font-black text-foreground truncate tracking-tight">{ad.title}</h3>
               <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
               </div>
            </div>
             <p className="text-2xl sm:text-3xl font-black text-primary tracking-tighter">₹{ad.price?.toLocaleString()}</p>
          </div>
          
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
             {ad.status !== "sold" && (
               <button 
                 onClick={() => setShowSoldModal(true)} 
                 className="w-auto h-9 sm:h-10 px-3 sm:px-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest border border-emerald-500/20"
               >
                 <FiCheckCircle className="mr-1.5" size={14} /> Mark Sold
               </button>
             )}
             <Link href={`/dashboard/seller/edit/${ad._id}`} className="w-9 h-9 sm:w-10 sm:h-10 bg-muted/50 hover:bg-primary/10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20">
              <FiEdit3 size={16} />
             </Link>
             <button onClick={() => onDelete(ad._id)} className="w-9 h-9 sm:w-10 sm:h-10 bg-muted/50 hover:bg-destructive/10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive transition-all border border-transparent hover:border-destructive/20">
              <FiTrash2 size={16} />
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-border/50 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-blue-500"><FiEye size={10} /></div>
            {ad.views || 0} <span className="hidden sm:inline text-muted-foreground/50">Views</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">
             <div className="w-5 h-5 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500"><FiMessageCircle size={10} /></div>
            {ad.chats || 0} <span className="hidden xs:inline text-muted-foreground/50">Inquiries</span>
          </div>
          {ad.status !== "active" && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 italic ml-auto">
               <FiAlertCircle size={10} /> Visible only to you
            </div>
          )}
        </div>
      </div>

      {/* SOLD MODAL */}
      <AnimatePresence>
        {showSoldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowSoldModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8">
              <button onClick={() => setShowSoldModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"><FiX /></button>
              
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
                <FiPackage size={20} />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Mark as Sold</h3>
              <p className="text-sm text-muted-foreground mb-6 font-medium">Select the buyer who purchased this item so they can leave a review. If you sold it elsewhere, you can skip selecting a buyer.</p>
              
              <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto pr-2">
                {chats && chats.length > 0 ? (
                  chats.map((chat: any) => {
                    const buyer = chat.buyer;
                    if (!buyer) return null;
                    return (
                      <button 
                        key={buyer._id}
                        onClick={() => setSelectedBuyer(buyer._id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedBuyer === buyer._id ? 'bg-primary/10 border-primary shadow-sm' : 'bg-muted/50 border-transparent hover:border-border'}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground shrink-0 overflow-hidden">
                          {buyer.avatar ? <img src={buyer.avatar} className="w-full h-full object-cover" /> : buyer.name?.charAt(0)}
                        </div>
                        <div className="flex-1 truncate">
                          <p className={`text-sm font-bold truncate ${selectedBuyer === buyer._id ? 'text-primary' : 'text-foreground'}`}>{buyer.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{buyer.email}</p>
                        </div>
                        {selectedBuyer === buyer._id && <FiCheckCircle className="text-primary shrink-0" />}
                      </button>
                    )
                  })
                ) : (
                  <div className="text-center py-6 bg-muted/50 rounded-xl border border-dashed border-border">
                    <p className="text-xs font-bold text-muted-foreground">No recent inquiries.</p>
                  </div>
                )}
                
                <button 
                  onClick={() => setSelectedBuyer(null)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedBuyer === null ? 'bg-primary/10 border-primary shadow-sm' : 'bg-muted/50 border-transparent hover:border-border'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <FiSearch size={14} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${selectedBuyer === null ? 'text-primary' : 'text-foreground'}`}>Sold outside Bazaari</p>
                  </div>
                  {selectedBuyer === null && <FiCheckCircle className="text-primary shrink-0" />}
                </button>
              </div>

              <button 
                onClick={() => {
                  onMarkSold(ad._id, selectedBuyer);
                  setShowSoldModal(false);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FiCheckCircle size={16} /> Confirm Sale
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ChatListItem({ chat, currentUserId }: any) {
  const otherUser = chat.buyer?._id === currentUserId ? chat.seller : chat.buyer;
  
  return (
    <Link href={`/chats/${chat._id}`} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 hover:bg-muted/50 rounded-xl sm:rounded-2xl transition-all group border border-transparent hover:border-border/50">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-muted to-muted-foreground/20 flex items-center justify-center font-black text-muted-foreground border border-border/50 shadow-sm shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
        {otherUser?.avatar ? <img src={otherUser.avatar} className="object-cover w-full h-full" alt="avatar" /> : otherUser?.name?.charAt(0) || "U"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <p className="text-xs sm:text-sm font-bold text-foreground truncate pr-2 tracking-tight">{otherUser?.name || "Member"}</p>
          <FiChevronRight className="text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" size={14} />
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium">{chat.lastMessage || "Sent an inquiry..."}</p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 sm:py-24 bg-card/50 rounded-2xl sm:rounded-[3rem] border-2 border-dashed border-border backdrop-blur-sm">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-5 sm:mb-6 shadow-inner border border-border/50">
        <FiPackage className="text-3xl sm:text-4xl text-muted-foreground/50" />
      </div>
      <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Your shop is empty</h3>
      <p className="text-muted-foreground text-xs sm:text-sm mt-2 max-w-xs mx-auto font-medium px-4">
        Ready to make some money? Post your first listing and reach thousands of buyers.
      </p>
      <Link href="/create-ad" className="inline-flex items-center gap-2 mt-6 sm:mt-8 bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
        <FiPlus size={16} /> Create First Ad
      </Link>
    </div>
  );
}