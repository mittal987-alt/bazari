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
};

export default function AdGrid({
  search,
  category,
  type,
  layout = "grid",
  limit,
  hoverEffect,
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
    return <p className="text-center py-10">Getting your location...</p>;
  }

  if (type === "nearby" && geoError) {
    return <p className="text-center py-10 text-red-500">{geoError}</p>;
  }

  if (loading) {
    return <p className="text-center py-10">Loading ads...</p>;
  }

  if (!ads.length) {
    return (
      <p className="text-center py-10 text-gray-400 font-bold">
        No ads found
      </p>
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
          className={`rounded-2xl border bg-white hover:shadow-lg transition overflow-hidden ${
            hoverEffect === "lift" ? "hover:-translate-y-1" : ""
          }`}
        >
          {/* IMAGE */}
          <div className="h-36 bg-gray-100 relative">
            <Image
              src={ad.images?.[0] || "/placeholder.png"}
              alt={ad.title}
              fill
              className="object-cover"
            />
          </div>

          {/* CONTENT */}
          <div className="p-4 space-y-1">
            <p className="text-green-600 font-bold text-lg">
              ₹ {ad.price.toLocaleString()}
            </p>
            <p className="text-sm font-medium line-clamp-2">
              {ad.title}
            </p>
            <p className="text-xs text-gray-500">
              {ad.locationName}
            </p>

            <div className="flex justify-between text-xs text-gray-400 pt-2 border-t mt-2">
              <span>👁 {ad.views || 0}</span>
              <span>💬 {ad.chats || 0}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}