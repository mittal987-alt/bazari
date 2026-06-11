import mongoose, { Schema, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isTrusted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.User || mongoose.model("User", UserSchema);
