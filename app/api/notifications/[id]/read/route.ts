import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    }

    // Ownership check: user can only mark their own notification as read
    if (notification.recipient.toString() !== authUser.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    notification.isRead = true;
    await notification.save();

    return NextResponse.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    console.error("[api:notifications:read] PUT Error:", err);
    return NextResponse.json(
      { message: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
