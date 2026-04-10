"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import DynamicIcon from "@/components/common/DynamicIcon";

const navItems = [
  { title: "Browse", href: "/ads", icon: "FiShoppingCart" },
  { title: "Saved", href: "/saved", icon: "FiHeart" },
  { title: "Chats", href: "/chats", icon: "FiMessageCircle" },
  { title: "Profile", href: "/profile", icon: "FiUser" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-50
      bg-white dark:bg-neutral-900
      border-t md:hidden
    ">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center text-xs transition",
                active
                  ? "text-blue-600"
                  : "text-gray-500"
              )}
            >
              <span className="text-lg">
                <DynamicIcon iconName={item.icon} />
              </span>
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
