"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Link from "next/link";
import {
  FiArrowLeft,
  FiSave,
  FiTrash2,
  FiCamera,
  FiMapPin,
  FiTag,
  FiClock,
  FiInfo,
  FiCheckCircle,
} from "react-icons/fi";

export default function EditAdPage() {
  const router = useRouter();
  const { id } = useParams();

  // --- STATE MANAGEMENT ---
  const [form, setForm] = useState({
    title: "",
    price: "",
    description: "",
    location: "",
    yearsUsed: "",
  });

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- FETCH AD DATA ---
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await api.get(`/ads/${id}`);
        const { title, price, description, locationName, yearsUsed, images } = res.data;

        setForm({
          title: title || "",
          price: price?.toString() || "",
          description: description || "",
          location: locationName || "",
          yearsUsed: yearsUsed?.toString() || "",
        });

        setImages(images || []);
      } catch (err) {
        console.error("Failed to load ad", err);
        alert("Failed to load ad data");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAd();
  }, [id]);

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("file", file);
      });

      const res = await api.post("/upload", formData);
      setImages((prev) => [...prev, res.data.url]);
    } catch (err) {
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  // --- UPDATE LOGIC ---
  const handleUpdate = async () => {
    if (!form.title || !form.price) {
      alert("Title and Price are required");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/ads/${id}`, {
        title: form.title,
        price: Number(form.price),
        description: form.description,
        locationName: form.location, // Match backend field name
        yearsUsed: Number(form.yearsUsed),
        images,
        // If your schema requires category, make sure it's in your form state and sent here:
        // category: form.category 
      });

      router.push("/dashboard/seller");
      router.refresh();
    } catch (err: any) {
      console.error("Update error", err);
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };
  // --- DELETE LOGIC (FIXED) ---
  const handleDelete = async () => {
    const confirmDelete = confirm("Are you sure you want to permanently delete this listing?");
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/ads/${id}`);
      router.push("/dashboard/seller");
      router.refresh();
    } catch (err) {
      alert("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50">
      
      {/* 🌌 PREMIUM MESH BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-[120px]" />
      </div>

      {/* 🧭 STICKY GLASS HEADER */}
      <nav className="sticky top-0 z-50 px-6 py-4 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard/seller" className="group flex items-center gap-2 p-2 hover:bg-slate-100 rounded-xl transition-all">
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Back to Console</span>
          </Link>

          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-600">Product Editor</span>
            <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{form.title || "Untitled Listing"}</p>
          </div>

          <button 
            onClick={handleUpdate} 
            disabled={saving} 
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : <><FiSave /> Save Changes</>}
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* --- 📝 LEFT COLUMN: FORM --- */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SECTION: GENERAL INFO */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-white"
          >
            <FormHeader title="Listing Details" icon={<FiTag />} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
              <EditInput label="Product Name" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} />
              <EditInput label="Price (₹)" type="number" value={form.price} icon={<span className="text-xs font-black">₹</span>} onChange={(v: string) => setForm({ ...form, price: v })} />
              <EditInput label="Item Location" value={form.location} icon={<FiMapPin />} onChange={(v: string) => setForm({ ...form, location: v })} />
              <EditInput label="Usage (Years)" type="number" value={form.yearsUsed} icon={<FiClock />} onChange={(v: string) => setForm({ ...form, yearsUsed: v })} />
            </div>

            <div className="mt-8 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Full Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-[2rem] p-8 min-h-[180px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all resize-none shadow-inner"
                placeholder="Describe your item's condition, features, and why it's a great deal..."
              />
            </div>
          </motion.section>

          {/* SECTION: IMAGES */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-900 p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-slate-900/20"
          >
            <div className="flex justify-between items-center mb-10">
              <FormHeader title="Media Gallery" icon={<FiCamera />} light />
              <label className="cursor-pointer bg-blue-600 hover:bg-white hover:text-blue-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white">
                Add Images
                <input type="file" multiple hidden onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {images.map((img, i) => (
                  <motion.div key={img} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/10 shadow-lg">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setImages(images.filter((item) => item !== img))} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <FiTrash2 size={14} />
                    </button>
                    {i === 0 && <div className="absolute bottom-2 left-2 bg-blue-600 text-[8px] font-black uppercase px-2 py-1 rounded-md text-white shadow-md">Main Photo</div>}
                  </motion.div>
                ))}
              </AnimatePresence>
              {uploading && (
                <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 animate-pulse bg-white/5">
                  <FiCamera />
                  <span className="text-[8px] font-black mt-2">Processing...</span>
                </div>
              )}
            </div>
          </motion.section>
        </div>

        {/* --- 🛡️ RIGHT COLUMN: TIPS & DELETION --- */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 text-blue-600 mb-6">
              <FiInfo />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Optimization Tips</h3>
            </div>
            <ul className="space-y-4">
              <EditorTip text="Keep titles concise but descriptive." />
              <EditorTip text="The first image is your marketplace hook." />
              <EditorTip text="Accurate location improves local leads." />
            </ul>
          </div>

          <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100">
             <h3 className="text-xs font-black uppercase tracking-widest text-rose-900 mb-4 flex items-center gap-2">
               <FiTrash2 /> Dangerous Territory
             </h3>
             <p className="text-[11px] font-bold text-rose-700/70 mb-6 leading-relaxed">
               Deleting this ad is irreversible. You will lose all current inquiries and traffic data associated with this listing.
             </p>
             <button 
              onClick={handleDelete} 
              disabled={deleting}
              className="w-full py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm shadow-rose-100 disabled:opacity-50"
             >
               {deleting ? "Removing Ad..." : "Delete Permanently"}
             </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FormHeader({ title, icon, light }: any) {
  return (
    <div className={`flex items-center gap-3 ${light ? 'text-white' : 'text-slate-900'}`}>
      <span className={`p-3 rounded-xl ${light ? 'bg-white/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{icon}</span>
      <h2 className="text-xl font-black tracking-tight uppercase italic">{title}</h2>
    </div>
  );
}

function EditorTip({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <FiCheckCircle className="text-emerald-500 mt-1 shrink-0" />
      <p className="text-xs font-bold text-slate-500 leading-tight">{text}</p>
    </li>
  );
}

function EditInput({ label, value, onChange, icon, ...props }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">{label}</label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors z-10">
            {icon}
          </div>
        )}
        <input 
          {...props} 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className={`${icon ? "pl-14" : "px-8"} w-full py-5 bg-slate-50 border-none rounded-[1.5rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all shadow-inner`}
        />
      </div>
    </div>
  );
}