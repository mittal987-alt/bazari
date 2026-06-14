import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Google-only accounts have no password
    if (!user.password) {
      return NextResponse.json(
        { message: "This account uses Google Sign-In. Please log in with Google instead." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password as string
    );

    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    console.log("=================================");
    console.log("LOGIN SUCCESS");
    console.log("USER:", user.email);
    console.log("TOKEN CREATED:", token.substring(0, 30));
    console.log("=================================");

    const response = NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      success: true,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false, // localhost
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}