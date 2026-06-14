import mongoose, { Schema, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: { type: String, required: false }, // not required for Google users
    googleId: { type: String, sparse: true },    // Google OAuth sub
    avatar: { type: String },                    // Google profile picture
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isTrusted: { type: Boolean, default: false },
    // Password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiry: { type: Date, default: null },
  },
  { timestamps: true, strict: false }
);

// Delete cached model to avoid stale schema in hot-reload environments
if (models.User) {
  delete (mongoose as any).models.User;
}

export default mongoose.model("User", UserSchema);

