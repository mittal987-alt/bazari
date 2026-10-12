import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
{
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat"
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  text: {
    type: String,
    required: true
  }

},
{ timestamps: true }
);

// High-frequency index: chat messages are always retrieved by chatId sorted by createdAt
MessageSchema.index({ chatId: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);