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
    console.log("[group-buy-pricing] Using API key prefix:", apiKey ? apiKey.slice(0, 8) : "NONE");

    let result = { newPrice: originalPrice, discountPercent: 0, explanation: "" };

    if (apiKey) {
      let aiData = "";
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

        // Remove markdown code blocks if present
        const jsonString = aiData.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        result = JSON.parse(jsonString);
      } catch (err: any) {
        console.warn("[group-buy-pricing] Gemini failed, using math fallback:", err.message);
      }
    } else {
      console.warn("[group-buy-pricing] No API key — using math fallback.");
    }

    // Fallback: Mathematical discount based on buyer count
    if (!result.discountPercent) {
      const count = Number(buyersCount) || 0;
      // 2% per buyer, capped at 20%
      const discountPercent = Math.min(count * 2, 20);
      const newPrice = Math.round((originalPrice * (1 - discountPercent / 100)) / 100) * 100;
      result = {
        newPrice,
        discountPercent,
        explanation: `With ${count} buyer${count !== 1 ? "s" : ""} joined, you get a ${discountPercent}% group discount — bringing the price down from ₹${Number(originalPrice).toLocaleString("en-IN")} to ₹${newPrice.toLocaleString("en-IN")}. Invite more people to unlock bigger savings (up to 20% off)!`
      };
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
