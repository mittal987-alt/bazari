import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { title, category } = await req.json();

    if (!title) {
      return NextResponse.json({ message: "Product title is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ message: "AI API Key is missing. Please check .env.local" }, { status: 500 });
    }

    console.log("[generate-description] Using API key prefix:", apiKey.slice(0, 8));

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = "You are an expert product description writer for an e-commerce marketplace like OLX. Write a compelling, concise, and professional product description (100-150 words) based on the title and category provided. Highlight key features, condition expectations, and why it's a great buy. Do not use placeholders.";
    const userMessage = `Product Title: ${title}\nCategory: ${category || "General"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const description = response.text ? response.text.trim() : "";

    return NextResponse.json({
      success: true,
      description,
    });

  } catch (error: any) {
    console.error("Description Generation Error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate description" }, { status: 500 });
  }
}
