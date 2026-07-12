import "./env";

import mongoose from "mongoose";
import Ad from "../models/Ad";
import { generateEmbedding } from "../services/ai.service";

async function backfillEmbeddings() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env.local");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    // Find ads that don't have an embedding yet
    const ads = await Ad.find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } }
      ]
    });

    console.log(`Found ${ads.length} ads requiring embeddings.`);

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      console.log(`[${i + 1}/${ads.length}] Generating embedding for: ${ad.title}`);
      
      // Construct a rich string representation of the ad
      const textToEmbed = `Title: ${ad.title}. Category: ${ad.category}. Description: ${ad.description}. Price: ₹${ad.price}. Location: ${ad.locationName}.`;
      
      try {
        const embedding = await generateEmbedding(textToEmbed);
        ad.embedding = embedding;
        await ad.save();
        console.log(`  -> Saved embedding for Ad ${ad._id}`);
      } catch (err) {
        console.error(`  -> Failed to generate embedding for Ad ${ad._id}`, err);
      }
      
      // Wait for 1 second between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("Backfill complete.");
    process.exit(0);
  } catch (error) {
    console.error("Fatal error during backfill:", error);
    process.exit(1);
  }
}

backfillEmbeddings();
