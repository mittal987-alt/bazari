"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiShoppingCart, FiPackage, FiMessageCircle, FiShield, FiZap, 
  FiTrendingUp, FiCheckCircle, FiChevronRight, FiUsers, FiLock 
} from "react-icons/fi";

type SimMessage = {
  id: number;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
};

export default function HomePage() {
  const { user, authChecked } = useUserStore();
  const router = useRouter();

  // 1. Redirect logged-in users to their corresponding dashboards
  useEffect(() => {
    if (authChecked && user) {
      if (user.role === "admin") {
        router.replace("/dashboard/admin");
      } else if (user.role === "seller") {
        router.replace("/dashboard/seller");
      } else {
        router.replace("/dashboard/buyer");
      }
    }
  }, [authChecked, user, router]);

  // 2. State for the interactive AI Bargaining Simulator widget
  const [simStep, setSimStep] = useState(0);
  const [simInput, setSimInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [simMessages, setSimMessages] = useState<SimMessage[]>([
    {
      id: 1,
      sender: "bot",
      text: "Hey there! I am selling my Sony WH-1000XM5 headphones. They are practically brand new. I'm asking for ₹24,000.",
      timestamp: "12:00 PM"
    }
  ]);

  const simOffers = [
    { label: "Offer ₹19,000", text: "Would you take ₹19,000 for them?" },
    { label: "Offer ₹21,500", text: "How about we meet in the middle at ₹21,500?" },
    { label: "Ask for Discount", text: "Is there any room for discount if I purchase today?" }
  ];

  const handleSimSubmit = (offerText: string) => {
    if (!offerText.trim() || isTyping) return;

    // Add user message
    const userMsg: SimMessage = {
      id: Date.now(),
      sender: "user",
      text: offerText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSimMessages(prev => [...prev, userMsg]);
    setSimInput("");
    setIsTyping(true);

    // Simulate bot response after 1.5 seconds
    setTimeout(() => {
      let botResponse = "";
      const lower = offerText.toLowerCase();

      if (lower.includes("19,000") || lower.includes("19000")) {
        botResponse = "₹19,000 is a bit too low for me. I've only used them for a week. How about ₹22,000 and we call it a deal?";
      } else if (lower.includes("21,500") || lower.includes("21500")) {
        botResponse = "₹21,500 sounds very reasonable! I can agree to that if you can handle local pick-up or fast shipping. Let's do it!";
      } else if (lower.includes("discount")) {
        botResponse = "I could do ₹22,500 if you buy right now, and I'll include the original premium carrying case for free!";
      } else {
        botResponse = "Hmm, I can offer you a fair discount of ₹1,500 off the listing price, making it ₹22,500. What do you think?";
      }

      setSimMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "bot",
        text: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
      setSimStep(prev => prev + 1);
    }, 1500);
  };

  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-background font-black text-primary animate-pulse uppercase tracking-[0.25em]">
        Loading Bazaari...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-700 relative overflow-hidden font-sans selection:bg-primary/10">
      
      {/* ── AMBIENT NEON GLOWS ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[hsl(var(--primary)/0.08)] rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="absolute top-[35%] right-[-10%] w-[450px] h-[450px] bg-[hsl(var(--luxury-violet)/0.06)] rounded-full blur-[130px] pointer-events-none -z-0" />
      <div className="absolute bottom-[5%] left-[5%] w-[400px] h-[400px] bg-[hsl(var(--luxury-rose)/0.06)] rounded-full blur-[120px] pointer-events-none -z-0" />
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-30 -z-0" />

      <div className="relative z-10">
        
        {/* ── 1. HERO SECTION ── */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 md:pt-36 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Brand Value Pitch */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-[10px] font-black uppercase tracking-[0.25em]">AI-Powered Peer-to-Peer Marketplace</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-tight"
            >
              Buy & Sell Anything <br />
              <span className="bg-gradient-to-r from-primary via-[hsl(var(--luxury-violet))] to-[hsl(var(--luxury-rose))] bg-clip-text text-transparent">
                Near You.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed font-medium"
            >
              Discover Bazaari, a premium community marketplace with real-time socket messaging, AI fraud protection, smart price analysis, and interactive co-buy group deals.
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Link
                href="/register"
                className="px-10 py-4 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 active:scale-95 text-center flex items-center justify-center gap-2 group"
              >
                Get Started Free
                <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/login"
                className="px-10 py-4 rounded-full border border-border hover:bg-muted/50 text-foreground font-black text-xs uppercase tracking-widest transition-all active:scale-95 text-center"
              >
                Sign In
              </Link>
            </motion.div>

            {/* Micro Stats Row */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="pt-6 grid grid-cols-3 gap-6 max-w-md border-t border-border/50"
            >
              <div>
                <p className="text-2xl font-black tracking-tight text-foreground">50k+</p>
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">Active Ads</p>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight text-foreground">98.6%</p>
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">Trust Rate</p>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight text-foreground">₹0</p>
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">Listing Fee</p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Dynamic AI Negotiation Simulator Widget */}
          <div className="lg:col-span-5 relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col h-[480px] relative"
            >
              {/* Simulator Header */}
              <div className="bg-muted/40 p-5 border-b border-border/60 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-[hsl(var(--luxury-violet))] text-white flex items-center justify-center font-bold shadow-md shadow-primary/10">
                    <FiZap className="fill-current" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight uppercase leading-none text-foreground">Bargain AI Simulator</h3>
                    <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest mt-1 block">Live Negotiation</p>
                  </div>
                </div>
                {/* Simulated product */}
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none">Original price</p>
                  <p className="text-sm font-black text-primary tracking-tight mt-1">₹24,000</p>
                </div>
              </div>

              {/* Chat room scroll frame */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-hide">
                <div className="flex justify-center mb-3">
                  <span className="text-[8px] font-black text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full uppercase tracking-widest">
                    Try Bargaining Below
                  </span>
                </div>

                {simMessages.map((msg) => {
                  const isBot = msg.sender === "bot";
                  return (
                    <div key={msg.id} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-[1.4rem] shadow-inner text-xs font-medium leading-relaxed ${
                        isBot 
                          ? "bg-muted text-foreground rounded-bl-none" 
                          : "bg-primary text-white rounded-br-none"
                      }`}>
                        <p>{msg.text}</p>
                        <span className="text-[8px] opacity-60 block mt-1 text-right">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-2.5 rounded-[1.2rem] rounded-bl-none flex gap-1 items-center shadow-inner">
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Action Panel */}
              <div className="p-4 bg-muted/20 border-t border-border/60 shrink-0 space-y-3">
                {simStep < 3 ? (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {simOffers.map((opt, i) => (
                      <button
                        key={i}
                        disabled={isTyping}
                        onClick={() => handleSimSubmit(opt.text)}
                        className="px-3 py-1 bg-card hover:bg-primary hover:text-white border border-border hover:border-primary rounded-full transition-all duration-300 font-bold text-[9px] text-muted-foreground uppercase tracking-widest disabled:opacity-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-1">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center justify-center gap-1">
                      <FiCheckCircle /> Simulated Deal Completed!
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simInput}
                    disabled={isTyping || simStep >= 3}
                    onChange={(e) => setSimInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSimSubmit(simInput)}
                    placeholder="Enter custom counter offer..."
                    className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-xs font-medium text-foreground disabled:opacity-50"
                  />
                  <button
                    disabled={!simInput.trim() || isTyping || simStep >= 3}
                    onClick={() => handleSimSubmit(simInput)}
                    className="w-9 h-9 bg-foreground text-background hover:bg-primary hover:text-white disabled:bg-muted disabled:text-muted-foreground rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Glowing background behind simulator */}
            <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-xl -z-10 translate-x-4 translate-y-4" />
          </div>
        </section>

        {/* ── 2. FEATURES BENTO GRID SECTION ── */}
        <section className="bg-muted/20 py-24 border-y border-border/50 relative">
          <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Platform Pillars</span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Engineered for Frictionless Trade</h2>
              <p className="text-muted-foreground text-sm font-medium">Bazaari bridges peer-to-peer security with smart visual analytics and conversational AI bargaining tools.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={<FiShoppingCart className="w-7 h-7 text-primary" />}
                title="Buy Intelligently"
                desc="Examine listings featuring automatic AI price benchmarks. Spot fair value immediately using our integrated machine learning price analyzer."
              />

              <FeatureCard
                icon={<FiPackage className="w-7 h-7 text-[hsl(var(--luxury-violet))]" />}
                title="Sell Seamlessly"
                desc="Create high-conversion listings with AI-assisted title & description generators. Instantly sync item metrics with buyer query notifications."
              />

              <FeatureCard
                icon={<FiMessageCircle className="w-7 h-7 text-[hsl(var(--luxury-rose))]" />}
                title="Chat Confidently"
                desc="Enjoy instant peer chat with real-time socket architecture. Get AI suggestions for optimal counter-offers inside the screen."
              />
            </div>
          </div>
        </section>

        {/* ── 3. BAZAARI SHIELD & SECURITY CALLOUT ── */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              
              {/* Left text column */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-600">
                  <FiShield size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Bazaari Shield Guard</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Professional Anti-Fraud Intelligence</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  Every single listing uploaded on Bazaari is instantly analyzed by our backend security scanner. We assess parameters including spam word triggers, price logic, user verification status, and off-platform link signals to compile a secure trust index, keeping your transactions completely protected.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" /> Automated Listing Scans
                  </div>
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" /> Verified User Signals
                  </div>
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" /> Direct In-App Payments
                  </div>
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" /> Protected Deal Chats
                  </div>
                </div>
              </div>

              {/* Right Mock Graphic */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="bg-background border border-border p-6 rounded-3xl w-full max-w-[320px] shadow-lg relative overflow-hidden flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full border-8 border-dashed border-emerald-500 flex items-center justify-center mb-4">
                    <span className="text-2xl font-black text-foreground">9.8</span>
                  </div>
                  <h4 className="font-black text-sm uppercase text-foreground">High Trust Score</h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Listing Safety Verified</p>
                  
                  <div className="mt-4 pt-4 border-t border-border/50 w-full text-left space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Security scan indicators:</p>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Spam Check</span>
                      <span className="text-emerald-500">Passed</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Off-Platform links</span>
                      <span className="text-emerald-500">None</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Price Logic</span>
                      <span className="text-emerald-500">Accurate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Soft decorative background circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl pointer-events-none" />
          </div>
        </section>

        {/* ── 4. HOW IT WORKS / TIMELINE SECTION ── */}
        <section className="bg-muted/10 py-24 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Simple Pipeline</span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">How Bazaari Simplifies Sales</h2>
              <p className="text-muted-foreground text-sm font-medium">Four core steps to list items, lock prices, bargain securely, and execute transactions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <TimelineStep number="1" icon={<FiPackage />} title="List in seconds" desc="Add photos and set your base price. Our generator drafts descriptions instantly." />
              <TimelineStep number="2" icon={<FiTrendingUp />} title="AI Price Validation" desc="Bazaari compares listing metrics with local benchmarks to highlight fair valuations." />
              <TimelineStep number="3" icon={<FiMessageCircle />} title="Interactive Bargaining" desc="Negotiate directly in socket rooms assisted by instant counter offer recommendations." />
              <TimelineStep number="4" icon={<FiLock />} title="Lock & Trade" desc="Finalize deals, arrange local collection or co-buying options, and swap reviews." />
            </div>
          </div>
        </section>

        {/* ── 5. PREMIUM CALL TO ACTION (CTA) ── */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-gradient-to-r from-primary via-[hsl(var(--luxury-violet))] to-[hsl(var(--luxury-rose))] rounded-[3rem] p-12 md:p-20 text-center text-primary-foreground shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/20 border border-white/20 px-4 py-1.5 rounded-full text-white">
                <FiZap className="fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">Instant Activation</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none text-white">
                Ready to Join the Marketplace?
              </h2>
              <p className="text-white/80 text-sm font-bold uppercase tracking-wider max-w-sm mx-auto">
                No subscription. No listing fee. Just secure local trade.
              </p>
              
              <div className="pt-4">
                <Link
                  href="/register"
                  className="inline-block px-12 py-4 rounded-full bg-white hover:bg-slate-100 text-slate-900 hover:text-primary transition-all font-black text-xs uppercase tracking-widest shadow-xl active:scale-95"
                >
                  Create Free Account
                </Link>
              </div>
            </div>

            {/* Glowing background bubble */}
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:scale-120 transition-transform duration-700" />
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:scale-120 transition-transform duration-700" />
          </div>
        </section>

        {/* ── 6. FOOTER ── */}
        <footer className="border-t border-border/60 py-16 text-center text-sm text-muted-foreground bg-card/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-black italic shadow-lg">B</div>
              <span className="text-base font-black tracking-tighter uppercase text-foreground">Bazaari</span>
            </div>
            
            <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-muted-foreground/85">
              <Link href="/ads" className="hover:text-primary transition-colors">Browse Ads</Link>
              <Link href="/saved" className="hover:text-primary transition-colors">Wishlist</Link>
              <Link href="/messages" className="hover:text-primary transition-colors">Inbox</Link>
              <Link href="/profile" className="hover:text-primary transition-colors">Console</Link>
            </div>
            
            <p className="text-xs font-medium">
              © {new Date().getFullYear()} Bazaari. Secured P2P Trading. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="dashboard-card p-10 group bg-card/50 backdrop-blur-md border-border/40 hover:bg-card relative overflow-hidden text-left flex flex-col justify-between h-[300px]">
      <div className="space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
          {icon}
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-black text-foreground tracking-tighter">{title}</h3>
          <p className="text-muted-foreground/80 text-xs font-medium leading-relaxed">{desc}</p>
        </div>
      </div>
      {/* Visual background glow indicator */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
    </div>
  );
}

function TimelineStep({ number, icon, title, desc }: { number: string, icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="space-y-4 text-center md:text-left relative group px-4">
      {/* Connector line for large screens */}
      <div className="hidden md:block absolute top-7 left-[60%] right-[-40%] h-0.5 bg-dashed border-t border-dashed border-border/50 group-last:hidden" />
      
      <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-primary font-bold shadow-inner relative group-hover:bg-primary group-hover:text-white transition-all duration-300 mx-auto md:mx-0">
        <span className="absolute -top-2 -right-2 bg-foreground text-background text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-background shadow-md">
          {number}
        </span>
        {icon}
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-black text-foreground uppercase tracking-wider">{title}</h4>
        <p className="text-muted-foreground text-xs font-medium leading-relaxed max-w-xs mx-auto md:mx-0">{desc}</p>
      </div>
    </div>
  );
}
