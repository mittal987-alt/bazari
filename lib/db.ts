import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI!;

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  await mongoose.connect(MONGO_URI);
}
