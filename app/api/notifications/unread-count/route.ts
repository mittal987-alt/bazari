import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: authUser.id,
      isRead: false,
    });

    return NextResponse.json({ unreadCount });
  } catch (err) {
    console.error("[api:notifications:unread-count] Error:", err);
    return NextResponse.json({ unreadCount: 0 });
  }
}
