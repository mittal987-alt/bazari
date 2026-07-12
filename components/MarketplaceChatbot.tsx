"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Product {
  _id: string;
  title: string;
  price: number;
  category: string;
  locationName: string;
  images: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  products?: Product[];
}

export default function MarketplaceChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "ai",
      content: "Hi! I'm your AI marketplace assistant. How can I help you find the best products today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            content: data.answer,
            products: data.products,
          },
        ]);
      } else {
        throw new Error(data.error || "Failed to fetch response");
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: "Sorry, I encountered an error connecting to my servers.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 z-50 ${isOpen ? 'hidden' : 'block'}`}
        aria-label="Open AI Chat"
      >
        <MessageCircle size={28} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[90vw] max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 dark:border-gray-800" style={{ height: '80vh', maxHeight: '700px' }}>
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MessageCircle size={20} />
                AI Assistant
              </h3>
              <p className="text-xs text-blue-100 opacity-80">Powered by Mistral AI</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl ${msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-none"
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Product Cards */}
                {msg.products && msg.products.length > 0 && (
                  <div className="flex overflow-x-auto gap-3 py-3 w-full max-w-full pb-2 snap-x scrollbar-hide">
                    {msg.products.map((product) => (
                      <div key={product._id} className="min-w-[160px] flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm snap-start">
                        <div className="h-24 bg-gray-200 relative">
                          {product.images?.[0] ? (
                            <Image src={product.images[0]} alt={product.title} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                          )}
                        </div>
                        <div className="p-2">
                          <h4 className="text-xs font-semibold truncate" title={product.title}>{product.title}</h4>
                          <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mt-1">₹{product.price}</p>
                          <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            <span>{product.category}</span>
                            <span className="truncate max-w-[60px]">{product.locationName}</span>
                          </div>
                          <Link href={`/ads/${product._id}`} className="mt-2 block text-center text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-1.5 rounded transition-colors w-full">
                            Open Listing
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950 flex gap-2 overflow-x-auto scrollbar-hide">
              {["Find laptops under ₹50,000", "Show me cheap bikes", "Best DSLR cameras"].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(q)}
                  className="whitespace-nowrap text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-100 dark:bg-gray-800 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-0 rounded-full px-4 py-2 text-sm outline-none transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
