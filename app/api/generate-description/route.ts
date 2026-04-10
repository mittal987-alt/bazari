import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, category } = await req.json();

    if (!title) {
      return NextResponse.json({ message: "Product title is required" }, { status: 400 });
    }

    const apiKey = process.env.API_KEY; // Using the xAI key provided in .env.local

    if (!apiKey) {
      return NextResponse.json({ message: "AI API Key is missing. Please check .env.local" }, { status: 500 });
    }

    // Call xAI (Grok) API
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
            content: "You are an expert product description writer for an e-commerce marketplace like OLX. Write a compelling, concise, and professional product description (100-150 words) based on the title and category provided. Highlight key features, condition expectations, and why it's a great buy. Do not use placeholders."
          },
          {
            role: "user",
            content: `Product Title: ${title}\nCategory: ${category || "General"}`
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
    const description = aiData.choices[0].message.content.trim();

    return NextResponse.json({
      success: true,
      description,
    });

  } catch (error: any) {
    console.error("Description Generation Error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate description" }, { status: 500 });
  }
}
