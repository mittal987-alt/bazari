import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Chat from "@/models/Chat";
import Ad from "@/models/Ad";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromToken();
    console.log("DEBUG: User from token:", user?.id);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { adId } = await params;
    console.log("DEBUG: adId from params:", adId);

    if (!adId) {
      return NextResponse.json(
        { message: "Ad ID is required" },
        { status: 400 }
      );
    }

    const ad = await Ad.findById(adId);

    if (!ad) {
      return NextResponse.json(
        { message: "Ad not found" },
        { status: 404 }
      );
    }

    // ❌ prevent self chat
    if (ad.user.toString() === user.id.toString()) {
      return NextResponse.json(
        { message: "You cannot chat with your own ad" },
        { status: 400 }
      );
    }

    // ✅ check existing chat (buyer + adId)
    let chat = await Chat.findOne({
      adId,
      buyer: user.id,
    });

    // ✅ create new chat if not exists
    if (!chat) {
      chat = await Chat.create({
        adId,
        buyer: user.id,
        seller: ad.user,
      });
    }

    return NextResponse.json({
      success: true,
      chatId: chat._id,
    });

  } catch (error) {
    console.error("CHAT START ERROR:", error);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}