"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";

type Ad = {
  _id: string;
  title: string;
  price: number;
  locationName: string;
  images: string[];
  category: string;
  views: number;
  chats: number;
};

type Props = {
  search: string;
  category?: string;
  type?: "saved" | "nearby" | "trending";
  layout?: "grid" | "horizontal";
  limit?: number;
  hoverEffect?: string;
  compact?: boolean;
};

export default function AdGrid({
  search,
  category,
  type,
  layout = "grid",
  limit,
  hoverEffect,
  compact = false,
}: Props) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(type === "nearby");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── GEO LOCATION (ONLY FOR NEARBY) ── */
  useEffect(() => {
    if (type !== "nearby") return;

    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Allow location to see nearby ads");
        setGeoLoading(false);
      }
    );
  }, [type]);

  /* ── FETCH ADS ── */
  useEffect(() => {
    if (type === "nearby" && !location) return;

    setLoading(true);

    let url = "/ads";
    const params: Record<string, string | number> = {};

    // ✅ search (only if valid)
    if (search && search.trim() !== "") {
      params.search = search;
    }

    // ✅ nearby
    if (type === "nearby" && location) {
      url = "/ads/nearby";
      params.lat = location.lat;
      params.lng = location.lng;

      if (category && category !== "all") {
        params.category = category;
      }
    }

    // ✅ saved
    else if (type === "saved") {
      url = "/ads/saved";
    }

    // ✅ trending
    else if (type === "trending") {
      params.sort = "trending";
    }

    // 🔍 DEBUG (optional)
    console.log("API CALL:", url, params);

    api
      .get(url, { params })
      .then((res) => {
        let fetched: Ad[] = Array.isArray(res.data)
          ? res.data
          : res.data.ads || [];

        if (limit) fetched = fetched.slice(0, limit);

        setAds(fetched);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [search, category, location, type, limit]);

  /* ── STATES ── */

  if (type === "nearby" && geoLoading) {
    return (
      <div className={`text-center ${compact ? "py-4" : "py-10"} animate-pulse`}>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Calibrating GPS...</span>
      </div>
    );
  }

  if (type === "nearby" && geoError) {
    return (
      <div className={`text-center ${compact ? "py-4" : "py-10"}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive">{geoError}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`text-center ${compact ? "py-4" : "py-10"} animate-pulse`}>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fetching Listings...</span>
      </div>
    );
  }

  if (!ads.length) {
    return (
      <div className={`text-center ${compact ? "py-6" : "py-20"}`}>
        <div className="text-muted-foreground/20 mb-2 flex justify-center">
           {type === "saved" ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
          {type === "saved" ? "Your wishlist is empty" : "No active listings found"}
        </p>
      </div>
    );
  }

  /* ── UI ── */

  return (
    <div
      className={
        layout === "horizontal"
          ? "flex gap-5 overflow-x-auto pb-2"
          : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
      }
    >
      {ads.map((ad) => (
        <Link
          key={ad._id}
          href={`/ads/${ad._id}`}
          className={`group relative rounded-[--radius] border border-border bg-card/60 backdrop-blur-md overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 ${
            hoverEffect === "lift" ? "hover:-translate-y-2" : ""
          }`}
        >
          {/* IMAGE */}
          <div className="h-48 bg-muted relative overflow-hidden">
            <Image
              src={ad.images?.[0] || "/placeholder.png"}
              alt={ad.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute top-3 left-3 bg-card/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-foreground">
               {ad.category}
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <p className="text-primary font-black text-xl tracking-tighter">
                ₹ {ad.price.toLocaleString()}
              </p>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                 <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-45"><path d="M1 1.5C0.723858 1.5 0.5 1.72386 0.5 2V13C0.5 13.2761 0.723858 13.5 1 13.5H12C12.2761 13.5 12.5 13.2761 12.5 13V2C12.5 1.72386 12.2761 1.5 12 1.5H1Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>
              </div>
            </div>

            <p className="text-sm font-bold leading-tight line-clamp-2 h-10 group-hover:text-primary transition-colors">
              {ad.title}
            </p>
            
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mt-2 flex items-center gap-1.5 leading-none">
              <span className="w-1 h-1 bg-primary rounded-full" />
              {ad.locationName || "Nearby"}
            </p>

            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-4 border-t border-border/50 mt-2 font-black uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><span className="text-primary">👁</span> {ad.views || 0}</span>
                <span className="flex items-center gap-1"><span className="text-primary">💬</span> {ad.chats || 0}</span>
              </div>
              <button className="text-primary hover:underline">View</button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}