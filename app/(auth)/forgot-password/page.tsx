"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiMail, FiArrowLeft, FiCheckCircle } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [googleOnly, setGoogleOnly] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      if (res.data?.googleOnly) {
        setGoogleOnly(true);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden font-sans">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[hsl(var(--primary)/0.08)] rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-30 -z-10" />

      <div className="w-full max-w-md px-6 sm:px-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-6 ml-2"
        >
          <FiArrowLeft size={12} /> Back to login
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-border shadow-2xl"
        >
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-black italic mx-auto mb-4 shadow-xl shadow-primary/20 transform -rotate-6">
              B
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">
              Forgot Password<span className="text-primary not-italic">?</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-xs font-semibold uppercase tracking-wider">
              We'll send you a reset link
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Success state */}
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiCheckCircle className="text-emerald-500" size={28} />
                </div>
                <h2 className="text-base font-black text-foreground uppercase tracking-tight mb-2">
                  Check your inbox!
                </h2>
                <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-6">
                  If <span className="text-foreground font-bold">{email}</span> is registered, we've sent a password reset link. Check spam if you don't see it.
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Link expires in <span className="text-primary">1 hour</span>
                </p>
                <Button
                  onClick={() => { setSent(false); setEmail(""); }}
                  variant="outline"
                  className="mt-6 w-full rounded-2xl font-black uppercase tracking-widest text-[10px] h-11 border-border hover:bg-muted/30"
                >
                  Send another link
                </Button>
              </motion.div>
            ) : googleOnly ? (
              /* Google-only account state */
              <motion.div
                key="google"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <h2 className="text-base font-black text-foreground uppercase tracking-tight mb-2">
                  Google Account
                </h2>
                <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-6">
                  This account was created with Google Sign-In and doesn't have a password. Please log in with Google instead.
                </p>
                <Link href="/login">
                  <Button className="w-full rounded-2xl font-black uppercase tracking-widest text-[10px] h-11 bg-primary shadow-lg shadow-primary/20">
                    Go to Login
                  </Button>
                </Link>
              </motion.div>
            ) : (
              /* Default form state */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold px-4 py-3 rounded-xl mb-5 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-5 text-center">
                  Enter the email address linked to your account and we'll send you a link to reset your password.
                </p>

                <div className="relative mb-5">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <FiMail size={16} />
                  </div>
                  <Input
                    type="email"
                    placeholder="Your email address"
                    className="pl-12 bg-background/50 border-border focus:ring-2 focus:ring-primary/20 h-12 rounded-xl text-sm font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 rounded-2xl py-6 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/10 active:scale-95"
                >
                  {loading ? "Sending reset link..." : "Send Reset Link"}
                </Button>

                <p className="text-center text-xs text-muted-foreground font-semibold mt-6">
                  Remembered it?{" "}
                  <Link href="/login" className="text-primary font-black hover:underline">
                    Back to Login
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
