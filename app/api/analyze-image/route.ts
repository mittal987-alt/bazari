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

    let searchQuery = "";
    let labels: string[] = [];
    let lastError = "";

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
          searchQuery = labels[0]; 
        }
      } catch (visionErr: any) {
        console.error("Vision API Error:", visionErr);
        lastError = visionErr.message || "Vision API failed";
      }
    }

    // 2. Fallback to Gemini if Vision failed or no labels found
    if (!searchQuery && process.env.GEMINI_API_KEY) {
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
                            text: "Analyze this image and identify the specific product or item shown. Return a concise 1-3 word search query that would be perfect for finding it on a marketplace (e.g., 'iPhone 13', 'MacBook Air', 'Gaming Chair', 'Honda Civic'). Reply ONLY with the search query text, without any quotes or extra formatting."
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
        if (cleaned && cleaned.length < 50) {
          searchQuery = cleaned.replace(/['"]/g, ''); 
        }
      } catch (geminiErr: any) {
        console.error("Gemini AI Error:", geminiErr);
        lastError = geminiErr.message || "Gemini API failed";
      }
    }

    if (!searchQuery) {
       return NextResponse.json({
         success: false,
         message: "Image analysis failed. " + (lastError || "Make sure billing is enabled for Google Cloud Vision, or provide a GEMINI_API_KEY in .env.local")
       }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      searchQuery: searchQuery,
      labels: labels.slice(0, 5),
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
