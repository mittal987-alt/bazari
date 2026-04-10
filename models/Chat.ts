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

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);