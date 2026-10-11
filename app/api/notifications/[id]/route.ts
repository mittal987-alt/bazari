import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

export async function DELETE(
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

    // Ownership check
    if (notification.recipient.toString() !== authUser.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await Notification.findByIdAndDelete(id);

    return NextResponse.json({ message: "Notification dismissed successfully" });
  } catch (err) {
    console.error("[api:notifications:id] DELETE Error:", err);
    return NextResponse.json(
      { message: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
