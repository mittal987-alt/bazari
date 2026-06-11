import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { productName, originalPrice, description } = await req.json();

    if (!productName || !originalPrice) {
      return NextResponse.json({ message: "Product details are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    let options = [];
    let isMock = false;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = "You are an AI assistant helping a buyer negotiate a purchase on a second-hand marketplace. Respond only in JSON format.";
        const userMessage = `Product Name: ${productName}
Original Price: ₹${originalPrice}
Description: ${description || "N/A"}

Your task:
Generate EXACTLY 3 counter-offer options for the buyer:
1. "Thrifty Offer" (A polite but aggressive discount, around 15-20% off)
2. "Fair Offer" (A standard, highly reasonable counter-offer, around 8-12% off)
3. "Quick Close" (A very light counter-offer for a fast deal, around 3-5% off)

For each option, calculate the proposed counter-offer price in INR (rounded to nearest 100) and draft a polite, natural chat message the buyer can send to the seller. Make the messages sound human, friendly, and persuasive.

Respond ONLY with a JSON object in this exact format:
{
  "options": [
    {
      "label": "Thrifty Offer (₹X)",
      "price": X,
      "discountPercent": Y,
      "text": "Draft message..."
    },
    ...
  ]
}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userMessage,
          config: {
            systemInstruction,
            temperature: 0.7,
            responseMimeType: "application/json",
          }
        });

        const rawText = response.text ? response.text.trim() : "{}";
        const jsonString = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        const parsed = JSON.parse(jsonString);
        options = parsed.options || [];
      } catch (err) {
        console.error("Gemini Negotiation API error:", err);
        isMock = true;
      }
    } else {
      isMock = true;
    }

    // Programmatic Fallback if AI fails or key is missing
    if (options.length === 0) {
      const p = Number(originalPrice);
      
      const thriftyPrice = Math.round((p * 0.82) / 100) * 100;
      const fairPrice = Math.round((p * 0.90) / 100) * 100;
      const quickPrice = Math.round((p * 0.96) / 100) * 100;

      options = [
        {
          label: `Thrifty Offer (₹${thriftyPrice.toLocaleString("en-IN")})`,
          price: thriftyPrice,
          discountPercent: 18,
          text: `Hi! I'm very interested in your "${productName}". Would you consider ₹${thriftyPrice.toLocaleString("en-IN")} for a quick, direct sale? I can pick it up or transfer payment as soon as you agree. Let me know!`
        },
        {
          label: `Fair Offer (₹${fairPrice.toLocaleString("en-IN")})`,
          price: fairPrice,
          discountPercent: 10,
          text: `Hi there, hope you're doing well. I saw your listing for the "${productName}" and it looks great. Would you be willing to meet in the middle at ₹${fairPrice.toLocaleString("en-IN")}? Let me know if that works for you.`
        },
        {
          label: `Quick Close (₹${quickPrice.toLocaleString("en-IN")})`,
          price: quickPrice,
          discountPercent: 4,
          text: `Hey! I love the look of the "${productName}". Would you accept ₹${quickPrice.toLocaleString("en-IN")} to finalize the deal today? Happy to close this immediately!`
        }
      ];
    }

    return NextResponse.json({
      success: true,
      isMock,
      options,
    });

  } catch (error: any) {
    console.error("Negotiation API Route Error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate offer options" }, { status: 500 });
  }
}
