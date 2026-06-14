"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/userStore";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              shape?: string;
              text?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, user, authChecked } = useUserStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // 🔐 Block logged-in users
  useEffect(() => {
    if (authChecked && user) {
      router.replace("/dashboard/buyer");
    }
  }, [authChecked, user, router]);

  // 🌐 Load Google Identity Services
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: googleBtnRef.current.offsetWidth || 320,
        shape: "rectangular",
        text: "signup_with",
      });
    };

    const script = document.getElementById("gsi-script");
    if (!script) {
      const s = document.createElement("script");
      s.id = "gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = initGoogle;
      document.head.appendChild(s);
    } else {
      initGoogle();
    }
  }, [authChecked]);

  const handleGoogleCredential = async (response: { credential: string }) => {
    try {
      setGoogleLoading(true);
      setError("");
      const res = await api.post("/auth/google", {
        credential: response.credential,
      });
      setUser(res.data);
      router.replace("/dashboard/buyer");
    } catch (err: any) {
      setError(err.response?.data?.message || "Google sign-up failed. Try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

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
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-background font-black text-primary animate-pulse uppercase tracking-[0.25em]">
        Loading Registration...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden transition-all duration-700 font-sans">
      
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[hsl(var(--primary)/0.08)] rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[hsl(var(--luxury-violet)/0.06)] rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-30 -z-10" />

      <div className="w-full max-w-md p-6 sm:p-2">
        
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-6 ml-2"
        >
          <FiArrowLeft size={12} /> Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-border shadow-2xl relative"
        >
          {/* Header branding */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-black italic mx-auto mb-4 shadow-xl shadow-primary/20 transform -rotate-6">
              B
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">
              Bazaari<span className="text-primary not-italic">.</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-xs font-semibold uppercase tracking-wider">
              Create Free Account
            </p>
          </div>

          {/* Form error warning */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold px-4 py-3 rounded-xl mb-6 text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Inputs grid */}
          <div className="space-y-4">
            
            {/* Full Name field */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <FiUser size={16} />
              </div>
              <Input
                placeholder="Full Name"
                className="pl-12 bg-background/50 border-border focus:ring-2 focus:ring-primary/20 h-12 rounded-xl text-sm font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Email field */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <FiMail size={16} />
              </div>
              <Input
                placeholder="Email address"
                type="email"
                className="pl-12 bg-background/50 border-border focus:ring-2 focus:ring-primary/20 h-12 rounded-xl text-sm font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <FiLock size={16} />
              </div>
              <Input
                placeholder="Password (min 6 characters)"
                type={showPassword ? "text" : "password"}
                className="pl-12 pr-12 bg-background/50 border-border focus:ring-2 focus:ring-primary/20 h-12 rounded-xl text-sm font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleRegister}
            disabled={loading || googleLoading}
            className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 rounded-2xl py-6 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/10 active:scale-95 cursor-pointer"
          >
            {loading ? "Registering account..." : "Start Your Journey"}
          </Button>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60"></div>
            </div>
            <span className="relative z-10 bg-card/40 px-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              or sign up with
            </span>
          </div>

          {/* Google Sign-Up Button (rendered by GSI SDK) */}
          <div className="flex flex-col items-center gap-2">
            {googleLoading && (
              <p className="text-xs font-semibold text-muted-foreground animate-pulse">
                Signing up with Google...
              </p>
            )}
            <div
              ref={googleBtnRef}
              id="google-signup-btn-register"
              className="w-full overflow-hidden rounded-xl"
              style={{ minHeight: 44 }}
            />
          </div>

          {/* Footer */}
          <div className="mt-8 border-t border-border/50 pt-6 text-center">
            <p className="text-xs text-muted-foreground font-semibold">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-black hover:underline"
              >
                Login
              </Link>
            </p>
          </div>

        </motion.div>
      </div>
    </div>
  );
}