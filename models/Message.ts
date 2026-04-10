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

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);