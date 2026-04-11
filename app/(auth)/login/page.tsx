"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useUserStore } from "@/store/userStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, user, authChecked } = useUserStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 Block logged-in users
  useEffect(() => {
    if (authChecked && user) {
      if (user.role === "admin") {
        router.replace("/dashboard/admin");
      } else if (user.role === "seller") {
        router.replace("/dashboard/seller");
      } else {
        router.replace("/dashboard/buyer");
      }
    }
  }, [authChecked, user, router]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/login", {
        email,
        password,
      });

      setUser(res.data);

      if (res.data.role === "admin") {
        router.replace("/dashboard/admin");
      } else if (res.data.role === "seller") {
        router.replace("/dashboard/seller");
      } else {
        router.replace("/dashboard/buyer");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials");
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
            Welcome back to the marketplace
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ x: -10 }}
            animate={{ x: 0 }}
            className="text-sm text-red-400 text-center mb-4"
          >
            {error}
          </motion.p>
        )}

        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            className="bg-background/50 border-border focus:ring-2 focus:ring-primary/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Password"
            className="bg-background/50 border-border focus:ring-2 focus:ring-primary/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Button */}
        <Button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-8 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20 transition-all duration-300 rounded-2xl py-7 font-black uppercase tracking-[0.2em] text-[10px]"
        >
          {loading ? "Verifying..." : "Login to Account"}
        </Button>

        <div className="mt-8 border-t border-border/50 pt-6 text-center space-y-3">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground transition font-medium"
          >
            Forgot password?
          </Link>

          <p className="text-sm text-muted-foreground">
            Don’t have an account?{" "}
            <Link
              href="/register"
              className="text-foreground font-bold hover:underline"
            >
              Register
            </Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}