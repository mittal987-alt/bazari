import mongoose, { Schema, models } from "mongoose";

const ReviewSchema = new Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad",
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Optimize query for fetching a seller's reviews
ReviewSchema.index({ sellerId: 1, createdAt: -1 });

export default models.Review || mongoose.model("Review", ReviewSchema);
