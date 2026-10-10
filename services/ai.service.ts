import { HfInference } from "@huggingface/inference";
import { Mistral } from "@mistralai/mistralai";
import Ad from "../models/Ad";
import { connectDB } from "../lib/db";

// Lazily-initialized clients so environment variables are read at CALL TIME,
// not at module import time. This avoids bugs where dotenv.config() hasn't
// run yet (e.g. in standalone scripts where import order matters) leaving
// these clients constructed with an empty API key.
let hfClient: HfInference | null = null;
function getHfClient(): HfInference {
  if (!hfClient) {
    hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY || "");
  }
  return hfClient;
}

let mistralClient: Mistral | null = null;
function getMistralClient(): Mistral {
  if (!mistralClient) {
    mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || "" });
  }
  return mistralClient;
}

/**
 * Generate a 768-dimensional embedding for the given text using BAAI/bge-base-en-v1.5
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await getHfClient().featureExtraction({
      model: "BAAI/bge-base-en-v1.5",
      inputs: text,
    });

    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0] as number[];
    }
    return result as number[];
  } catch (error) {
    console.error("HuggingFace Inference failed. Using fallback embedding:", error);
    return new Array(768).fill(0);
  }
}

import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

/**
 * Perform a vector search on the Ad collection with keyword fallback
 */
export async function searchAds(queryEmbedding: number[], fallbackQuery?: string) {
  try {
    await connectDB(); // Ensure DB is connected

    let ads = await Ad.aggregate([
      {
        $vectorSearch: {
          index: "default", // Make sure your Atlas Vector Search Index is named 'default' or update this to match
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $project: {
          embedding: 0, // exclude large vector from response
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    // Fallback: If vector search returned 0 results and fallback text query is provided
    if ((!ads || ads.length === 0) && fallbackQuery && fallbackQuery.trim() !== "") {
      const words = fallbackQuery
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

      if (words.length > 0) {
        ads = await Ad.find({
          status: "active",
          $or: words.flatMap((word) => [
            { title: { $regex: word, $options: "i" } },
            { description: { $regex: word, $options: "i" } },
            { category: { $regex: word, $options: "i" } },
          ]),
        })
          .limit(5)
          .select("-embedding")
          .lean();
      }
    }

    return ads;
  } catch (error) {
    console.error("Error performing vector search, using keyword fallback:", error);
    try {
      if (fallbackQuery && fallbackQuery.trim() !== "") {
        const words = fallbackQuery
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 2)
          .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

        if (words.length > 0) {
          return await Ad.find({
            status: "active",
            $or: words.flatMap((word) => [
              { title: { $regex: word, $options: "i" } },
              { description: { $regex: word, $options: "i" } },
              { category: { $regex: word, $options: "i" } },
            ]),
          })
            .limit(5)
            .select("-embedding")
            .lean();
        }
      }
    } catch (fallbackErr) {
      console.error("Keyword fallback search failed:", fallbackErr);
    }
    return [];
  }
}

/**
 * Generate a conversational response using Mistral AI (with Gemini fallback) based strictly on retrieved ads
 */
export async function generateChatResponse(query: string, ads: any[]): Promise<string> {
  const prompt = `You are an AI assistant for an OLX-like marketplace. 
The user is asking: "${query}"

Here are the most relevant listings available right now in our database:
${ads.length > 0
      ? ads
        .map(
          (ad) =>
            `- ${ad.title} (Price: ₹${ad.price}, Category/Condition: ${ad.category}, Location: ${ad.locationName})\n  Description: ${ad.description}\n  Link: /ads/${ad._id}`
        )
        .join("\n\n")
      : "No relevant listings found."
    }

Instructions:
- Answer the user's question naturally based ONLY on the provided listings.
- Never invent products, prices, specifications, or availability.
- Recommend only the retrieved listings. 
- Explain why each recommendation matches the user's query.
- Mention price, condition/category, and location.
- Suggest similar retrieved listings if available.
- If nothing relevant is found, clearly say that and suggest they modify their search or provide the closest available listings if any.
- Behave like an intelligent and helpful marketplace assistant.`;

  // 1. Primary: Try Mistral AI
  try {
    const response = await getMistralClient().chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });

    const content = (response as any).choices?.[0]?.message?.content;
    if (content) return content;
  } catch (error) {
    console.warn("Mistral AI chat completion failed, falling back to Gemini:", error);
  }

  // 2. Resilient Fallback: Try Gemini AI
  try {
    const gemini = getGeminiClient();
    if (gemini) {
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      if (response.text) return response.text.trim();
    }
  } catch (geminiError) {
    console.error("Gemini fallback chat completion also failed:", geminiError);
  }

  return "I'm currently unable to generate a response. Please browse the listings directly on the marketplace.";
}