import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

export async function PUT() {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = await Notification.updateMany(
      { recipient: authUser.id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("[api:notifications:mark-all-read] Error:", err);
    return NextResponse.json(
      { message: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
