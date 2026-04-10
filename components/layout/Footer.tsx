"use client";

import Link from "next/link";
import { FaGithub, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FiMail, FiArrowRight, FiShield, FiGlobe, FiZap, FiNavigation } from "react-icons/fi";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-32 w-full bg-[#050a15] dark:bg-[#010309] text-white overflow-hidden">
      
      {/* 🔮 TOP GLOW & DIVIDER */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1600px] mx-auto px-8 lg:px-16 pt-24 pb-12 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
          
          {/* BRANDING COLUMN */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                B
              </div>
              <span className="text-3xl font-black tracking-tighter uppercase">Bazaari</span>
            </div>
            
            <p className="text-slate-400 font-medium leading-relaxed max-w-sm text-lg">
              The premier destination for high-end marketplace discovery. Secure, verified, and built for the modern collector.
            </p>

            <div className="flex gap-4">
              {[FaGithub, FaTwitter, FaInstagram, FaLinkedin].map((Icon, i) => (
                <button key={i} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-500 shadow-xl">
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* LINKS GRID */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-12">
            
            <FooterLinkGroup 
              title="Marketplace" 
              links={["Electronics", "Automobiles", "Properties", "Boutique"]} 
            />

            <FooterLinkGroup 
              title="Resources" 
              links={["Safety Hub", "Verification", "Ad Guide", "Pro Membership"]} 
            />

            {/* THE "POP" EMAIL SECTION */}
            <div className="col-span-2 space-y-6">
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
                    <button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95">
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
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-sm font-bold text-slate-500">
            © {currentYear} <span className="text-white">Bazaari Marketplace.</span> All rights reserved.
          </p>
          
          <div className="flex gap-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Terms of Use</span>
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Cookie Settings</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkGroup({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="space-y-6">
      <h4 className="font-black text-white uppercase tracking-[0.3em] text-[11px]">{title}</h4>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={link} className="group flex items-center gap-2">
            <span className="w-0 h-[2px] bg-blue-500 transition-all duration-300 group-hover:w-4" />
            <span className="text-sm font-bold text-slate-400 group-hover:text-white cursor-pointer transition-all hover:translate-x-1">
              {link}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}