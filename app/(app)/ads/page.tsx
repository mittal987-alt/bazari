"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { 
  FiSearch, FiMapPin, FiArrowUp, 
  FiChevronDown, FiInbox, FiFilter 
} from "react-icons/fi";

type Ad = {
  _id: string;
  title: string;
  price: number;
  location: string;       // GeoJSON object — not rendered
  locationName: string;   // human-readable city/area name
  images: string[];
};

interface SidebarInputProps {
  icon?: React.ReactElement;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isSmall?: boolean;
}

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("");

  const fetchAds = useCallback(async (pageNumber: number, reset = false) => {
    try {
      setLoading(true);
      const res = await api.get("/ads", {
        params: { page: pageNumber, search, city, min, max, sort },
      });

      const newAds = res.data.ads;
      setTotalPages(res.data.totalPages);

      if (reset) {
        setAds(newAds);
      } else {
        // Prevent duplicate ads if fetch triggers twice
        setAds((prev) => {
           const existingIds = new Set(prev.map(a => a._id));
           const filteredNew = newAds.filter((a: Ad) => !existingIds.has(a._id));
           return [...prev, ...filteredNew];
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, city, min, max, sort]);

  useEffect(() => {
    fetchAds(1, true);
  }, [fetchAds]);

  useEffect(() => {
    if (page > 1) fetchAds(page);
  }, [page, fetchAds]);

  // Infinite Scroll Observer
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        !loading && page < totalPages
      ) {
        setPage((prev) => prev + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, page, totalPages]);

  const applyFilters = () => {
    setPage(1);
    fetchAds(1, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      
      {/* 🌌 AMBIENT TOP BAR */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30 py-4 px-8 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
           <h1 className="text-xl font-black tracking-tighter uppercase">Marketplace<span className="text-blue-600">.</span></h1>
           <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
             {ads.length} Items Found
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-12 gap-12">

        {/* --- 🔎 PREMIUM SIDEBAR --- */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="sticky top-28 space-y-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
            
            <div className="flex items-center gap-2 text-blue-600 mb-2">
               <FiFilter />
               <h2 className="text-xs font-black uppercase tracking-[0.2em]">Filter Engine</h2>
            </div>

            <div className="space-y-6">
              <SidebarInput icon={<FiSearch />} placeholder="Keyword..." value={search} onChange={setSearch} />
              <SidebarInput icon={<FiMapPin />} placeholder="All Cities" value={city} onChange={setCity} />
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Budget Range</label>
                <div className="flex gap-2">
                  <SidebarInput placeholder="Min" value={min} onChange={setMin} isSmall />
                  <SidebarInput placeholder="Max" value={max} onChange={setMax} isSmall />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sort By</label>
                <div className="relative group">
                   <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                   <select 
                     value={sort} 
                     onChange={(e) => setSort(e.target.value)}
                     className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-blue-100 transition-all"
                   >
                     <option value="">Recently Added</option>
                     <option value="price_low">Price: Low to High</option>
                     <option value="price_high">Price: High to Low</option>
                   </select>
                </div>
              </div>

              <button
                onClick={applyFilters}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Refresh Discovery
              </button>
            </div>
          </div>
        </aside>

        {/* --- 🛒 LISTINGS GRID --- */}
        <main className="col-span-12 lg:col-span-9">
          {ads.length === 0 && !loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <FiInbox className="text-slate-200 text-6xl mb-4" />
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No matching listings found</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {ads.map((ad, idx) => (
                  <motion.div 
                    key={ad._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx % 12 * 0.05 }}
                  >
                    <Link href={`/ads/${ad._id}`} className="group block bg-white rounded-[2.5rem] border border-slate-100 p-4 transition-all hover:shadow-2xl hover:-translate-y-1">
                      <div className="aspect-[4/3] bg-slate-100 rounded-[1.8rem] overflow-hidden mb-5 relative">
                        <Image fill src={ad.images?.[0] || "/placeholder.png"} className="object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      </div>
                      <div className="px-2 space-y-1">
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{ad.price.toLocaleString()}</p>
                        <h3 className="font-bold text-slate-600 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight text-sm">{ad.title}</h3>
                        <div className="flex items-center gap-1.5 text-slate-400 pt-2 border-t border-slate-50 mt-3">
                          <FiMapPin className="text-blue-500" size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{ad.locationName || "—"}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-[2.5rem]" />
               ))}
            </div>
          )}
        </main>
      </div>

      {/* 🚀 SCROLL TO TOP FAB */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-10 right-10 w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all active:scale-90"
      >
        <FiArrowUp />
      </button>
    </div>
  );
}

/* --- 🧊 SIDEBAR INPUT HELPER --- */
function SidebarInput({ icon, placeholder, value, onChange, isSmall = false }: SidebarInputProps) {
  return (
    <div className="relative group">
      {icon && <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">{icon}</div>}
      <input 
        type="text" 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${icon ? 'pl-12' : 'px-5'} ${isSmall ? 'py-3' : 'py-4'} w-full bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-blue-100 focus:bg-white transition-all placeholder:text-slate-300`}
      />
    </div>
  );
}