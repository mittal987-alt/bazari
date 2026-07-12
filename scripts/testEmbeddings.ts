import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function test() {
  const modelsToTest = ["text-embedding-004", "embedding-001", "models/text-embedding-004", "models/embedding-001", "gemini-1.5-flash"];
  
  for (const model of modelsToTest) {
    try {
      console.log(`Testing model: ${model}`);
      const response = await ai.models.embedContent({
        model: model,
        contents: "Test",
      });
      console.log(`SUCCESS for ${model}! Dimensions: ${response.embeddings?.[0]?.values?.length}`);
      return;
    } catch (e: any) {
      console.log(`FAILED for ${model}: ${e.message}`);
    }
  }
}

test();
