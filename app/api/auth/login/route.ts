import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = authLimiter.check(ip);
  if (rl.limited) {
    return NextResponse.json(
      { message: "Too many login attempts. Please wait a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetMs - Date.now()) / 1000)) },
      }
    );
  }

  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { email, password } = body as Record<string, unknown>;

    // ── Input validation ─────────────────────────────────────────────────────
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Use a constant-time response — never distinguish "user not found" from "wrong password"
    // to prevent user enumeration attacks
    if (!user) {
      // Perform a dummy bcrypt compare to maintain consistent timing
      await bcrypt.compare(password, "$2b$12$invalidhashpadding000000000000000000000000000000000000000");
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // Google-only accounts have no password
    if (!user.password) {
      return NextResponse.json(
        { message: "This account uses Google Sign-In. Please log in with Google instead." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password as string);

    if (!isMatch) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      success: true,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    logger.info("User logged in", { userId: String(user._id) });

    return response;
  } catch (error) {
    logger.error("Login error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}