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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          Buy & Sell Anything
          <span className="block text-blue-500 mt-2">
            Near You
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
          A trusted marketplace where buyers and sellers meet.
          Post ads, discover great deals, and connect instantly.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 transition text-white font-semibold"
          >
            Get Started Free
          </Link>

          <Link
            href="/login"
            className="px-8 py-3 rounded-full border border-white/30 hover:bg-white/10 transition font-semibold"
          >
            I Already Have an Account
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-black/40 py-20">
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
      <footer className="border-t border-white/10 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} OLX Clone. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 p-6 bg-white/5 backdrop-blur hover:bg-white/10 transition">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-gray-300 text-sm">{desc}</p>
    </div>
  );
}
