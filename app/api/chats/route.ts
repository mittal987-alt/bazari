import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Chat from "@/models/Chat";

export async function GET() {
  try {
    await connectDB();

    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const chats = await Chat.find({
      $or: [{ buyer: user.id }, { seller: user.id }]
    })
      .populate("adId", "title images price")
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .sort({ updatedAt: -1 });

    return NextResponse.json(chats);

  } catch (error) {
    console.error("CHAT LIST ERROR:", error);
    return NextResponse.json(
      { message: "Failed to load chats" },
      { status: 500 }
    );
  }
}