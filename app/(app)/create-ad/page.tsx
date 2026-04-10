"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiArrowLeft, FiCamera, FiTag, FiMapPin, 
  FiGrid, FiCheck, FiInfo, FiX, FiHeart, FiLoader, FiZap
} from "react-icons/fi";

import { useUserStore } from "@/store/userStore";

export default function CreateAdPage() {
  const router = useRouter();
  const { user } = useUserStore();

  const [form, setForm] = useState({
    title: "",
    price: "",
    description: "",
    location: "", 
    category: "",
    yearsUsed: "",
    lat: null as number | null,
    lng: null as number | null,
    isGroupBuy: false,
    groupBuyTarget: "",
    groupBuyPrice: "",
  });

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  // --- 📍 GEOLOCATION ---
  const getDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setForm(prev => ({ ...prev, lat, lng }));

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const displayName = addr.city || addr.town || addr.village || addr.state || "Unknown Location";

          setForm(prev => ({ ...prev, location: displayName }));
        } catch {
          console.warn("Reverse geocode failed");
        }
        setLocating(false);
      },
      (_error) => {
        setLocating(false);
        alert("Please enable location permissions.");
      }
    );
  };

  useEffect(() => {
    getDeviceLocation();
  }, []);

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("file", file));
      const res = await api.post("/upload", formData);
      setImages((prev) => [...prev, ...res.data.urls]);
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!form.title) {
      alert("Please enter a title first to generate a description.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, category: form.category }),
      });
      const data = await res.json();
      if (res.ok && data.description) {
        setForm(prev => ({ ...prev, description: data.description }));
      } else {
        alert(data.message || "Failed to generate description");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating description");
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestPricing = async () => {
    if (!form.title || !form.price) {
      alert("Please enter title and original price first.");
      return;
    }

    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/group-buy-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: form.title, originalPrice: Number(form.price), buyersCount: 5 }), // Simulating target of 5
      });
      const data = await res.json();
      if (res.ok && data.pricing) {
        setForm(prev => ({ 
          ...prev, 
          groupBuyPrice: data.pricing.newPrice, 
          groupBuyTarget: "5" // Defaulting to 5 for now
        }));
        alert(`AI Suggestion Applied: ${data.pricing.explanation}`);
      } else {
        alert(data.message || "Failed to get AI suggestion");
      }
    } catch (err) {
      console.error(err);
      alert("Error getting AI suggestion");
    } finally {
      setSuggesting(false);
    }
  };

  // --- 🚀 SUBMIT LOGIC ---
  const handleSubmit = async () => {
    // Matches Backend Requirement: !title || !price || !location || !category || !lat || !lng || !userId
    if (!form.title || !form.price || !form.location || !form.category) {
      alert("Please fill required fields");
      return;
    }

    if (!form.lat || !form.lng) {
      alert("GPS coordinates are required to publish.");
      getDeviceLocation();
      return;
    }

    try {
      setLoading(true);
      
      // Sending payload exactly as destructured in the backend POST route
      await api.post("/ads", {
        title: form.title,
        price: Number(form.price),
        location: form.location, // String name (locationName in DB)
        category: form.category,
        images: images,
        userId: user?.id,
        lat: form.lat,
        lng: form.lng,
        // Group Buying
        isGroupBuy: form.isGroupBuy,
        groupBuyTarget: Number(form.groupBuyTarget) || 0,
        groupBuyPrice: Number(form.groupBuyPrice) || 0,
        // Optional fields your model might have
        description: form.description,
        yearsUsed: Number(form.yearsUsed) || 0,
      });

      router.push("/dashboard/seller");
      router.refresh();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to publish ad";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto px-8 py-10 flex items-center justify-between">
        <Link href="/dashboard/seller" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Exit Studio
        </Link>
        <div className="text-center">
            <h1 className="text-3xl font-black tracking-tighter italic">Studio<span className="text-blue-600">.</span></h1>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">New Listing Creation</p>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* FORM SECTION */}
        <div className="lg:col-span-7 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">01</div>
               <h2 className="text-xl font-black tracking-tight">Essential Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PremiumInput label="Listing Title" placeholder="e.g. iPhone 15 Pro Max" value={form.title} onChange={(v: string) => setForm({...form, title: v})} icon={<FiTag />} />
              <PremiumInput label="Price (₹)" type="number" placeholder="0.00" value={form.price} onChange={(v: string) => setForm({...form, price: v})} icon={<span className="font-bold text-xs">₹</span>} />
              
              <div className="relative">
                <PremiumInput 
                    label="Location Name" 
                    placeholder="Delhi, Mumbai..." 
                    value={form.location} 
                    onChange={(v: string) => setForm({...form, location: v})} 
                    icon={<FiMapPin />} 
                />
                <button 
                    onClick={getDeviceLocation}
                    type="button"
                    disabled={locating}
                    className={`absolute right-4 bottom-4 text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 transition-colors ${
                      form.lat ? "text-emerald-600" : "text-blue-600"
                    }`}
                >
                    {locating ? <FiLoader className="animate-spin" /> : form.lat ? <FiCheck /> : <FiMapPin />}
                    {locating ? "Locating…" : form.lat ? "Location Detected" : "Get GPS"}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Category</label>
                <div className="relative">
                  <FiGrid className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={form.category} 
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none font-bold"
                  >
                    <option value="">Select Category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Property">Property</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between ml-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <button 
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generating || !form.title}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-30 transition-all hover:scale-105"
                  >
                    {generating ? <FiLoader className="animate-spin" /> : <FiZap className="fill-current" />}
                    {generating ? "Generating..." : "Magic Generate"}
                  </button>
                </div>
                <textarea 
                  placeholder="Tell buyers more about your product..." 
                  value={form.description} 
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-bold min-h-[160px] resize-none placeholder:font-medium placeholder:text-slate-300"
                />
              </div>
            </div>
          </section>

          {/* GROUP BUY SECTION */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">02</div>
               <h2 className="text-xl font-black tracking-tight">Group Buying (Optional)</h2>
            </div>
            <div className="p-6 border border-slate-100 rounded-[2rem] bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={form.isGroupBuy} 
                    onChange={e => setForm({...form, isGroupBuy: e.target.checked})} 
                    className="w-5 h-5 accent-purple-600 rounded bg-slate-100 border-none outline-none focus:ring-0" 
                  />
                  <span className="font-bold text-slate-800">Enable Group Buying Mode</span>
                </label>
                {form.isGroupBuy && (
                  <button 
                    type="button"
                    onClick={handleSuggestPricing}
                    disabled={suggesting || !form.price}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-600 hover:text-purple-700 disabled:opacity-30 transition-all hover:scale-105"
                  >
                    {suggesting ? <FiLoader className="animate-spin" /> : <FiZap className="fill-current" />}
                    {suggesting ? "Analyzing..." : "AI Suggest Price"}
                  </button>
                )}
              </div>

              {form.isGroupBuy && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-6 border-t border-slate-50">
                  <PremiumInput label="Target Buyers" type="number" placeholder="5" value={form.groupBuyTarget} onChange={(v: string) => setForm({...form, groupBuyTarget: v})} icon={<FiGrid />} />
                  <PremiumInput label="Discounted Price (₹)" type="number" placeholder="0.00" value={form.groupBuyPrice} onChange={(v: string) => setForm({...form, groupBuyPrice: v})} icon={<span className="font-bold text-xs">₹</span>} />
                </div>
              )}
            </div>
          </section>

          {/* MEDIA */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">03</div>
               <h2 className="text-xl font-black tracking-tight">Gallery & Visuals</h2>
            </div>

            <div className="relative group border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 transition-all hover:border-blue-400 hover:bg-blue-50/30">
              <input 
                type="file" multiple accept="image/*" 
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                   <FiCamera size={24} />
                </div>
                <p className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Click or Drag to Upload</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <AnimatePresence>
                {images.map((img, i) => (
                  <motion.div key={i} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative aspect-square rounded-2xl overflow-hidden group">
                    <Image src={img} fill className="object-cover" alt="" />
                    <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1 bg-white rounded-full text-rose-500 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiX size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* PREVIEW */}
        <div className="lg:col-span-5">
            <div className="sticky top-10 space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 blur-[80px] opacity-40"></div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-10">Live Marketplace Preview</h3>
                 
                 <div className="bg-white rounded-[2rem] p-4 text-slate-900 shadow-2xl">
                    <div className="aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden mb-4 relative">
                       {images[0] ? <Image src={images[0]} fill className="object-cover" alt="Product preview" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><FiCamera size={32} /></div>}
                       <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md p-2 rounded-full text-rose-500 shadow-sm"><FiHeart fill="currentColor" size={12}/></div>
                    </div>
                    <div className="px-1 space-y-1">
                       <p className="text-2xl font-black tracking-tighter">
                         ₹{form.isGroupBuy && form.groupBuyPrice ? form.groupBuyPrice : (form.price || "0")}
                         {form.isGroupBuy && <span className="text-[12px] ml-2 font-bold text-purple-400 align-middle">Group Price</span>}
                       </p>
                       <h4 className="font-bold text-lg truncate">{form.title || "Untitled Product"}</h4>
                       <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest pt-2">
                          <FiMapPin className="text-blue-600" /> {form.location || "Location Unknown"}
                       </div>
                    </div>
                 </div>

                 <button 
                    onClick={handleSubmit} 
                    disabled={loading || uploading || locating}
                    className="w-full mt-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900 transition-all flex items-center justify-center gap-3"
                 >
                    {loading ? "Publishing..." : <><FiCheck /> Launch Ad</>}
                 </button>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4">
                 <FiInfo className="text-blue-600 mt-1 shrink-0" />
                 <p className="text-xs font-medium text-blue-800 leading-relaxed">
                    Ads with precise location data are <b>prioritized</b>.
                 </p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function PremiumInput({ label, icon, value, onChange, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">{label}</label>
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
          {icon}
        </div>
        <input 
          {...props} 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-bold placeholder:font-medium placeholder:text-slate-300" 
        />
      </div>
    </div>
  );
}