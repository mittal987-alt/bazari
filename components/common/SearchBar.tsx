"use client";

import { Search, Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/nearby?search=${encodeURIComponent(query)}`);
    } else {
      router.push(`/nearby`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok && data.category) {
        router.push(`/nearby?category=${encodeURIComponent(data.category)}`);
      } else {
        alert(data.message || "Failed to analyze image");
      }
    } catch (err) {
      console.error(err);
      alert("Error recognizing image");
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 items-center w-full max-w-md">
      <div className="relative flex-1 flex items-center">
        <Input 
          placeholder="Search products..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-10"
        />
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleImageUpload}
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="absolute right-3 text-slate-400 hover:text-blue-500 transition-colors"
          title="Search by Image"
        >
          {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
        </button>
      </div>
      <Button type="submit" size="icon" disabled={isAnalyzing}>
        <Search size={18} />
      </Button>
    </form>
  );
}
