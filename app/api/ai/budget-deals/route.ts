import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { budget, query } = await req.json();

    if (!budget) {
      return NextResponse.json({ message: "Budget is required" }, { status: 400 });
    }

    // Fetch active ads within a reasonable range of the budget
    // We fetch ads up to budget + 20% to allow AI to suggest "slightly higher" options if no exact match
    const maxBudget = Number(budget) * 1.2;
    const ads = await Ad.find({
      price: { $lte: maxBudget },
      status: "active"
    })
    .limit(50)
    .select("title price category description condition yearsUsed images")
    .lean();

    if (ads.length === 0) {
      return NextResponse.json({ 
        message: "No products found within this budget range.",
        recommendations: [] 
      });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "AI API Key is missing" }, { status: 500 });
    }

    const productListStr = ads.map(ad => `
- ID: ${ad._id.toString()}
- Title: ${ad.title}
- Price: ₹${ad.price}
- Category: ${ad.category}
- Condition: ${ad.yearsUsed ? ad.yearsUsed + " years used" : "New/Mint"}
- Description: ${ad.description}
`).join("\n");

    let recommendations = [];
    let isMock = false;

    try {
      const aiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "grok-3",
          messages: [
            {
              role: "system",
              content: "You are an AI shopping assistant for an online marketplace. Your task is to recommend the best products within the user's budget, prioritizing value for money, condition, and relevance. Respond only in JSON format."
            },
            {
              role: "user",
              content: `User Budget: ₹${budget}\nUser Query: ${query || "Anything good"}\n\nAvailable Products:\n${productListStr}\n\nYour task:\n1. Recommend the best products within the user’s budget.\n2. Prioritize value for money, good condition, and relevance.\n3. If no exact match found, you can suggest slightly higher/lower options from the list.\n4. Explain briefly why each product is recommended.\n\nOutput ONLY a JSON object with a key "recommendations" containing an array of objects with these keys: "name", "price", "reason", "adId". Match "adId" EXACTLY to the "ID" provided in the list. Respond ONLY with the JSON object.`
            }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        })
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        console.error("AI API Error Details:", JSON.stringify(errorData, null, 2));
        const errorMessage = typeof errorData.error === "string" 
          ? errorData.error 
          : errorData.error?.message || "AI API call failed";
        throw new Error(errorMessage);
      }

      const aiData = await aiResponse.json();
      const contentStr = aiData.choices[0].message.content.trim();
      const content = JSON.parse(contentStr);
      recommendations = content.recommendations || [];
    } catch (error: any) {
      console.warn("Falling back to Mock AI Mode due to:", error.message);
      isMock = true;
      
      // Fallback: Smart Keyword Matching + Value Ranking
      const searchKeywords = (query || "").toLowerCase().split(" ").filter(k => k.length > 2);
      
      recommendations = ads
        .map(ad => {
          let score = 0;
          const title = ad.title.toLowerCase();
          const desc = ad.description.toLowerCase();
          
          // Match keywords
          searchKeywords.forEach(kw => {
            if (title.includes(kw)) score += 10;
            if (desc.includes(kw)) score += 5;
          });

          // Budget proximity (closer to budget is better, but slightly under is best)
          const priceDiff = Math.abs(ad.price - budget);
          score += Math.max(0, 20 - (priceDiff / budget) * 20);

          return { ad, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ ad }) => ({
          name: ad.title,
          price: ad.price,
          adId: ad._id.toString(),
          reason: `Market Insight: This ${ad.category} item offers excellent value at ₹${ad.price.toLocaleString("en-IN")}. It is priced competitively for its category and matches your interest in ${query || "quality products"}.`
        }));
    }

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "AI couldn't find matches that meet your criteria.", 
        recommendations: [] 
      });
    }

    // Map recommendations to original Ad objects for the UI
    const finalRecommendations = recommendations.map((rec: any) => {
      const originalAd = ads.find(a => a._id.toString() === rec.adId || a.title === rec.name);
      return {
        ...rec,
        isMock,
        ad: originalAd
      };
    });

    return NextResponse.json({
      success: true,
      recommendations: finalRecommendations,
    });

  } catch (error: any) {
    console.error("Budget AI Error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate recommendations" }, { status: 500 });
  }
}
