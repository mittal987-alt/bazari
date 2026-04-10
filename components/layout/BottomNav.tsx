"use client";

import { Home, Search, Plus, User } from "lucide-react";
import Link from "next/link";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50">
      <div className="flex justify-around py-2">

        <Link href="/" className="flex flex-col items-center text-xs">
          <Home size={20} />
          Home
        </Link>

        <Link href="/search" className="flex flex-col items-center text-xs">
          <Search size={20} />
          Search
        </Link>

        <Link
          href="/create-ad"
          className="bg-blue-600 text-white rounded-full p-3 -mt-6 shadow-lg"
        >
          <Plus size={22} />
        </Link>

        <Link href="/login" className="flex flex-col items-center text-xs">
          <User size={20} />
          Account
        </Link>

      </div>
    </nav>
  );
}
