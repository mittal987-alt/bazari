import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    await connectDB();

    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json(
        { message: "No Google credential provided" },
        { status: 400 }
      );
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json(
        { message: "Invalid Google token" },
        { status: 401 }
      );
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find existing user or create new one
    let user = await User.findOne({ email });

    if (!user) {
      // New user — create account (no password required for Google users)
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        googleId,
        avatar: picture,
        role: "buyer",
      });
    } else if (!user.googleId) {
      // Existing email/password user — link their Google account
      user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    }

    // Issue JWT (same as regular login)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    console.log("=================================");
    console.log("GOOGLE LOGIN SUCCESS");
    console.log("USER:", user.email);
    console.log("=================================");

    const response = NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      success: true,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("GOOGLE AUTH ERROR:", error);
    return NextResponse.json(
      { message: "Google authentication failed" },
      { status: 500 }
    );
  }
}
