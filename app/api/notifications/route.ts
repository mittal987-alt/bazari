import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10)), 50);

    const filter: any = { recipient: authUser.id };
    if (unreadOnly) {
      filter.isRead = false;
    }

    // Parallelize count and query reads
    const [total, unreadCount, notifications] = await Promise.all([
      unreadOnly
        ? Notification.countDocuments({ recipient: authUser.id, isRead: false })
        : Notification.countDocuments({ recipient: authUser.id }),
      Notification.countDocuments({
        recipient: authUser.id,
        isRead: false,
      }),
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });

  } catch (err) {
    console.error("[api:notifications] GET Error:", err);
    return NextResponse.json(
      { message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
