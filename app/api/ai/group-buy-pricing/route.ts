import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { productName, originalPrice, buyersCount } = await req.json();

    if (!productName || !originalPrice) {
      return NextResponse.json({ message: "Product details are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "AI API Key is missing" }, { status: 500 });
    }
    console.log("[group-buy-pricing] Using API key prefix:", apiKey.slice(0, 8));

    let aiData;
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = "You are an AI pricing assistant for a group buying feature in a marketplace. Your goal is to calculate fair discounts that maintain seller profit but feel attractive to buyers.";
      const userMessage = `Product: ${productName}\nOriginal Price: ₹${originalPrice}\nNumber of Buyers Joined: ${buyersCount || 0}\n\nRules:\n- More buyers = better discount\n- Maintain seller profit margin\n- Discounts should feel attractive but realistic\n\nYour task:\n1. Calculate a fair discounted price based on number of buyers.\n2. Explain the discount logic briefly.\n3. Encourage more users to join the group.\n\nOutput format ONLY as valid JSON with these keys: "newPrice", "discountPercent", "explanation". Do not include any other text.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
        }
      });
      aiData = response.text ? response.text.trim() : "{}";
    } catch (err: any) {
      console.error("Gemini API Error Response:", err);
      throw new Error(err.message || "AI API call failed");
    }
    let result = { newPrice: originalPrice, discountPercent: 0, explanation: "" };
    
    try {
      // Remove markdown code blocks if present
      const jsonString = aiData.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      result = JSON.parse(jsonString);
    } catch (e) {
      console.error("AI JSON Parse Error:", e);
      return NextResponse.json({ message: "Failed to parse AI pricing suggestion" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pricing: result,
    });

  } catch (error: any) {
    console.error("Pricing AI Error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate pricing suggestion" }, { status: 500 });
  }
}
