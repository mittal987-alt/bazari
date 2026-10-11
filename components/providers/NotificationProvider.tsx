"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { AnimatePresence, motion } from "framer-motion";
import { FiMessageCircle, FiX, FiTrendingDown, FiSearch, FiBell } from "react-icons/fi";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/store/userStore";

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<any>(null);
  const pathname = usePathname();
  const { user } = useUserStore();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    // Connect to socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Register user for personal notifications
    socket.emit("register_user", userId);

    const handleNotification = (data: any) => {
      // Don't show toast if we are already in that specific chat room
      if (data.chatId && pathname === `/chats/${data.chatId}`) {
        return;
      }
      
      setNotification(data);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setNotification(null);
      }, 6000);
    };

    socket.on("new_notification", handleNotification);

    return () => {
      socket.off("new_notification", handleNotification);
    };
  }, [pathname, userId]);

  const targetLink = notification?.link || (notification?.chatId ? `/chats/${notification.chatId}` : "/ads");
  const notifTitle = notification?.title || (notification?.chatId ? "New Message" : "Marketplace Alert");
  const notifText = notification?.text || notification?.message || "";

  return (
    <>
      {children}
      
      {/* Toast Notification */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-card rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-border p-4 w-80 flex items-start gap-4"
            >
              <div className="bg-primary/10 text-primary p-3 rounded-xl shrink-0">
                {notification.type === "price_drop" ? (
                  <FiTrendingDown size={20} className="text-emerald-500" />
                ) : notification.type === "saved_search_match" ? (
                  <FiSearch size={20} className="text-blue-500" />
                ) : notification.type === "new_message" || notification.type === "seller_inquiry" ? (
                  <FiMessageCircle size={20} className="text-primary" />
                ) : (
                  <FiBell size={20} className="text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 truncate">
                  {notifTitle}
                </p>
                <p className="text-sm font-bold text-foreground line-clamp-2">
                  {notifText}
                </p>
                <Link 
                  href={targetLink}
                  onClick={() => setNotification(null)}
                  className="text-xs text-muted-foreground hover:text-primary font-semibold mt-2 inline-block transition-colors"
                >
                  View Details →
                </Link>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
              >
                <FiX size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
