// scripts/resetEmbeddings.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import Ad from "../models/Ad";

async function resetEmbeddings() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) throw new Error("MONGO_URI is not defined");

  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  const result = await Ad.updateMany({}, { $set: { embedding: [] } });
  console.log(`Reset embeddings for ${result.modifiedCount} ads.`);

  process.exit(0);
}

resetEmbeddings();