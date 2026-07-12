import { NextResponse } from "next/server";
import { generateEmbedding, searchAds, generateChatResponse } from "../../../services/ai.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // Step 1: Generate embedding for the user's query
    const queryEmbedding = await generateEmbedding(message);

    // Step 2: Search for relevant ads using vector search
    const relevantAds = await searchAds(queryEmbedding);

    // Step 3: Generate the AI response based on the relevant ads
    const aiAnswer = await generateChatResponse(message, relevantAds);

    // Step 4: Return both the answer and the retrieved products
    return NextResponse.json({
      answer: aiAnswer,
      products: relevantAds,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
