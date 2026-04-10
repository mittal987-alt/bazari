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
      bg-gradient-to-br 
      from-[#0f172a] 
      via-[#1e293b] 
      to-black
    ">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="
                 w-full max-w-md 
                 p-8 rounded-2xl 
                 bg-white/10 
                 backdrop-blur-md 
                 border border-white/20
                 shadow-xl
               " >

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-white">
            OLX
          </h1>
          <p className="text-sm text-gray-300 mt-1">
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

        {/* Inputs */}
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            className="bg-white/90"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            placeholder="Email address"
            type="email"
            className="bg-white/90"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            placeholder="Password"
            type="password"
            className="bg-white/90"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Button */}
        <Button
          onClick={handleRegister}
          disabled={loading}
          className="w-full mt-6 bg-white text-black hover:bg-gray-200"
        >
          {loading ? "Creating..." : "Register"}
        </Button>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-white font-medium hover:underline"
          >
            Login
          </Link>
        </p>

      </motion.div>
    </div>
  );
}