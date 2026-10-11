"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBell,
  FiTrendingDown,
  FiSearch,
  FiMessageCircle,
  FiShield,
  FiCheck,
  FiX,
  FiClock,
} from "react-icons/fi";
import api from "@/lib/api";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useUserStore();
  const userId = user?.id;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await api.get("/notifications", { params: { limit: 15 } });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Sockets/HTTP offline fallback
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time socket listener
  useEffect(() => {
    if (!userId) return;

    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("register_user", userId);

    const handleNewNotif = (data: any) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [
        {
          _id: data._id || String(Date.now()),
          type: data.type || "general",
          title: data.title || "Notification",
          message: data.text || data.message || "",
          link: data.link || "",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    };

    socket.on("new_notification", handleNewNotif);
    return () => {
      socket.off("new_notification", handleNewNotif);
    };
  }, [userId]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string, link?: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const deleted = notifications.find((n) => n._id === id);
      if (deleted && !deleted.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "price_drop":
        return <FiTrendingDown className="text-emerald-500" size={16} />;
      case "saved_search_match":
        return <FiSearch className="text-blue-500" size={16} />;
      case "buyer_inquiry":
        return <FiMessageCircle className="text-purple-500" size={16} />;
      case "listing_moderation":
        return <FiShield className="text-amber-500" size={16} />;
      default:
        return <FiBell className="text-primary" size={16} />;
    }
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-full hover:bg-muted text-foreground/80 hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <FiBell className="text-primary" size={16} />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors uppercase tracking-wider"
                >
                  <FiCheck size={13} /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/60">
              {loading && notifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <FiBell className="mx-auto text-muted-foreground/30 mb-2" size={32} />
                  <p className="text-xs font-bold text-muted-foreground">
                    No notifications yet
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Saved search matches and price-drop alerts will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => markAsRead(notif._id, notif.link)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-muted/40 transition-colors cursor-pointer group ${
                      !notif.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-muted shrink-0 mt-0.5">
                      {getTypeIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            !notif.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80"
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FiClock size={10} />
                          {new Date(notif.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>

                        <button
                          onClick={(e) => deleteNotification(notif._id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity p-0.5"
                          title="Dismiss"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-border bg-muted/20 text-center">
              <Link
                href="/dashboard/buyer"
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
              >
                Manage Saved Searches & Alerts →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
