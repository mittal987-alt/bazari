"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";
import { FiSearch, FiArrowRight, FiInbox, FiClock, FiZap } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

type Chat = {
  _id: string;
  buyer: { _id: string; name: string; avatar?: string; lastSeen?: string };
  seller: { _id: string; name: string; avatar?: string; lastSeen?: string };
  lastMessage: string;
  updatedAt: string;
  unreadCount?: number;
  isTyping?: boolean; // Real-time state
};

export default function PremiumMessagesWithTyping() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeTab, setActiveTab] = useState<"buying" | "selling">("buying");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useUserStore();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const loadChats = async () => {
      try {
        const res = await api.get("/chats");
        setChats(res.data.sort((a: Chat, b: Chat) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ));
      } catch (err) {
        console.error("Failed to load chats");
      }
    };

    loadChats();

    if (!socket.connected) socket.connect();
    socket.emit("register_user", userId);

    // --- SOCKET LISTENERS ---

    // 1. Handle New Message
    const handleNewNotification = (data: any) => {
      setChats((prev) => {
        const chatIndex = prev.findIndex((c) => c._id === data.chatId);
        if (chatIndex !== -1) {
          const updatedChat = { 
            ...prev[chatIndex], 
            lastMessage: data.text,
            updatedAt: new Date().toISOString(),
            unreadCount: (prev[chatIndex].unreadCount || 0) + 1,
            isTyping: false // Stop typing when message arrives
          };
          const otherChats = prev.filter((_, i) => i !== chatIndex);
          return [updatedChat, ...otherChats];
        }
        loadChats();
        return prev;
      });
    };

    // 2. Handle Typing Start/Stop
    const handleTyping = (data: { chatId: string; isTyping: boolean }) => {
      setChats((prev) => 
        prev.map((c) => 
          c._id === data.chatId ? { ...c, isTyping: data.isTyping } : c
        )
      );
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("display_typing", handleTyping);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("display_typing", handleTyping);
    };
  }, [userId]);

  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => (activeTab === "buying" ? chat.buyer?._id === userId : chat.seller?._id === userId))
      .filter((chat) => {
        const otherUser = chat.buyer?._id === userId ? chat.seller : chat.buyer;
        return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase() || "");
      });
  }, [chats, activeTab, userId, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FBFBFE] pt-24 pb-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Global Network</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-slate-900 leading-none">
              Inbox<span className="text-blue-600">.</span>
            </h1>
          </div>

          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
            <input 
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] w-full md:w-80 outline-none shadow-xl shadow-slate-200/40 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium text-sm"
            />
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex gap-2 mb-10 bg-slate-100/50 p-1.5 rounded-[2rem] w-fit border border-slate-200/50">
          {(["buying", "selling"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-12 py-3 rounded-[1.8rem] text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? "text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {activeTab === tab && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-slate-900 rounded-[1.8rem] -z-0" />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>

        {/* CHAT LIST */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <ChatCard key={chat._id} chat={chat} userId={userId!} />
              ))
            ) : (
              <EmptyMessages />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ChatCard({ chat, userId }: { chat: Chat; userId: string }) {
  const otherUser = chat.buyer?._id === userId ? chat.seller : chat.buyer;
  
  const timeLabel = chat.updatedAt 
    ? formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false })
    : "Recently";

  const isOnline = otherUser?.lastSeen 
    ? (Date.now() - new Date(otherUser.lastSeen).getTime()) < 180000 
    : false;

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Link href={`/chats/${chat._id}`} className="block group">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group-hover:shadow-2xl group-hover:shadow-blue-500/10 group-hover:border-blue-100/50 transition-all flex items-center gap-6 relative">
          
          {/* AVATAR */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border border-slate-100 shadow-inner overflow-hidden">
              {otherUser?.avatar ? (
                <img src={otherUser.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-xl font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                  {otherUser?.name?.[0]}
                </span>
              )}
            </div>
            {isOnline && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full shadow-sm" />
            )}
          </div>

          {/* CONTENT */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-800 text-lg tracking-tight truncate">{otherUser?.name}</h4>
                <div className="flex items-center gap-0.5 bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded-full border border-blue-100">
                  <FiZap className="fill-blue-600" /> PRO USER
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-slate-400 uppercase tracking-widest transition-colors">
                {timeLabel}
              </span>
            </div>
            
            <div className="flex justify-between items-center h-5">
              {chat.isTyping ? (
                <div className="flex items-center gap-1.5">
                  <p className="text-blue-600 text-sm font-bold animate-pulse">Typing</p>
                  <div className="flex gap-1">
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-blue-600 rounded-full" />
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-blue-600 rounded-full" />
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-blue-600 rounded-full" />
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm font-medium truncate pr-10 group-hover:text-slate-700 transition-colors">
                  {chat.lastMessage || "No messages yet"}
                </p>
              )}
              
              {(chat.unreadCount || 0) > 0 && !chat.isTyping && (
                <span className="bg-blue-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-blue-200">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-50 items-center justify-center text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <FiArrowRight size={20} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyMessages() {
  return (
    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
      <FiInbox className="text-5xl text-slate-200 mb-6 rotate-12" />
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Clear as day</h3>
      <p className="text-slate-400 text-sm mt-2 max-w-xs font-medium mb-8">No active conversations found. Try reaching out to some sellers!</p>
      <Link href="/" className="bg-[#1A1C21] text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all">
        Browse Marketplace
      </Link>
    </div>
  );
}