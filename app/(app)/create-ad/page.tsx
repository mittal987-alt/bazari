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
  });

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [generating, setGenerating] = useState(false);

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
      // Use native fetch — Axios can corrupt the multipart boundary on FormData
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // Ensure cookies/tokens are sent
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setImages((prev) => [...prev, ...data.urls]);
    } catch (err: any) {
      alert(err.message || "Upload failed");
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
        location: form.location,
        category: form.category,
        images: images,
        userId: user?.id,
        lat: form.lat,
        lng: form.lng,
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
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden pb-24">
       {/* ambient blobs */}
       <div className="hidden sm:block absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[hsl(var(--luxury-violet)/0.05)] rounded-full blur-[140px] pointer-events-none -z-0" />
       <div className="hidden sm:block absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[hsl(var(--luxury-rose)/0.05)] rounded-full blur-[140px] pointer-events-none -z-0" />
       <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none -z-0" />

      {/* HEADER */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-4 sm:py-10 flex items-center justify-between">
        <Link href="/dashboard/seller" className="group flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> <span className="hidden sm:inline">Exit Studio</span>
        </Link>
        <div className="text-center absolute left-1/2 -translate-x-1/2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic">Studio<span className="text-primary">.</span></h1>
            <p className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">New Listing</p>
        </div>
      </div>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-16">
        
        {/* FORM SECTION */}
        <div className="lg:col-span-7 space-y-8 sm:space-y-12">
          
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold shadow-sm border border-primary/20 shrink-0">01</div>
               <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Essential Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <PremiumInput label="Listing Title" placeholder="e.g. iPhone 15 Pro Max" value={form.title} onChange={(v: string) => setForm({...form, title: v})} icon={<FiTag />} />
              <PremiumInput label="Price (₹)" type="number" placeholder="0.00" value={form.price} onChange={(v: string) => setForm({...form, price: v})} icon={<span className="font-bold text-xs">₹</span>} />
              
              <div className="relative group">
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
                    className={`absolute right-4 bottom-3 sm:bottom-4 text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 transition-colors ${
                      form.lat ? "text-emerald-500" : "text-primary"
                    } hover:scale-105 active:scale-95 bg-card/80 backdrop-blur-sm px-2 py-1 rounded-md border border-border/50`}
                >
                    {locating ? <FiLoader className="animate-spin" /> : form.lat ? <FiCheck /> : <FiMapPin />}
                    {locating ? "Locating…" : form.lat ? "Detected" : "Get GPS"}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 sm:ml-4">Category</label>
                <div className="relative">
                  <FiGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    value={form.category} 
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-card border border-border shadow-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none font-semibold text-sm text-foreground"
                  >
                    <option value="">Select Category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Property">Property</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Fitness">Fitness</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between ml-2 sm:ml-4 gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</label>
                  <button 
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generating || !form.title}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary disabled:opacity-50 transition-all hover:-translate-y-0.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20"
                  >
                    {generating ? <FiLoader className="animate-spin" /> : <FiZap className="fill-current" />}
                    {generating ? "Generating..." : "AI Generate"}
                  </button>
                </div>
                <textarea 
                  placeholder="Tell buyers more about your product..." 
                  value={form.description} 
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full px-5 py-4 rounded-xl sm:rounded-2xl bg-card border border-border shadow-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-sm min-h-[120px] sm:min-h-[160px] resize-none placeholder:text-muted-foreground/40 text-foreground"
                />
              </div>
            </div>
          </section>

          {/* MEDIA */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center font-bold shadow-sm border border-emerald-500/20 shrink-0">02</div>
               <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Gallery & Visuals</h2>
            </div>

            <div className="relative group border-2 border-dashed border-border rounded-[1.5rem] sm:rounded-[2.5rem] p-8 sm:p-12 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer bg-card/50 backdrop-blur-sm">
              <input 
                type="file" multiple accept="image/*" 
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                disabled={uploading}
              />
              <div className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-card rounded-2xl shadow-md flex items-center justify-center text-primary mb-3 sm:mb-4 transition-transform border border-border ${uploading ? 'animate-pulse' : 'group-hover:scale-110'}`}>
                   {uploading ? <FiLoader className="animate-spin" size={24} /> : <FiCamera size={24} />}
                </div>
                <p className="font-black text-foreground uppercase text-[9px] sm:text-[10px] tracking-widest">{uploading ? 'Uploading...' : 'Click or Drag to Upload'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Up to 5MB per image</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <AnimatePresence>
                {images.map((img, i) => (
                  <motion.div key={i} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden group border border-border shadow-sm">
                    <Image src={img} fill className="object-cover" alt="" />
                    <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-full text-destructive shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white">
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
            <div className="sticky top-10 space-y-6 sm:space-y-8">
              {/* Preview Card */}
              <div className="bg-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-foreground overflow-hidden relative border border-border shadow-xl">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary blur-[80px] opacity-20"></div>
                 <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 sm:mb-10 text-center sm:text-left">Live Marketplace Preview</h3>
                 
                 <div className="bg-background rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 shadow-md border border-border/50 group">
                    <div className="aspect-[4/3] bg-muted rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4 relative border border-border/50">
                       {images[0] ? <Image src={images[0]} fill className="object-cover transition-transform duration-700 group-hover:scale-105" alt="Product preview" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 bg-card/50"><FiCamera size={32} /></div>}
                       <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-md w-8 h-8 flex items-center justify-center rounded-full text-rose-500 shadow-sm border border-border/50"><FiHeart fill="none" stroke="currentColor" size={14}/></div>
                    </div>
                    <div className="px-1 sm:px-2 space-y-1">
                       <p className="text-xl sm:text-2xl font-black tracking-tighter text-foreground">
                         ₹{form.price ? Number(form.price).toLocaleString() : "0"}
                       </p>
                       <h4 className="font-bold text-sm sm:text-lg truncate text-foreground/90">{form.title || "Untitled Product"}</h4>
                       <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                            <FiMapPin className="text-primary" /> <span className="truncate max-w-[120px]">{form.location || "Location"}</span>
                          </div>
                          <div className="text-[9px] sm:text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter">
                             Just Now
                          </div>
                       </div>
                    </div>
                 </div>

                 <button 
                    onClick={handleSubmit} 
                    disabled={loading || uploading || locating}
                    className="w-full mt-8 sm:mt-10 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-1 active:translate-y-0"
                 >
                    {loading ? <><FiLoader className="animate-spin" /> Publishing...</> : <><FiCheck size={16}/> Launch Ad</>}
                 </button>
              </div>

              {/* Info box */}
              <div className="bg-primary/5 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-primary/20 flex gap-3 sm:gap-4 items-start shadow-sm">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                   <FiInfo size={14} />
                 </div>
                 <p className="text-[10px] sm:text-xs font-medium text-foreground/80 leading-relaxed">
                    Ads with precise location data and high-quality images are <strong className="text-primary font-bold">prioritized</strong> in search results and nearby feeds.
                 </p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function PremiumInput({ label, icon, value, onChange, type = "text", ...props }: any) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 sm:ml-4">{label}</label>
      <div className="relative group">
        <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors flex items-center justify-center">
          {icon}
        </div>
        <input 
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props} 
          className="w-full pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-card border border-border shadow-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold text-sm placeholder:font-medium placeholder:text-muted-foreground/40 text-foreground" 
        />
      </div>
    </div>
  );
}