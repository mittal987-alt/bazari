import mongoose from "mongoose";

const SavedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    criteria: {
      query: { type: String, default: "", trim: true },
      category: { type: String, default: "", trim: true },
      minPrice: { type: Number, default: undefined },
      maxPrice: { type: Number, default: undefined },
      condition: { type: String, default: "", trim: true },
      brand: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
    },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
    matchCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate saved searches for the same user and criteria
SavedSearchSchema.index({ user: 1, fingerprint: 1 }, { unique: true });

// Optimize query for active saved searches
SavedSearchSchema.index({ isActive: 1, "criteria.category": 1 });
SavedSearchSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.SavedSearch ||
  mongoose.model("SavedSearch", SavedSearchSchema);
