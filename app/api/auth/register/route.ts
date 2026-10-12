import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";

// Basic email format guard — prevents obviously malformed inputs reaching the DB
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = authLimiter.check(ip);
  if (rl.limited) {
    return NextResponse.json(
      { message: "Too many registration attempts. Please wait a minute." },
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

    const { name, email, password } = body as Record<string, unknown>;

    // ── Input validation ─────────────────────────────────────────────────────
    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password
    ) {
      return NextResponse.json({ message: "All fields required" }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ message: "Name too long" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    // Cost 12 for bcrypt (production-safe, still fast enough at registration time)
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      id: user._id,
      name: user.name,
      role: user.role,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    logger.info("User registered", { userId: String(user._id) });

    return response;
  } catch (error) {
    logger.error("Registration error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
