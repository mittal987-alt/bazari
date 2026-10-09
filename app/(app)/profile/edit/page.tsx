"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiUser, FiSave } from "react-icons/fi";

type User = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const userRes = await api.get("/auth/me");
        if (!mounted) return;
        setUser(userRes.data);
        setName(userRes.data.name);
      } catch (err: any) {
        console.error("Profile Error:", err?.response?.status);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put("/auth/me", { name });
      router.push("/profile");
      router.refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update profile");
      setSaving(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
        />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Loading Profile</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground font-bold">Session expired. <Link href="/login" className="text-primary underline">Log in again</Link></p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* ── Ambient BG ── */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-[hsl(var(--luxury-violet)/0.07)] rounded-full blur-[140px] pointer-events-none" />
      
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-12 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-border text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:border-transparent transition-all"
          >
            <FiArrowLeft size={12} /> Back
          </Link>
          <h1 className="text-2xl font-black tracking-tight">Edit Profile</h1>
        </div>

        <motion.div
          variants={fadeUp} initial="hidden" animate="show"
          className="dashboard-card p-6 md:p-8"
        >
          <form onSubmit={handleSave} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                  <FiUser size={16} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-2 opacity-60">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Email (Cannot be changed)
              </label>
              <input
                type="text"
                value={user.email}
                disabled
                className="w-full px-4 py-3 bg-muted border border-border/50 rounded-xl text-sm font-medium text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="pt-4 border-t border-border/50">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 transition-all"
              >
                {saving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
                  />
                ) : (
                  <FiSave size={16} />
                )}
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
