import mongoose from "mongoose";

export type NotificationType =
  | "saved_search_match"
  | "price_drop"
  | "buyer_inquiry"
  | "listing_moderation"
  | "optimization_reminder"
  | "general";

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "saved_search_match",
        "price_drop",
        "buyer_inquiry",
        "listing_moderation",
        "optimization_reminder",
        "general",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: "",
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad",
      default: null,
    },
    savedSearchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavedSearch",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    dedupKey: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

// Compound index for querying user's notifications in chronological order
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
