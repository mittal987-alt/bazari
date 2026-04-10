"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart, FiMapPin, FiArrowLeft, FiTrash2 } from "react-icons/fi";

// ✅ Updated Type definition
type Ad = {
  _id: string;
  title: string;
  price: number;
  locationName: string; // Changed from 'location: string'
  images: string[];
};

export default function SavedPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await api.get("/ads/saved");
        setAds(res.data);
      } catch (err) {
        console.error("Error fetching saved ads:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  const handleUnsave = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); 
    try {
      // ✅ URL updated to match your backend toggle route
      await api.post(`/ads/saved/${id}`); 
      setAds((prev) => prev.filter((ad) => ad._id !== id));
    } catch (err) {
      console.error("Failed to unsave:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      <div className="fixed top-0 right-0 w-[30%] h-[30%] bg-rose-50/50 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-8 py-12">
        <header className="mb-16 space-y-4">
          <Link href="/dashboard/buyer" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Lounge
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-6xl font-black tracking-tighter text-slate-900">
                Collection<span className="text-rose-500">.</span>
              </h1>
              <p className="text-slate-500 font-medium text-lg mt-2">
                You have <span className="text-slate-900 font-bold">{ads.length} items</span> reserved in your wishlist.
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-[2.5rem]" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 rounded-[4rem] bg-slate-50 border-2 border-dashed border-slate-200"
          >
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6">
              <FiHeart className="text-rose-200 text-3xl" fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Your gallery is empty</h3>
            <p className="text-slate-400 font-medium mt-1">Start exploring and save items you love.</p>
            <Link href="/dashboard/buyer" className="mt-8 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
              Explore Marketplace
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence>
              {ads.map((ad) => (
                <motion.div
                  key={ad._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group relative bg-white rounded-[2.5rem] border border-slate-100 p-4 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:-translate-y-2"
                >
                  <Link href={`/ads/${ad._id}`}>
                    <div className="relative h-64 rounded-[2rem] overflow-hidden mb-6">
                      <Image
                        src={ad.images?.[0] || "/placeholder.png"}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        alt={ad.title}
                        fill
                      />
                      <button
                        onClick={(e) => handleUnsave(e, ad._id)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-rose-500 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>

                    <div className="px-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">
                          ₹{ad.price.toLocaleString()}
                        </p>
                        <div className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
                          Available
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-700 text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {ad.title}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400">
                        <FiMapPin size={14} className="text-blue-500" />
                        {/* ✅ FIX: Render ad.locationName string instead of location object */}
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{ad.locationName || "Location Not Set"}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}