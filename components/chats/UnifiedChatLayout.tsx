"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";
import { useUserStore } from "@/store/userStore";
import api from "@/lib/api";
import { 
  FiSearch, FiArrowRight, FiInbox, FiClock, FiZap, 
  FiSend, FiArrowLeft, FiCheck, FiMoreVertical, FiInfo, FiMessageSquare
} from "react-icons/fi";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

type Chat = {
  _id: string;
  buyer: { _id: string; name: string; avatar?: string; lastSeen?: string; email?: string };
  seller: { _id: string; name: string; avatar?: string; lastSeen?: string; email?: string };
  lastMessage: string;
  updatedAt: string;
  unreadCount?: number;
  isTyping?: boolean;
  adId?: { _id: string; title: string; price: number; images?: string[]; description?: string };
};

type Message = {
  _id: string;
  text: string;
  sender: string;
  createdAt?: string;
  status?: "sending" | "sent";
};

type UnifiedChatLayoutProps = {
  activeChatId?: string;
};

export default function UnifiedChatLayout({ activeChatId }: UnifiedChatLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const userId = user?.id;

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeTab, setActiveTab] = useState<"buying" | "selling">("buying");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);

  // Active chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatMeta, setChatMeta] = useState<any>(null);
  const [text, setText] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [negOptions, setNegOptions] = useState<any[]>([]);
  const [loadingNeg, setLoadingNeg] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDesktopChatRoom = !!activeChatId;
  const isMessagesPage = pathname === "/messages";

  // --- 1. LOAD CHATS LIST ---
  const loadChatsList = async () => {
    try {
      const res = await api.get("/chats");
      setChats(res.data.sort((a: Chat, b: Chat) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch (err) {
      console.error("Failed to load chats list", err);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadChatsList();

    if (!socket.connected) socket.connect();
    socket.emit("register_user", userId);

    // Socket Notification Listener (New Messages)
    const handleNewNotification = (data: any) => {
      setChats((prev) => {
        const chatIndex = prev.findIndex((c) => c._id === data.chatId);
        if (chatIndex !== -1) {
          const isCurrentlyActive = activeChatId === data.chatId;
          const updatedChat = { 
            ...prev[chatIndex], 
            lastMessage: data.text,
            updatedAt: new Date().toISOString(),
            unreadCount: isCurrentlyActive ? 0 : (prev[chatIndex].unreadCount || 0) + 1,
            isTyping: false
          };
          const otherChats = prev.filter((_, i) => i !== chatIndex);
          return [updatedChat, ...otherChats];
        }
        loadChatsList();
        return prev;
      });
    };

    // Socket Typing Listener for Sidebar
    const handleTypingStatus = (data: { chatId: string; isTyping: boolean }) => {
      setChats((prev) => 
        prev.map((c) => 
          c._id === data.chatId ? { ...c, isTyping: data.isTyping } : c
        )
      );
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("display_typing", handleTypingStatus);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("display_typing", handleTypingStatus);
    };
  }, [userId, activeChatId]);

  // --- 2. LOAD ACTIVE CHAT ROOM DATA ---
  useEffect(() => {
    if (!activeChatId || !userId) {
      setMessages([]);
      setChatMeta(null);
      setNegOptions([]);
      return;
    }

    const loadActiveChat = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.get(`/chats/${activeChatId}`);
        setMessages(res.data.messages || []);
        setChatMeta(res.data.chat);
        
        // Reset unread count locally in list
        setChats(prev => prev.map(c => c._id === activeChatId ? { ...c, unreadCount: 0 } : c));
      } catch (err) {
        console.error("Failed to load chat details", err);
        router.push("/messages");
      } finally {
        setLoadingMessages(false);
      }
    };

    loadActiveChat();

    if (!socket.connected) socket.connect();
    socket.emit("join_chat", activeChatId);

    // Active Room Listeners
    socket.on("receive_message", (msg: Message) => {
      setMessages((prev) => [...prev, { ...msg, status: "sent" }]);
      setIsOtherTyping(false);
      // Also update last message in sidebar
      setChats((prev) => {
        return prev.map(c => c._id === activeChatId ? {
          ...c,
          lastMessage: msg.text,
          updatedAt: new Date().toISOString()
        } : c);
      });
    });

    socket.on("display_typing", (data: { chatId: string; isTyping: boolean }) => {
      if (data.chatId === activeChatId) {
        setIsOtherTyping(data.isTyping);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("display_typing");
    };
  }, [activeChatId, userId, router]);

  // --- 3. SCROLL TO BOTTOM ---
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages, isOtherTyping]);

  // --- 4. FETCH AI NEGOTIATION SUGGESTIONS ---
  useEffect(() => {
    const ad = chatMeta?.adId;
    if (!ad) return;

    const fetchNegOptions = async () => {
      try {
        setLoadingNeg(true);
        const res = await fetch("/api/ai/negotiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: ad.title,
            originalPrice: ad.price,
            description: ad.description || "",
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setNegOptions(data.options || []);
        }
      } catch (err) {
        console.warn("Failed to fetch negotiation options", err);
      } finally {
        setLoadingNeg(false);
      }
    };

    fetchNegOptions();
  }, [chatMeta?.adId?.title, chatMeta?.adId?.price]);

  // --- 5. HANDLE INPUT & TYPING ---
  const handleInputChange = (val: string) => {
    setText(val);
    if (!userId || !activeChatId) return;

    socket.emit("typing", { chatId: activeChatId, isTyping: true, userId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { chatId: activeChatId, isTyping: false, userId });
    }, 2000);
  };

  // --- 6. SEND MESSAGE ---
  const sendMessage = async () => {
    if (!text.trim() || !userId || !activeChatId) return;

    const messageText = text.trim();
    const tempId = `temp-${Date.now()}`;
    setText("");

    const tempMsg: Message = {
      _id: tempId,
      text: messageText,
      sender: userId,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMsg]);
    socket.emit("typing", { chatId: activeChatId, isTyping: false, userId });

    // Instantly update last message in sidebar
    setChats(prev => prev.map(c => c._id === activeChatId ? {
      ...c,
      lastMessage: messageText,
      updatedAt: new Date().toISOString()
    } : c));

    try {
      const otherUser = chatMeta.buyer._id === userId ? chatMeta.seller : chatMeta.buyer;
      const res = await api.post(`/chats/${activeChatId}`, { text: messageText });
      const saved = { ...res.data, status: "sent" };

      setMessages((prev) => prev.map((m) => (m._id === tempId ? saved : m)));
      
      // Emit message to socket room + recipient notification
      socket.emit("send_message", {
        ...saved,
        recipientId: otherUser?._id
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to send message");
    }
  };

  // --- 7. FILTER & TAB CHATS ---
  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => (activeTab === "buying" ? chat.buyer?._id === userId : chat.seller?._id === userId))
      .filter((chat) => {
        const otherUser = chat.buyer?._id === userId ? chat.seller : chat.buyer;
        const nameMatch = otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const adMatch = chat.adId?.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || adMatch;
      });
  }, [chats, activeTab, userId, searchQuery]);

  const otherUser = chatMeta 
    ? (chatMeta.buyer._id === userId ? chatMeta.seller : chatMeta.buyer)
    : null;
  const ad = chatMeta?.adId;

  // Render Date Dividers in Messages
  const renderMessageFeed = () => {
    const feedElements: React.ReactNode[] = [];
    let lastDateString = "";

    messages.forEach((m, idx) => {
      const msgDate = m.createdAt ? new Date(m.createdAt) : new Date();
      let dateDividerText = "";
      
      if (m.createdAt) {
        if (isToday(msgDate)) {
          dateDividerText = "Today";
        } else if (isYesterday(msgDate)) {
          dateDividerText = "Yesterday";
        } else {
          dateDividerText = format(msgDate, "MMMM d, yyyy");
        }
      }

      if (dateDividerText && dateDividerText !== lastDateString) {
        feedElements.push(
          <div key={`date-${dateDividerText}-${idx}`} className="flex justify-center my-6">
            <span className="text-[10px] font-black text-muted-foreground/60 bg-muted px-4 py-1.5 rounded-full uppercase tracking-[0.15em] border border-border/30">
              {dateDividerText}
            </span>
          </div>
        );
        lastDateString = dateDividerText;
      }

      const isMe = m.sender === userId;
      feedElements.push(
        <motion.div
          key={m._id}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3`}
        >
          <div className={`relative max-w-[80%] md:max-w-[70%] px-5 py-3 rounded-[1.6rem] shadow-sm transition-all duration-300 ${
            isMe 
              ? "bg-primary text-white rounded-br-none" 
              : "bg-card border border-border/80 text-foreground rounded-bl-none"
          }`}>
            <p className="text-sm md:text-base font-medium leading-relaxed break-words">{m.text}</p>
            <div className={`flex items-center gap-1 mt-1 justify-end opacity-60 ${isMe ? "text-white/80" : "text-muted-foreground"}`}>
              <span className="text-[9px] font-bold">
                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
              </span>
              {isMe && (
                m.status === "sending" ? (
                  <FiCheck className="animate-pulse" size={10} />
                ) : (
                  <FiCheck size={10} className="text-white" />
                )
              )}
            </div>
          </div>
        </motion.div>
      );
    });

    return feedElements;
  };

  return (
    <div className={`font-sans flex bg-background text-foreground transition-colors duration-500 overflow-hidden ${
      isMessagesPage ? "h-[calc(100vh-68px)] lg:h-[calc(100vh-80px)] mt-[68px] lg:mt-[80px]" : "h-screen"
    }`}>
      {/* ── LEFT PANEL: CHATS LIST sidebar ── */}
      <aside className={`
        w-full md:w-[360px] lg:w-[420px] shrink-0 border-r border-border/70 flex flex-col bg-card/30 backdrop-blur-xl transition-all duration-300
        ${activeChatId ? "hidden md:flex" : "flex"}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 pb-4 flex flex-col gap-5 border-b border-border/50 bg-card/10">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-2">
              Inbox<span className="text-primary">.</span>
            </h1>
            {!loadingChats && chats.length > 0 && (
              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                {chats.filter(c => c.unreadCount && c.unreadCount > 0).length} Unread
              </span>
            )}
          </div>

          {/* Search bar */}
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-5 py-3.5 bg-muted/50 border border-border rounded-2xl outline-none focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium text-sm text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-muted/60 p-1 rounded-2xl border border-border/50">
            {(["buying", "selling"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? "text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeTab === tab && (
                  <motion.div layoutId="sidebarTab" className="absolute inset-0 bg-background border border-border/40 rounded-xl -z-0" />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Conversations Scroll list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-hide">
          {loadingChats ? (
            <div className="py-20 text-center animate-pulse">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Loading chats...</span>
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map((chat) => {
              const other = chat.buyer?._id === userId ? chat.seller : chat.buyer;
              const isActive = chat._id === activeChatId;
              const isOnline = other?.lastSeen 
                ? (Date.now() - new Date(other.lastSeen).getTime()) < 180000 
                : false;
              const timeLabel = chat.updatedAt 
                ? formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false }) + " ago"
                : "Recently";

              return (
                <Link 
                  key={chat._id} 
                  href={isMessagesPage ? `/messages?chatId=${chat._id}` : `/chats/${chat._id}`}
                  onClick={(e) => {
                    if (isMessagesPage) {
                      e.preventDefault();
                      router.push(`/chats/${chat._id}`);
                    }
                  }}
                  className="block"
                >
                  <div className={`group p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative cursor-pointer ${
                    isActive 
                      ? "bg-primary/[0.07] border-primary/40 shadow-sm" 
                      : "bg-card/40 hover:bg-card border-border/40 hover:border-primary/20 hover:shadow-md"
                  }`}>
                    {/* Active Accent Bar */}
                    {isActive && (
                      <div className="absolute left-0 top-4 bottom-4 w-1 bg-primary rounded-r-md" />
                    )}

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-muted to-muted-foreground/10 border border-border flex items-center justify-center overflow-hidden font-black text-muted-foreground shadow-inner text-base">
                        {other?.avatar ? (
                          <img src={other.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          other?.name?.[0]?.toUpperCase() || "U"
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full shadow-sm" />
                      )}
                    </div>

                    {/* Meta Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-foreground text-sm tracking-tight truncate pr-2">
                          {other?.name}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                          {timeLabel.replace("about ", "")}
                        </span>
                      </div>

                      {/* Product Tag */}
                      {chat.adId && (
                        <div className="text-[10px] font-bold text-primary truncate mb-1 bg-primary/5 px-2 py-0.5 rounded border border-primary/10 w-fit">
                          🏷️ {chat.adId.title}
                        </div>
                      )}

                      {/* Last message / Typing */}
                      <div className="flex justify-between items-center h-4">
                        {chat.isTyping ? (
                          <span className="text-primary text-[11px] font-black animate-pulse uppercase tracking-widest">Typing...</span>
                        ) : (
                          <p className="text-muted-foreground text-xs font-medium truncate pr-4">
                            {chat.lastMessage || "No messages yet"}
                          </p>
                        )}
                        {chat.unreadCount && chat.unreadCount > 0 && !chat.isTyping && !isActive && (
                          <span className="bg-primary text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] px-1 flex items-center justify-center rounded-full shadow-md">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-20 bg-card/25 rounded-2xl border border-dashed border-border/60 flex flex-col items-center p-6">
              <FiInbox className="text-3xl text-muted-foreground/40 mb-4" />
              <h4 className="text-sm font-black text-foreground uppercase tracking-wider">No Conversations</h4>
              <p className="text-xs text-muted-foreground mt-1 text-center font-medium max-w-[200px]">
                Try listing some items or reaching out to sellers.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ── RIGHT PANEL: ACTIVE CHAT ROOM ── */}
      <main className={`
        flex-1 flex flex-col bg-background relative transition-all duration-300
        ${!activeChatId ? "hidden md:flex" : "flex"}
      `}>
        <AnimatePresence mode="wait">
          {!activeChatId ? (
            /* Welcome Slate (If no chat selected) */
            <motion.div 
              key="welcome-slate"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 flex flex-col items-center justify-center p-8 bg-dot-grid"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/5">
                <FiMessageSquare size={30} />
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">Your Deals Command Center</h3>
              <p className="text-muted-foreground text-xs mt-2 max-w-xs text-center font-medium leading-relaxed uppercase tracking-wider">
                Select a conversation from the sidebar to chat, negotiate, and unlock exclusive AI-suggested counter offers.
              </p>
              <Link 
                href="/ads" 
                className="mt-8 bg-foreground hover:bg-primary text-background hover:text-white px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg border border-border"
              >
                Browse Marketplace
              </Link>
            </motion.div>
          ) : (
            /* Active Chat Room */
            <motion.div 
              key="active-chat-room"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Active Chat Header */}
              <header className="bg-card/75 backdrop-blur-md border-b border-border/80 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  {/* Back button (Mobile view toggle / go back) */}
                  <Link 
                    href="/messages"
                    onClick={(e) => {
                      if (isMessagesPage) {
                        e.preventDefault();
                        router.push("/messages");
                      }
                    }}
                    className="p-2.5 hover:bg-muted rounded-xl transition-colors md:hidden text-foreground border border-border/40"
                  >
                    <FiArrowLeft size={18} />
                  </Link>

                  {/* Avatar & User Details */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-violet-500 text-white flex items-center justify-center font-black shadow-lg shadow-primary/10 text-base">
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} className="w-full h-full object-cover rounded-xl" alt="" />
                      ) : (
                        otherUser?.name?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight text-foreground leading-none">
                        {otherUser?.name}
                      </h2>
                      <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-1 block">
                        Active Deals
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ad Preview Mini-Card */}
                {ad && (
                  <Link 
                    href={`/ads/${ad._id}`}
                    className="flex items-center gap-3 bg-muted/50 hover:bg-muted hover:border-primary/20 border border-border p-2 pr-4 rounded-2xl max-w-[240px] transition-all group cursor-pointer"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-background bg-card">
                      {ad.images?.[0] ? (
                        <img src={ad.images[0]} className="object-cover w-full h-full" alt="" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">No Image</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                        {ad.title}
                      </p>
                      <p className="text-[10px] text-primary font-black mt-0.5 leading-none">
                        ₹{ad.price?.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                )}
              </header>

              {/* Messages Feed Viewport */}
              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary animate-pulse">Synchronizing deal chat...</span>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {messages.length === 0 && (
                      <div className="text-center py-16 flex flex-col items-center">
                        <span className="text-[10px] font-black text-muted-foreground/60 bg-muted px-4 py-1.5 rounded-full uppercase tracking-widest border border-border/30 mb-4">Chat Started</span>
                        <p className="text-xs text-muted-foreground font-medium">Say hello to kickstart negotiations!</p>
                      </div>
                    )}
                    {renderMessageFeed()}

                    {/* Typing Animation Bubble */}
                    {isOtherTyping && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                        <div className="bg-card border border-border px-5 py-3 rounded-[1.5rem] rounded-bl-none flex gap-1 items-center shadow-sm">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </motion.div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                )}
              </div>

              {/* Bottom Chat Input Form Area */}
              <div className="bg-card/90 border-t border-border p-4 pb-6 shrink-0 space-y-4">
                {/* AI Offer Pill Suggestions */}
                {ad && negOptions.length > 0 && (
                  <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> AI Suggestions:
                    </span>
                    {negOptions.slice(0, 3).map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleInputChange(opt.text)}
                        className="px-3.5 py-1.5 bg-muted hover:bg-primary hover:text-white border border-border hover:border-primary rounded-full transition-all duration-300 font-bold text-[9px] text-muted-foreground uppercase tracking-widest"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Input Text Field */}
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type message here..."
                    className="flex-1 bg-muted/60 border border-border rounded-full px-6 py-4 outline-none focus:ring-4 focus:ring-primary/5 focus:bg-card transition-all font-medium text-sm text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!text.trim()}
                    className="w-14 h-14 bg-foreground hover:bg-primary disabled:bg-muted text-background hover:text-white disabled:text-muted-foreground rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md shadow-muted shrink-0 cursor-pointer"
                  >
                    <FiSend size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
