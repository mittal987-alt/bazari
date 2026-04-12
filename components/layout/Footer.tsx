"use client";

import Link from "next/link";
import { FaGithub, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FiMail, FiArrowRight, FiShield, FiGlobe, FiZap, FiNavigation } from "react-icons/fi";
import { usePathname } from "next/navigation";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();

  const isChatRoom = pathname?.match(/^\/chats\/[a-zA-Z0-9_-]+$/);
  if (isChatRoom) return null;

  return (
    <footer className="relative mt-32 w-auto bg-muted/30 border-t border-border text-foreground overflow-hidden transition-colors duration-500">
      
      {/* 🔮 TOP GLOW & DIVIDER */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1600px] mx-auto px-6 md:px-8 lg:px-16 pt-16 md:pt-24 pb-10 md:pb-12 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 mb-12 md:mb-20">
          
          {/* BRANDING COLUMN */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black text-2xl italic shadow-[0_0_30px_rgba(37,99,235,0.3)] dark:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                B
              </div>
              <span className="text-3xl font-black tracking-tighter uppercase text-foreground">Bazaari</span>
            </div>
            
            <p className="text-muted-foreground font-medium leading-relaxed max-w-sm text-lg">
              The premier destination for high-end marketplace discovery. Secure, verified, and built for the modern collector.
            </p>

            <div className="flex gap-4">
              {[
                { Icon: FaGithub, href: "https://github.com" }, 
                { Icon: FaTwitter, href: "https://twitter.com" }, 
                { Icon: FaInstagram, href: "https://instagram.com" }, 
                { Icon: FaLinkedin, href: "https://linkedin.com" }
              ].map(({ Icon, href }, i) => (
                <Link key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-500 shadow-xl">
                  <Icon size={20} />
                </Link>
              ))}
            </div>
          </div>

          {/* LINKS GRID */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            
            <FooterLinkGroup 
              title="Marketplace" 
              links={[
                { name: "Electronics", href: "/ads?category=Electronics" }, 
                { name: "Automobiles", href: "/ads?category=Vehicles" }, 
                { name: "Properties", href: "/ads?category=Properties" }, 
                { name: "Fashion", href: "/ads?category=Fashion" }
              ]} 
            />

            <FooterLinkGroup 
              title="Quick Links" 
              links={[
                { name: "Lounge", href: "/dashboard/buyer" }, 
                { name: "List Ad", href: "/dashboard/seller" }, 
                { name: "Wishlist", href: "/saved" }, 
                { name: "Messages", href: "/messages" }
              ]} 
            />

            {/* THE "POP" EMAIL SECTION */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-6">
              <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-2xl shadow-blue-500/20 overflow-hidden group">
                {/* Decorative Pattern inside card */}
                <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <FiMail size={200} />
                </div>

                <div className="relative z-10">
                  <h4 className="font-black text-2xl tracking-tight mb-2">Join the Elite</h4>
                  <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-6">Weekly exclusive drops</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="flex-1 bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-sm outline-none focus:bg-white/20 transition-all placeholder:text-blue-200"
                    />
                    <button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 w-full sm:w-auto">
                      Join
                    </button>
                  </div>
                </div>
              </div>

              {/* Trust Badges under email */}
              <div className="flex justify-between items-center px-4">
                 <div className="flex items-center gap-2 text-slate-500">
                    <FiShield className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">SSL Encrypted</span>
                 </div>
                 <div className="flex items-center gap-2 text-slate-500">
                    <FiNavigation className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Delhi, India</span>
                 </div>
              </div>
            </div>

          </div>
        </div>

        {/* COPYRIGHT AREA */}
        <div className="pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-sm font-bold text-muted-foreground">
            © {currentYear} <span className="text-foreground">Bazaari Marketplace.</span> All rights reserved.
          </p>
          
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center sm:text-left mt-6 md:mt-0">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/cookies" className="hover:text-primary transition-colors">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkGroup({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div className="space-y-6">
      <h4 className="font-black text-foreground uppercase tracking-[0.3em] text-[11px]">{title}</h4>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={link.name} className="group flex items-center gap-2">
            <span className="w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-4" />
            <Link href={link.href} className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-all hover:translate-x-1 hover:text-primary block w-full py-1">
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}