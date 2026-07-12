import mongoose from "mongoose";

const AdSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    price: {
      type: Number,
      required: true,
      min: 0, // ✅ prevent negative prices
    },

    category: {
      type: String,
      required: true,
      index: true, // ✅ faster filtering
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    locationName: {
      type: String,
      default: "Unknown",
    },

    // 📍 GEO LOCATION
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true, // ✅ must have
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // ✅ faster populate/filter
    },

    images: {
      type: [String],
      default: [],
    },

    embedding: {
      type: [Number],
      default: [],
    },

    // ⭐ Saved ads
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 👁️ Views counter
    views: {
      type: Number,
      default: 0,
    },

    // 💬 Chat counter
    chats: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "pending", "spam", "sold"],
      default: "active",
      index: true,
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },

    // 🤝 Group Buying System
    isGroupBuy: {
      type: Boolean,
      default: false,
    },
    groupBuyTarget: {
      type: Number,
      default: 0,
    },
    groupBuyPrice: {
      type: Number,
      default: 0,
    },
    groupBuyers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

/* ─────────────────────────────────────────────
   INDEXES (VERY IMPORTANT ⚠️)
───────────────────────────────────────────── */

// 🌍 Geo index (already correct)
AdSchema.index({ location: "2dsphere" });

// 🔍 Search optimization
AdSchema.index({ title: "text", description: "text" });

// ⚡ Sorting optimization
AdSchema.index({ createdAt: -1 });

export default mongoose.models.Ad || mongoose.model("Ad", AdSchema);