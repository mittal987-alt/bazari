"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  FiMail, FiShield, FiEdit2, FiMessageSquare, 
  FiHeart, FiLogOut, FiPackage, FiArrowRight 
} from "react-icons/fi";

type User = {
  name: string;
  email: string;
  role: "buyer" | "seller";
};

type Ad = {
  _id: string;
  title: string;
  price: number;
  images: string[];
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get("/auth/me");
        setUser(userRes.data);
        if (userRes.data.role === "seller") {
          const adsRes = await api.get("/ads/my");
          setAds(adsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    api.post("/auth/logout").then(() => {
      window.location.href = "/";
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user) return <p className="p-20 text-center font-bold">User session expired.</p>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-24">
      
      {/* 🌌 TOP ACCENT GRADIENT */}
      <div className="h-64 bg-gradient-to-r from-blue-600 to-indigo-700 w-full relative">
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-32 relative z-10">
        
        {/* --- 👤 USER IDENTITY CARD --- */}
        <div className="bg-white rounded-[3rem] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-slate-100 mb-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-32 h-32 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-blue-600 border-4 border-white shadow-xl">
                {user.name.charAt(0)}
              </div>
              <Link href="/profile/edit" className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-3 rounded-2xl shadow-lg hover:bg-blue-600 transition-colors">
                <FiEdit2 size={16} />
              </Link>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <h1 className="text-4xl font-black tracking-tighter">{user.name}</h1>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  user.role === "seller" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                }`}>
                  {user.role} Account
                </span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 text-slate-400 font-medium">
                <span className="flex items-center gap-1"><FiMail /> {user.email}</span>
                <span className="flex items-center gap-1"><FiShield /> Verified</span>
              </div>
            </div>

            <div className="hidden lg:block h-20 w-[1px] bg-slate-100 mx-4" />

            <div className="flex gap-4">
               <div className="text-center">
                  <p className="text-2xl font-black">{ads.length}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Postings</p>
               </div>
            </div>
          </div>
        </div>

        {/* --- 🛠️ QUICK ACTION TILES --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <ActionTile 
            href="/chats" 
            title="Messages" 
            desc="Chat with buyers/sellers" 
            icon={<FiMessageSquare />} 
            color="blue" 
          />
          <ActionTile 
            href="/saved" 
            title="Wishlist" 
            desc="Your curated collection" 
            icon={<FiHeart />} 
            color="rose" 
          />
          <button onClick={handleLogout} className="w-full">
            <ActionTile 
              title="Sign Out" 
              desc="Securely close session" 
              icon={<FiLogOut />} 
              color="slate" 
              isButton
            />
          </button>
        </div>

        {/* --- 📦 LISTINGS SECTION (Only for Sellers) --- */}
        {user.role === "seller" && (
          <section className="space-y-8">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <FiPackage className="text-blue-600" /> Active Listings
              </h2>
              <Link href="/dashboard/seller" className="text-xs font-black uppercase tracking-widest text-blue-600">Manage All →</Link>
            </div>

            {ads.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] py-20 text-center">
                <p className="text-slate-400 font-bold">You haven&apos;t listed anything yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {ads.map((ad) => (
                  <motion.div 
                    key={ad._id}
                    whileHover={{ y: -5 }}
                    className="bg-white border border-slate-100 rounded-[2.5rem] p-4 shadow-sm hover:shadow-xl transition-all"
                  >
                    <Image 
                      src={ad.images?.[0] || "/placeholder.png"} 
                      width={400} 
                      height={176} 
                      className="h-44 w-full object-cover rounded-[1.8rem] mb-4" 
                      alt={ad.title} 
                    />
                    <div className="px-2 space-y-1">
                      <p className="text-xl font-black text-blue-600 tracking-tighter">₹{ad.price.toLocaleString()}</p>
                      <h3 className="font-bold text-slate-800 truncate">{ad.title}</h3>
                      <div className="flex justify-between items-center pt-2">
                        <Link href={`/dashboard/seller/edit/${ad._id}`} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600">Edit</Link>
                        <FiArrowRight className="text-slate-300" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

interface ActionTileProps {
  href?: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  isButton?: boolean;
}

/* --- 🧊 REUSABLE ACTION TILE --- */
function ActionTile({ href, title, desc, icon, color, isButton }: ActionTileProps) {
  const themes: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-600",
    rose: "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-600",
    slate: "text-slate-600 bg-slate-50 border-slate-100 hover:bg-slate-900",
  };

  const Content = (
    <div className={`group w-full text-left p-8 rounded-[2.5rem] border bg-white transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 transition-all group-hover:bg-white group-hover:scale-110 ${themes[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-slate-400 font-medium text-sm mt-1">{desc}</p>
    </div>
  );

  return isButton ? Content : <Link href={href!}>{Content}</Link>;
}