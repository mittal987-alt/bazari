import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import vision from "@google-cloud/vision";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No image file provided for analysis." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let predictedCategory = "Electronics"; // Default fallback
    let labels: string[] = [];

    // 1. Try Google Cloud Vision if API Key is available
    const visionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (visionKey) {
      try {
        const client = new vision.ImageAnnotatorClient({
          apiKey: visionKey,
        });

        const [result] = await client.labelDetection(buffer);
        const visionLabels = result.labelAnnotations;
        
        if (visionLabels && visionLabels.length > 0) {
          labels = visionLabels.map(label => label.description || "");
          
          // Map labels to categories
          const electronicsKeywords = ["electronics", "phone", "laptop", "computer", "gadget", "device", "camera"];
          const vehiclesKeywords = ["vehicle", "car", "bike", "motorcycle", "truck", "automobile"];
          const propertyKeywords = ["property", "house", "building", "real estate", "apartment", "home"];

          if (electronicsKeywords.some(kw => labels.some(l => l.toLowerCase().includes(kw)))) {
            predictedCategory = "Electronics";
          } else if (vehiclesKeywords.some(kw => labels.some(l => l.toLowerCase().includes(kw)))) {
            predictedCategory = "Vehicles";
          } else if (propertyKeywords.some(kw => labels.some(l => l.toLowerCase().includes(kw)))) {
            predictedCategory = "Property";
          }
        }
      } catch (visionErr) {
        console.error("Vision API Error:", visionErr);
      }
    }

    // 2. Fallback to Gemini if Vision failed or no labels found
    if (labels.length === 0 && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const base64Data = buffer.toString("base64");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: "Analyze this image and classify the main object into exactly ONE of the following three categories: 'Electronics', 'Vehicles', or 'Property'. Reply ONLY with the category name."
                        },
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: file.type || "image/jpeg"
                            }
                        }
                    ]
                }
            ]
        });

        const outputText = response.text || "";
        const cleaned = outputText.trim();
        const validCategories = ["Electronics", "Vehicles", "Property"];
        if (validCategories.includes(cleaned)) {
          predictedCategory = cleaned;
        }
      } catch (geminiErr) {
        console.error("Gemini AI Error:", geminiErr);
      }
    }

    return NextResponse.json({
      success: true,
      category: predictedCategory,
      labels: labels.slice(0, 5), // Return top 5 labels for UI if needed
      message: labels.length > 0 ? "Analyzed with Google Cloud Vision" : "Analyzed with Gemini AI",
    });

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { message: "Failed to analyze image using AI API." },
      { status: 500 }
    );
  }
}
