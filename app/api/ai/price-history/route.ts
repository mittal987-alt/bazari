import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productName = searchParams.get("productName");
    const condition = searchParams.get("condition") || "good";
    const yearsUsed = parseInt(searchParams.get("yearsUsed") || "0");
    const basePrice = parseInt(searchParams.get("basePrice") || "5000");

    if (!productName) {
      return NextResponse.json({ message: "Product name is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    let history = [];
    let isMock = false;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = "You are a professional market data analyst for second-hand marketplaces. Respond only in JSON format.";
        const userMessage = `Product: "${productName}"
Condition: "${condition}"
Years Used: ${yearsUsed}
Estimated Current Value: ₹${basePrice}

Your task:
Estimate a realistic monthly price trend for this item over the last 6 months (e.g., Dec, Jan, Feb, Mar, Apr, May) plus a 1-month forecast (e.g., Jun).
Prices must trend around the estimated current value of ₹${basePrice}. Generally, second-hand items depreciate slightly over time, but there might be minor fluctuations or seasonal effects.

Format the output strictly as a JSON object:
{
  "history": [
    { "month": "Dec", "price": 12000, "isForecast": false },
    ...
    { "month": "Jun", "price": 9800, "isForecast": true }
  ]
}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userMessage,
          config: {
            systemInstruction,
            temperature: 0.2,
            responseMimeType: "application/json",
          }
        });

        const rawText = response.text ? response.text.trim() : "{}";
        const jsonString = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        const parsed = JSON.parse(jsonString);
        history = parsed.history || [];
      } catch (err) {
        console.error("Gemini Price History API error:", err);
        isMock = true;
      }
    } else {
      isMock = true;
    }

    // Programmatic Fallback if AI fails or key is missing
    if (history.length === 0) {
      const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      // Create a slight deprecation curve ending at basePrice in May, with Jun as forecast
      history = months.map((m, idx) => {
        let price = basePrice;
        const isForecast = idx === months.length - 1;
        if (idx < months.length - 2) {
          // Previous months had higher value
          const diffIdx = (months.length - 2) - idx;
          price = Math.round((basePrice * (1 + diffIdx * 0.025)) / 100) * 100;
        } else if (isForecast) {
          // Next month forecast is lower
          price = Math.round((basePrice * 0.975) / 100) * 100;
        }
        return { month: m, price, isForecast };
      });
    }

    return NextResponse.json({
      success: true,
      isMock,
      history,
    });

  } catch (error: any) {
    console.error("Price History Route Error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate price history" }, { status: 500 });
  }
}
