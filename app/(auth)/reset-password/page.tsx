"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token/email are present
  const isValidLink = Boolean(token && email);

  // Password strength
  const getStrength = (pw: string) => {
    if (pw.length === 0) return { level: 0, label: "", color: "" };
    if (pw.length < 6) return { level: 1, label: "Too short", color: "bg-rose-500" };
    if (pw.length < 8) return { level: 2, label: "Weak", color: "bg-orange-500" };
    if (/(?=.*[A-Z])(?=.*[0-9])/.test(pw))
      return { level: 4, label: "Strong", color: "bg-emerald-500" };
    return { level: 3, label: "Good", color: "bg-yellow-500" };
  };
  const strength = getStrength(password);

  const handleReset = async () => {
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await api.post("/auth/reset-password", { token, email, password });
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => router.replace("/login"), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Reset failed. The link may have expired."
      );
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
              Reset Password<span className="text-primary not-italic">.</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-xs font-semibold uppercase tracking-wider">
              Choose a strong new password
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Invalid link */}
            {!isValidLink ? (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiAlertCircle className="text-rose-500" size={28} />
                </div>
                <h2 className="text-base font-black text-foreground uppercase tracking-tight mb-2">
                  Invalid Link
                </h2>
                <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-6">
                  This reset link is invalid or malformed. Please request a new one.
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full rounded-2xl font-black uppercase tracking-widest text-[10px] h-11 bg-primary shadow-lg shadow-primary/20">
                    Request New Link
                  </Button>
                </Link>
              </motion.div>
            ) : success ? (
              /* Success state */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiCheckCircle className="text-emerald-500" size={28} />
                </div>
                <h2 className="text-base font-black text-foreground uppercase tracking-tight mb-2">
                  Password Updated!
                </h2>
                <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-6">
                  Your password has been reset successfully. Redirecting you to login...
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                </div>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="mt-6 w-full rounded-2xl font-black uppercase tracking-widest text-[10px] h-11 border-border"
                  >
                    Go to Login Now
                  </Button>
                </Link>
              </motion.div>
            ) : (
              /* Reset form */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {email && (
                  <p className="text-center text-xs text-muted-foreground mb-5 font-medium">
                    Resetting password for{" "}
                    <span className="text-foreground font-bold">{email}</span>
                  </p>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold px-4 py-3 rounded-xl mb-5 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  {/* New Password */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <FiLock size={16} />
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="New password"
                        className="pl-12 pr-12 bg-background/50 border-border focus:ring-2 focus:ring-primary/20 h-12 rounded-xl text-sm font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                    {/* Strength indicator */}
                    {password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i <= strength.level
                                  ? strength.color
                                  : "bg-border"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-[10px] font-bold ${
                          strength.level === 1 ? "text-rose-500" :
                          strength.level === 2 ? "text-orange-500" :
                          strength.level === 3 ? "text-yellow-500" :
                          "text-emerald-500"
                        }`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <FiLock size={16} />
                    </div>
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      className={`pl-12 pr-12 bg-background/50 h-12 rounded-xl text-sm font-medium border focus:ring-2 focus:ring-primary/20 ${
                        confirmPassword && confirmPassword !== password
                          ? "border-rose-500/50"
                          : confirmPassword && confirmPassword === password
                          ? "border-emerald-500/50"
                          : "border-border"
                      }`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReset()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 rounded-2xl py-6 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/10 active:scale-95"
                >
                  {loading ? "Updating password..." : "Reset Password"}
                </Button>

                <p className="text-center text-xs text-muted-foreground font-semibold mt-5">
                  Link expired?{" "}
                  <Link
                    href="/forgot-password"
                    className="text-primary font-black hover:underline"
                  >
                    Request a new one
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-background font-black text-primary animate-pulse uppercase tracking-[0.25em]">
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
