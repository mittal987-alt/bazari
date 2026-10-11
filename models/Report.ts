import mongoose, { Schema, models } from "mongoose";

/**
 * Report model — stores user-submitted listing reports.
 * Reports are one-per-user-per-listing (unique index enforced).
 * Admins review and action reports via the trust moderation queue.
 */

const ReportSchema = new Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad",
      required: true,
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Pre-defined reason category from the reporter */
    reason: {
      type: String,
      required: true,
      enum: [
        "scam_or_fraud",
        "counterfeit_item",
        "prohibited_item",
        "offensive_content",
        "spam_or_duplicate",
        "misleading_description",
        "wrong_category",
        "other",
      ],
    },
    /** Optional free-text details from reporter (max 500 chars, sanitized server-side) */
    details: {
      type: String,
      default: "",
      maxlength: 500,
    },
    /** Admin review lifecycle */
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
      index: true,
    },
    /** Admin note on resolution */
    adminNote: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate reports from the same user for the same listing
ReportSchema.index({ listingId: 1, reporterId: 1 }, { unique: true });

// Efficient admin queue queries: newest pending first
ReportSchema.index({ status: 1, createdAt: -1 });

export default models.Report || mongoose.model("Report", ReportSchema);

