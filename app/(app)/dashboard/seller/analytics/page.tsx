
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useUserStore } from "@/store/userStore";
import { FiArrowLeft, FiPackage, FiEye, FiMessageCircle, FiCheckCircle, FiDollarSign } from "react-icons/fi";

export default function SellerAnalyticsPage() {
  const { user } = useUserStore();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAds: 0,
    totalViews: 0,
    totalMessages: 0,
    soldItems: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (!userId) return;

    const fetchAnalytics = async () => {
      try {
        const [adsRes, chatsRes] = await Promise.all([
          api.get("/ads/my"),
          api.get("/chats"),
        ]);

        const ads = adsRes.data || [];
        const chats = chatsRes.data || [];
        const sellerChats = chats.filter((c: any) => c.seller?._id === userId);

        const totalViews = ads.reduce((sum: number, ad: any) => sum + (ad.views || 0), 0);
        const soldAds = ads.filter((ad: any) => ad.status === "sold");
        const totalRevenue = soldAds.reduce((sum: number, ad: any) => sum + (ad.price || 0), 0);

        setStats({
          totalAds: ads.length,
          totalViews,
          totalMessages: sellerChats.length,
          soldItems: soldAds.length,
          totalRevenue,
        });
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/seller"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <FiArrowLeft size={14} /> Back to Seller Console
          </Link>
          <h1 className="text-3xl font-black tracking-tight">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time performance metrics and buyer engagement for your listings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Stat
          label="Total Listings"
          value={loading ? "..." : stats.totalAds.toString()}
          icon={<FiPackage className="text-primary" size={20} />}
          sub="Active and archived"
        />
        <Stat
          label="Listing Views"
          value={loading ? "..." : stats.totalViews.toLocaleString()}
          icon={<FiEye className="text-sky-500" size={20} />}
          sub="Buyer impressions"
        />
        <Stat
          label="Buyer Inquiries"
          value={loading ? "..." : stats.totalMessages.toString()}
          icon={<FiMessageCircle className="text-violet-500" size={20} />}
          sub="Conversations initiated"
        />
        <Stat
          label="Items Sold"
          value={loading ? "..." : stats.soldItems.toString()}
          icon={<FiCheckCircle className="text-emerald-500" size={20} />}
          sub={loading ? "" : `₹${stats.totalRevenue.toLocaleString()} realized`}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 p-6 bg-card/60 backdrop-blur-xl shadow-sm hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="text-3xl font-black tracking-tight">{value}</p>
      {sub && <p className="text-[11px] font-medium text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}
