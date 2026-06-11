import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    console.log("=================================");
    console.log("TOKEN EXISTS:", !!token);
    console.log("TOKEN:", token?.substring(0, 30));
    console.log("JWT_SECRET EXISTS:", !!process.env.JWT_SECRET);
    console.log("=================================");

    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    let decoded: any;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      );

      console.log("JWT VERIFIED");
      console.log("DECODED:", decoded);
    } catch (err) {
      console.log("JWT VERIFY FAILED:", err);

      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.id).select(
      "_id name email role"
    );

    console.log("USER FOUND:", !!user);

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("ME API ERROR:", error);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}