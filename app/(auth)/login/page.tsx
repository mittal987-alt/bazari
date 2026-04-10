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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">
            Welcome Back
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Login to your marketplace account
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

        {/* Inputs */}
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            className="bg-white/90 focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Password"
            className="bg-white/90 focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Button */}
        <Button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-6 bg-white text-black hover:bg-gray-200 shadow-lg hover:shadow-white/20 transition-all duration-300"
        >
          {loading ? "Logging in..." : "Login"}
        </Button>

        {/* Footer */}
        <div className="mt-6 border-t border-white/10 pt-4 text-center space-y-2">
          <Link
            href="/forgot-password"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Forgot password?
          </Link>

          <p className="text-sm text-gray-400">
            Don’t have an account?{" "}
            <Link
              href="/register"
              className="text-white font-medium hover:underline"
            >
              Register
            </Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}