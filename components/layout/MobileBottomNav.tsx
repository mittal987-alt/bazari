"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import DynamicIcon from "@/components/common/DynamicIcon";

const navItems = [
  { title: "Browse", href: "/ads", icon: "FiShoppingCart" },
  { title: "Saved", href: "/saved", icon: "FiHeart" },
  { title: "Chats", href: "/messages", icon: "FiMessageCircle" },
  { title: "Profile", href: "/profile", icon: "FiUser" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isChatRoom = pathname?.match(/^\/chats\/[a-zA-Z0-9_-]+$/);
  if (isChatRoom) return null;

  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-50
      bg-background/80 backdrop-blur-lg
      border-t border-border/60 md:hidden
    ">
      <div className="flex justify-around py-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-colors duration-300",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-xl">
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
