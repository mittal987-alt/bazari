"use client";

import { useState, useEffect } from "react";
import AdGrid from "@/components/ads/AdGrid";
import { FiNavigation, FiSearch, FiX } from "react-icons/fi";

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🌐" },
  { id: "Electronics", label: "Electronics", emoji: "📱" },
  { id: "Vehicles", label: "Vehicles", emoji: "🚗" },
  { id: "Furniture", label: "Furniture", emoji: "🪑" },
  { id: "Fashion", label: "Fashion", emoji: "👗" },
  { id: "Books", label: "Books", emoji: "📚" },
  { id: "Sports", label: "Sports", emoji: "⚽" },
  { id: "Real Estate", label: "Real Estate", emoji: "🏠" },
  { id: "Other", label: "Other", emoji: "📦" },
];

function PulseDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
    </span>
  );
}

export default function NearbyPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(true);

  // 📍 GET USER LOCATION
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoadingLocation(false);
      },
      () => {
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-700 relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40 shrink-0" />
      <div className="max-w-[1400px] mx-auto px-6 py-12 relative z-10">

        {/* HEADER */}
        <div className="bg-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-border mb-12 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h1 className="text-5xl font-black tracking-tighter flex items-center justify-center md:justify-start gap-4">
                <FiNavigation className="text-primary animate-pulse" /> Nearby<span className="text-primary">.</span>
              </h1>

              <div className="inline-flex mt-4 px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-3">
                  {coords ? (
                    <>
                      <PulseDot /> Connected to GPS
                    </>
                  ) : loadingLocation ? (
                    "Locating device..."
                  ) : (
                    "Location unavailable"
                  )}
                </p>
              </div>
            </div>

            {/* SEARCH */}
            <div className="relative w-full md:max-w-md">
              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search local listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-14 pr-12 py-4 bg-background/50 border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-primary transition-colors"
                >
                  <FiX size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CATEGORY */}
        <div className="flex flex-wrap gap-3 mb-12">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-6 py-2.5 rounded-2xl border transition-all duration-500 text-[10px] font-black uppercase tracking-widest ${
                category === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-105"
                  : "bg-card/40 backdrop-blur-md text-muted-foreground border-border hover:border-primary/30 hover:bg-card"
              }`}
            >
              {cat.emoji} &nbsp; {cat.label}
            </button>
          ))}
        </div>

        {/* ADS */}
        {/* AdGrid handles its own geolocation when type="nearby" */}
        <AdGrid
          search={search}
          category={category}
          type="nearby"
        />

      </div>
    </div>
  );
}