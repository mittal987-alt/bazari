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

/**
 * Perform a vector search on the Ad collection
 */
export async function searchAds(queryEmbedding: number[]) {
  try {
    await connectDB(); // Ensure DB is connected

    const ads = await Ad.aggregate([
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
    return ads;
  } catch (error) {
    console.error("Error performing vector search:", error);
    // Return empty array if error (e.g. index not created yet)
    return [];
  }
}

/**
 * Generate a conversational response using Mistral AI based strictly on retrieved ads
 */
export async function generateChatResponse(query: string, ads: any[]): Promise<string> {
  const prompt = `You are an AI assistant for an OLX-like marketplace. 
The user is asking: "${query}"

Here are the most relevant listings available right now in our database:
${ads.length > 0
      ? ads
        .map(
          (ads) =>
            `- ${ads.title} (Price: ₹${ads.price}, Category/Condition: ${ads.category}, Location: ${ads.locationName})\n  Description: ${ads.description}\n  Link: /ads/${ads._id}`
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

  try {
    const response = await getMistralClient().chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (
      (response as any).choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response at this moment."
    );
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw new Error("Failed to generate chat response");
  }
}