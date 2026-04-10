import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { productName, originalPrice, buyersCount } = await req.json();

    if (!productName || !originalPrice) {
      return NextResponse.json({ message: "Product details are required" }, { status: 400 });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "AI API Key is missing" }, { status: 500 });
    }

    // Call xAI (Grok) API with the user's specific prompt
    const aiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-2",
        messages: [
          {
            role: "system",
            content: "You are an AI pricing assistant for a group buying feature in a marketplace. Your goal is to calculate fair discounts that maintain seller profit but feel attractive to buyers."
          },
          {
            role: "user",
            content: `Product: ${productName}\nOriginal Price: ₹${originalPrice}\nNumber of Buyers Joined: ${buyersCount || 0}\n\nRules:\n- More buyers = better discount\n- Maintain seller profit margin\n- Discounts should feel attractive but realistic\n\nYour task:\n1. Calculate a fair discounted price based on number of buyers.\n2. Explain the discount logic briefly.\n3. Encourage more users to join the group.\n\nOutput format ONLY as valid JSON with these keys: "newPrice", "discountPercent", "explanation". Do not include any other text.`
          }
        ],
        temperature: 0.7,
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("xAI API Error Response:", aiResponse.status, errorText);
      let errorMessage = "AI API call failed";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    const aiData = await aiResponse.json();
    let result = { newPrice: originalPrice, discountPercent: 0, explanation: "" };
    
    try {
      const content = aiData.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const jsonString = content.replace(/^```json\n?/, "").replace(/\n?```$/, "");
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
