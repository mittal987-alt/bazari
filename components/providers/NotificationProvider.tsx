"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { AnimatePresence, motion } from "framer-motion";
import { FiMessageCircle, FiX } from "react-icons/fi";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // Connect to socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Register user for personal notifications
    socket.emit("register_user", userId);

    socket.on("new_notification", (data) => {
      // Don't show toast if we are already in that specific chat room
      if (pathname === `/chats/${data.chatId}`) {
        return;
      }
      
      setNotification(data);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    });

    return () => {
      socket.off("new_notification");
    };
  }, [pathname]);

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
                <FiMessageCircle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                  New Message
                </p>
                <p className="text-sm font-bold text-foreground truncate">
                  {notification.text}
                </p>
                <Link 
                  href={`/chats/${notification.chatId}`}
                  onClick={() => setNotification(null)}
                  className="text-xs text-muted-foreground hover:text-primary font-semibold mt-2 inline-block transition-colors"
                >
                  View Conversation →
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
