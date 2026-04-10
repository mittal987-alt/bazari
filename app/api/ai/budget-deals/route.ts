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
- Title: ${ad.title}
- Price: ₹${ad.price}
- Category: ${ad.category}
- Condition: ${ad.yearsUsed ? ad.yearsUsed + " years used" : "New/Mint"}
- Description: ${ad.description}
`).join("\n");

    const aiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          {
            role: "system",
            content: "You are an AI shopping assistant for an online marketplace. Your task is to recommend the best products within the user's budget, prioritizing value for money, condition, and relevance."
          },
          {
            role: "user",
            content: `User Budget: ₹${budget}\nUser Query: ${query || "Anything good"}\n\nAvailable Products:\n${productListStr}\n\nYour task:\n1. Recommend the best products within the user’s budget.\n2. Prioritize value for money, good condition, and relevance.\n3. If no exact match, suggest slightly higher/lower options.\n4. Explain briefly why each product is recommended.\n\nOutput ONLY a JSON array of objects with these keys: "name", "price", "reason", "adId". Match "adId" to the original product if possible. Respond ONLY with the JSON array.`
          }
        ],
        temperature: 0.7,
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      throw new Error(errorData.error?.message || "AI API call failed");
    }

    const aiData = await aiResponse.json();
    let recommendations = [];
    try {
      const content = aiData.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const jsonString = content.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      recommendations = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e);
      return NextResponse.json({ 
        message: "AI assistant was unable to format results, please try a different query.", 
        raw: aiData.choices[0].message.content 
      }, { status: 500 });
    }

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "AI couldn't find matches that meet your criteria.", 
        recommendations: [] 
      });
    }

    // Map AI recommendations to original Ad objects for the UI
    const finalRecommendations = recommendations.map((rec: any) => {
      const originalAd = ads.find(a => a.title === rec.name || a._id.toString() === rec.adId);
      return {
        ...rec,
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
