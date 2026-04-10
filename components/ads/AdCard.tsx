"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FiHeart, FiMapPin, FiShare2, FiZap } from "react-icons/fi";
import api from "@/lib/api";

type Ad = {
  _id: string; // Changed from id to _id to match your backend logic
  title: string;
  price: string | number;
  location: string;
  image: string;
  isTrending?: boolean;
};

export default function AdCard({ ad }: { ad: Ad }) {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop navigation if card is wrapped in a Link
    setSaving(true);
    try {
      await api.post(`/ads/saved/${ad._id}`);
      setIsSaved(!isSaved);
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="group relative bg-white rounded-[2rem] border border-slate-100 overflow-hidden transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)]"
    >
      {/* --- 🖼️ IMAGE SECTION --- */}
      <div className="relative aspect-[4/4] overflow-hidden bg-slate-50">
        <img
          src={ad.image}
          alt={ad.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop";
          }}
        />

        {/* TOP OVERLAYS */}
        <div className="absolute top-4 left-4 flex gap-2">
          {ad.isTrending && (
            <div className="bg-slate-900/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
              <FiZap className="text-amber-400" /> Trending
            </div>
          )}
        </div>

        {/* FLOATING HEART BUTTON */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xl backdrop-blur-md ${
            isSaved 
              ? "bg-rose-500 text-white" 
              : "bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white"
          }`}
        >
          <FiHeart 
            className={`transition-transform duration-300 ${saving ? "animate-pulse" : ""} ${isSaved ? "scale-110" : ""}`} 
            fill={isSaved ? "currentColor" : "none"} 
            size={18} 
          />
        </button>

        {/* QUICK SHARE OVERLAY */}
        <div className="absolute bottom-4 right-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
           <button className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-600">
              <FiShare2 size={16} />
           </button>
        </div>
      </div>

      {/* --- 📝 CONTENT SECTION --- */}
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-2xl font-black text-slate-900 tracking-tighter">
              ₹ {Number(ad.price).toLocaleString()}
            </p>
            <h3 className="text-sm font-bold text-slate-600 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              {ad.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <div className="flex items-center gap-1.5 text-slate-400">
            <FiMapPin size={12} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
              {ad.location}
            </span>
          </div>
          
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
             Just Now
          </div>
        </div>
      </div>
    </motion.div>
  );
}