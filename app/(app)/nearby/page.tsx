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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="bg-card p-6 rounded-2xl border border-border mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-4">

            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FiNavigation /> Nearby Ads
              </h1>

              <p className="text-sm mt-2 text-muted-foreground">
                {coords ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-2">
                    <PulseDot /> Using your GPS location
                  </span>
                ) : loadingLocation ? (
                  "Detecting your location..."
                ) : (
                  "Location permission denied"
                )}
              </p>
            </div>

            {/* SEARCH */}
            <div className="relative w-full md:max-w-sm">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search nearby..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <FiX />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* CATEGORY */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-full border transition-all duration-300 ${
                category === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {cat.emoji} {cat.label}
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