import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
{
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ad"
  },

  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  lastMessage: {
    type: String,
    default: ""
  }

},
{ timestamps: true }
);

// High-frequency indexes: Chat lists retrieved per buyer/seller sorted by recency
ChatSchema.index({ buyer: 1, updatedAt: -1 });
ChatSchema.index({ seller: 1, updatedAt: -1 });
ChatSchema.index({ adId: 1, buyer: 1 });

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);