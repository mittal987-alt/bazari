import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ad from "@/models/Ad";
import { findBenchmark } from "@/lib/market-benchmarks";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productName = searchParams.get("productName");
    const condition = searchParams.get("condition") || "good";
    const yearsUsed = parseInt(searchParams.get("yearsUsed") || "0");

    if (!productName) {
      return NextResponse.json({ message: "Product name is required" }, { status: 400 });
    }

    await connectDB();

    // 1. Fetch Similar Ads from Database
    const similarAds = await Ad.find({
      $text: { $search: productName },
      status: "active"
    })
    .limit(4)
    .select("title price images locationName");

    // 2. Fallback to benchmarks if search is too narrow
    let benchmark = findBenchmark(productName);
    
    // 3. AI Insights from Grok (xAI)
    let suggestedPrice = 0;
    let minPrice = 0;
    let maxPrice = 0;
    let message = "";
    let dataSource = "platform_data";

    const apiKey = process.env.API_KEY; // Using the key provided in .env.local

    if (apiKey && apiKey.startsWith("xai-")) {
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
                content: "You are a professional market price estimator for a second-hand marketplace. Respond only in JSON format."
              },
              {
                role: "user",
                content: `Estimate the current market price in INR (₹) for a used "${productName}" in "${condition}" condition, used for ${yearsUsed} years. 
                Provide:
                - suggestedPrice (number)
                - minPrice (number)
                - maxPrice (number)
                - summary (string, short description of market trend)
                - confidence (number 0-1)
                
                Respond with EXACTLY this JSON structure: {"suggestedPrice": 0, "minPrice": 0, "maxPrice": 0, "summary": "", "confidence": 0}`
              }
            ],
            temperature: 0,
            response_format: { type: "json_object" }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const contentStr = aiData.choices?.[0]?.message?.content;
          
          if (contentStr) {
            try {
              const content = JSON.parse(contentStr);
              suggestedPrice = content.suggestedPrice || 0;
              minPrice = content.minPrice || 0;
              maxPrice = content.maxPrice || 0;
              message = content.summary || "";
              dataSource = "global_market_insights";
            } catch (parseErr) {
              console.error("AI JSON Parse Error:", parseErr, "Content:", contentStr);
            }
          }
        } else {
          const errorData = await aiResponse.json();
          console.warn("AI Estimation API Error (Falling back):", errorData.error);
        }
      } catch (aiErr: any) {
        console.error("AI Estimation Fetch Error:", aiErr.message);
      }
    }

    // 4. Fallback Logic if AI fails or no key
    if (!suggestedPrice) {
      if (benchmark) {
        suggestedPrice = benchmark.avgUsed;
        minPrice = benchmark.minUsed;
        maxPrice = benchmark.maxUsed;
        message = "Market Snapshot: Our historical data shows consistent pricing for this category.";
        dataSource = "market_benchmark";
      } else if (similarAds.length > 0) {
        const prices = similarAds.map(ad => ad.price);
        suggestedPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
        message = "Platform Insight: Estimated based on current active listings for similar products.";
        dataSource = "platform_data";
      } else {
        // Absolute fallback if no data exists
        suggestedPrice = 5000;
        minPrice = 1000;
        maxPrice = 15000;
        message = "Preliminary Estimate: Based on typical secondary market entry points.";
        dataSource = "generalized_estimate";
      }
    }

    return NextResponse.json({
      productName,
      suggestedPrice,
      minPrice,
      maxPrice,
      message,
      dataSource,
      similarAds
    });

  } catch (error: any) {
    console.error("Price Estimator Error:", error);
    return NextResponse.json({ message: error.message || "Failed to estimate price" }, { status: 500 });
  }
}