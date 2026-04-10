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
      <div className="
      min-h-screen 
      w-full 
      flex 
      items-center 
      justify-center 
      bg-background
      transition-colors
      duration-500
    ">
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

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tighter uppercase italic">
            Bazaari
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Create your account
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
          className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl transition-all duration-300 rounded-xl py-6 font-bold uppercase tracking-widest text-xs"
        >
          {loading ? "Creating..." : "Register"}
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