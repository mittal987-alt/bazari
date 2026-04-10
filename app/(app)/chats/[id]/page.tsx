"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiSend, FiArrowLeft, FiMoreVertical, FiInfo, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";
import Image from "next/image";

type Message = {
  _id: string;
  text: string;
  sender: string;
  createdAt?: string;
  status?: "sending" | "sent";
};

export default function PremiumChatRoom() {
  const { id } = useParams();
  const router = useRouter();
  const chatId = String(id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatMeta, setChatMeta] = useState<any>(null);
  const [text, setText] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user } = useUserStore();
  const userId = user?.id;

  // --- INITIAL LOAD & SOCKET JOIN ---
  useEffect(() => {
    if (!chatId || !userId) return;

    const loadChat = async () => {
      try {
        const res = await api.get(`/chats/${chatId}`);
        setMessages(res.data.messages || []);
        setChatMeta(res.data.chat);
      } catch (err) {
        router.push("/messages");
      } finally {
        setLoading(false);
      }
    };

    loadChat();

    if (!socket.connected) socket.connect();
    socket.emit("join_chat", chatId);

    // Listeners
    socket.on("receive_message", (msg: Message) => {
      setMessages((prev) => [...prev, { ...msg, status: "sent" }]);
      setIsOtherTyping(false);
    });

    socket.on("display_typing", (data: { chatId: string; isTyping: boolean }) => {
      if (data.chatId === chatId) setIsOtherTyping(data.isTyping);
    });

    return () => {
      socket.off("receive_message");
      socket.off("display_typing");
    };
  }, [chatId, userId, router]);

  // --- SCROLL TO BOTTOM ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  // --- TYPING LOGIC ---
  const handleInputChange = (val: string) => {
    setText(val);
    
    // Emit "typing" to socket
    socket.emit("typing", { chatId, isTyping: true, userId });

    // Stop typing indicator after 2 seconds of no input
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { chatId, isTyping: false, userId });
    }, 2000);
  };

  // --- SEND LOGIC ---
  const sendMessage = async () => {
    if (!text.trim() || !userId) return;

    const messageText = text.trim();
    const tempId = `temp-${Date.now()}`;
    setText("");

    // Optimistic Update
    const tempMsg: Message = {
      _id: tempId,
      text: messageText,
      sender: userId,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMsg]);
    socket.emit("typing", { chatId, isTyping: false, userId });

    try {
      const res = await api.post(`/chats/${chatId}`, { text: messageText });
      const saved = { ...res.data, status: "sent" };

      setMessages((prev) => prev.map((m) => (m._id === tempId ? saved : m)));
      socket.emit("send_message", saved);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to send");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">Initializing Secure Chat...</div>;

  if (!chatMeta) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Chat not found.</div>;

  const otherUser = chatMeta.buyer._id === userId ? chatMeta.seller : chatMeta.buyer;
  const ad = chatMeta.adId;

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FB] text-slate-900 font-sans">
      
      {/* HEADER: USER & AD INFO */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <FiArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-200">
                {otherUser?.name?.[0]}
              </div>
              <div>
                <h2 className="font-black tracking-tight leading-none">{otherUser?.name}</h2>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">Online</p>
              </div>
            </div>
          </div>

          {/* Ad Mini-Card */}
          {ad && (
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-2xl border border-slate-100 max-w-[200px]">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white">
                <Image src={ad.images?.[0] || "/placeholder.png"} fill className="object-cover" alt="ad" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold truncate">{ad.title}</p>
                <p className="text-[10px] text-blue-600 font-black">₹{ad.price?.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MESSAGES AREA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">End-to-end Encrypted</span>
          </div>

          <AnimatePresence initial={false}>
            {messages.map((m, idx) => {
              const isMe = m.sender === userId;
              const isLast = idx === messages.length - 1;

              return (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}
                >
                  <div className={`relative max-w-[80%] md:max-w-[60%] px-5 py-3 rounded-[1.8rem] shadow-sm ${
                    isMe ? "bg-[#1A1C21] text-white rounded-br-none" : "bg-white border border-slate-100 rounded-bl-none"
                  }`}>
                    <p className="text-sm md:text-base font-medium leading-relaxed">{m.text}</p>
                    <div className={`flex items-center gap-1 mt-1 justify-end opacity-50 ${isMe ? "text-white" : "text-slate-400"}`}>
                      <span className="text-[9px] font-bold">
                        {new Date(m.createdAt || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        m.status === "sending" ? <FiCheck className="animate-pulse" size={10} /> : <FiCheck size={10} className="text-blue-400" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing Indicator Bubble */}
          {isOtherTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
              <div className="bg-white border border-slate-100 px-5 py-3 rounded-[1.5rem] rounded-bl-none flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </main>

      {/* INPUT SECTION */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 pb-8">
        <div className="max-w-4xl mx-auto relative flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={text}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Start typing your message..."
              className="w-full bg-slate-100/50 border border-slate-200 rounded-[2rem] px-6 py-4 outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all font-medium"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="w-14 h-14 bg-[#1A1C21] hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-slate-200 active:scale-90 shrink-0"
          >
            <FiSend size={22} className={text.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}