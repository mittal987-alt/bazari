"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

export default function HomePage() {
  const { user, authChecked } = useUserStore();
  const router = useRouter();

  // Redirect logged-in users
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

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-700 relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40 shrink-0" />
      <div className="relative z-10">

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          Buy & Sell Anything
          <span className="block text-primary mt-2">
            Near You
          </span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          A trusted marketplace where buyers and sellers meet.
          Post ads, discover great deals, and connect instantly.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full bg-primary hover:bg-primary/90 transition text-primary-foreground font-semibold shadow-lg"
          >
            Get Started Free
          </Link>

          <Link
            href="/login"
            className="px-8 py-3 rounded-full border border-border hover:bg-muted transition font-semibold"
          >
            I Already Have an Account
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-muted/30 py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 grid gap-8 md:grid-cols-3">

          <FeatureCard
            icon="🛒"
            title="Buy Easily"
            desc="Browse thousands of ads nearby and find the best deals."
          />

          <FeatureCard
            icon="📦"
            title="Sell Anything"
            desc="Post ads in seconds and reach real buyers instantly."
          />

          <FeatureCard
            icon="💬"
            title="Chat Securely"
            desc="Connect with buyers and sellers through in-app chat."
          />

        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold">
          Ready to start buying or selling?
        </h2>

        <Link
          href="/register"
          className="inline-block mt-6 px-10 py-3 rounded-full bg-green-600 hover:bg-green-700 transition font-semibold"
        >
          Create Free Account
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 text-center text-sm text-muted-foreground bg-card/40 backdrop-blur-md">
        © {new Date().getFullYear()} Bazaari. All rights reserved.
      </footer>
    </div>
  </div>
);
}

function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="dashboard-card p-10 group bg-card/50 backdrop-blur-md border-border/40 hover:bg-card">
      <div className="text-6xl mb-8 group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <h3 className="text-2xl font-black text-foreground tracking-tighter">{title}</h3>
      <p className="mt-4 text-muted-foreground/80 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
