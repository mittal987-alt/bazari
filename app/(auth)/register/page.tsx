"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/userStore";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, user, authChecked } = useUserStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔐 Block logged-in users
  useEffect(() => {
    if (authChecked && user) {
      router.replace("/dashboard/buyer");
    }
  }, [authChecked, user, router]);

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/register", {
        name,
        email,
        password,
      });

      setUser(res.data);
      router.replace("/dashboard/buyer");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden transition-all duration-700">
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40 shrink-0" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 -z-10" />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="
                 w-full max-w-md 
                 p-8 rounded-2xl 
                 bg-card/50
                 backdrop-blur-xl 
                 border border-border
                 shadow-2xl
               " >

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-black italic mx-auto mb-6 shadow-2xl shadow-primary/30 transform -rotate-6">
            B
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            Bazaari<span className="text-primary not-italic">.</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm font-medium">
            Join the premium marketplace
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ x: -10 }}
            animate={{ x: 0 }}
            className="text-sm text-red-400 text-center mb-3"
          >
            {error}
          </motion.p>
        )}

        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            className="bg-background/50 border-border focus:ring-2 focus:ring-primary/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            placeholder="Email address"
            type="email"
            className="bg-background/50 border-border focus:ring-2 focus:ring-primary/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            placeholder="Password"
            type="password"
            className="bg-background/50 border-border focus:ring-2 focus:ring-primary/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Button */}
        <Button
          onClick={handleRegister}
          disabled={loading}
          className="w-full mt-8 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20 transition-all duration-300 rounded-2xl py-7 font-black uppercase tracking-[0.2em] text-[10px]"
        >
          {loading ? "Creating..." : "Start Your Journey"}
        </Button>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground font-bold hover:underline"
          >
            Login
          </Link>
        </p>

      </motion.div>
    </div>
  );
}