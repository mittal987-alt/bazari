"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, FiMapPin, FiHeart, FiStar, FiGrid, 
  FiList, FiSliders, FiX, FiChevronRight, FiFilter 
} from "react-icons/fi";
import Image from "next/image";

// --- TYPES ---
type Ad = {
  _id: string;
  title: string;
  price: number;
  locationName: string;
  category: string;
  images: string[];
  createdAt: string;
  rating?: number;
  reviewsCount?: number;
  status: "active" | "pending" | "spam";
};

export default function ProductsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- CORE STATE ---
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceRange, setPriceRange] = useState(1000000);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [wishlist, setWishlist] = useState<string[]>([]);

  // --- 1. FETCH LOGIC (With Debounce) ---
  useEffect(() => {
    const getAds = async () => {
      setLoading(true);
      try {
        // We pass filters to the backend, but we also filter locally for instant feel
        const res = await api.get("/ads", {
          params: { search, category }
        });
        setAds(res.data.ads);
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(getAds, 300);
    return () => clearTimeout(timeoutId);
  }, [search, category]);

  // --- 2. ADVANCED CLIENT-SIDE FILTERING & SORTING ---
  const processedAds = useMemo(() => {
    let result = [...ads];

    // Filter by Price
    result = result.filter(ad => ad.price <= priceRange);

    // Sort Logic
    result.sort((a, b) => {
      if (sortBy === "price_low") return a.price - b.price;
      if (sortBy === "price_high") return b.price - a.price;
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [ads, priceRange, sortBy]);

  // --- 3. HELPERS ---
  const toggleWishlist = (id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setPriceRange(1000000);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      
      {/* --- PREMIUM NAVBAR --- */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black italic tracking-tighter">Market<span className="text-blue-600">.</span></h1>
            
            <div className="hidden md:flex items-center bg-slate-100 rounded-2xl px-4 py-2 w-96 group focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
              <FiSearch className="text-slate-400 group-focus-within:text-blue-600" />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search premium goods..." 
                className="bg-transparent border-none outline-none px-3 w-full text-sm font-bold"
              />
              {search && <FiX onClick={() => setSearch("")} className="cursor-pointer text-slate-400" />}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-3 bg-slate-50 rounded-2xl text-slate-600 hover:text-blue-600 transition-colors">
              <FiHeart size={20} />
              {wishlist.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
            </button>
            <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
              Post Ad
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* --- SIDEBAR FILTERS --- */}
        <aside className="lg:col-span-3 space-y-10">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <FiFilter className="text-blue-600" /> Filter Engine
            </h3>
            
            <div className="space-y-1">
              {["all", "Electronics", "Vehicles", "Property", "Fashion"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    category === cat ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                  <FiChevronRight className={`transition-transform ${category === cat ? "translate-x-0" : "-translate-x-2 opacity-0"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price Ceiling</h4>
              <span className="text-sm font-black text-blue-600">₹{(priceRange/1000).toFixed(0)}k</span>
            </div>
            <input 
              type="range" min="1000" max="1000000" step="10000"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-blue-600" 
            />
            <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400">
              <span>MIN</span>
              <span>10L+</span>
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <section className="lg:col-span-9">
          
          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div className="flex flex-wrap gap-2">
               {category !== "all" && <FilterChip label={category} onClear={() => setCategory("all")} />}
               {priceRange < 1000000 && <FilterChip label={`Under ₹${priceRange/1000}k`} onClear={() => setPriceRange(1000000)} />}
            </div>

            <div className="flex items-center gap-4">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
              >
                <option value="newest">Latest Arrivals</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><FiGrid size={16}/></button>
                 <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><FiList size={16}/></button>
              </div>
            </div>
          </div>

          {/* PRODUCT LIST */}
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-6"}>
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array(6).fill(0).map((_, i) => <Skeleton key={i} />)
              ) : processedAds.length > 0 ? (
                processedAds.map((ad) => (
                  <ProductCard 
                    key={ad._id} 
                    ad={ad} 
                    viewMode={viewMode} 
                    isLiked={wishlist.includes(ad._id)}
                    onLike={() => toggleWishlist(ad._id)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-bold">No results found for your selection.</p>
                   <button onClick={clearFilters} className="mt-4 text-blue-600 font-black text-xs uppercase tracking-widest underline">Reset Filters</button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FilterChip({ label, onClear }: { label: string, onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
      {label}
      <FiX className="cursor-pointer hover:scale-125 transition-transform" onClick={onClear} />
    </div>
  );
}

function ProductCard({ ad, viewMode, isLiked, onLike }: any) {
  // Randomizing these just for visual realism in demo
  const rating = ad.rating || (4 + Math.random()).toFixed(1);
  const reviews = ad.reviewsCount || Math.floor(Math.random() * 50) + 5;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 ${viewMode === 'list' ? 'flex items-center p-4 gap-8' : ''}`}
    >
      <div className={`relative overflow-hidden rounded-[2rem] ${viewMode === 'list' ? 'w-48 h-40 shrink-0' : 'aspect-[4/5]'}`}>
        <img 
          src={ad.images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          alt="" 
        />
        <button 
          onClick={(e) => { e.preventDefault(); onLike(); }}
          className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all ${isLiked ? 'bg-rose-500 text-white' : 'bg-white/80 text-slate-400'}`}
        >
          <FiHeart fill={isLiked ? "currentColor" : "none"} size={16} />
        </button>
      </div>

      <div className={`flex flex-col justify-between ${viewMode === 'list' ? 'flex-grow py-2' : 'p-6'}`}>
        <div>
          <div className="flex items-center gap-2 mb-3">
             <div className="flex items-center gap-1 text-amber-500">
                <FiStar fill="currentColor" size={10} />
                <span className="text-[10px] font-black">{rating}</span>
             </div>
             <span className="text-[10px] text-slate-300 font-bold">({reviews} reviews)</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">{ad.title}</h3>
          <div className="flex items-center gap-1.5 text-slate-400 mb-4">
            <FiMapPin size={10} className="text-blue-500" />
            <span className="text-[9px] font-black uppercase tracking-tighter">{ad.locationName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
           <p className="text-xl font-black tracking-tighter text-slate-900">₹{ad.price.toLocaleString()}</p>
           <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all group-hover:scale-105 active:scale-95">
             <FiChevronRight />
           </button>
        </div>
      </div>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-4 animate-pulse">
      <div className="aspect-[4/5] bg-slate-100 rounded-[2rem] mb-4" />
      <div className="h-4 w-1/2 bg-slate-100 rounded-full mb-2" />
      <div className="h-6 w-3/4 bg-slate-100 rounded-full" />
    </div>
  );
}