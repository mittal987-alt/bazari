import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";

export async function POST(req: Request) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = authLimiter.check(ip);
  if (rl.limited) {
    return NextResponse.json(
      { message: "Too many attempts. Please wait a minute." },
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

    const { token, email, password } = body as Record<string, unknown>;

    if (
      typeof token !== "string" || !token ||
      typeof email !== "string" || !email ||
      typeof password !== "string" || !password
    ) {
      return NextResponse.json(
        { message: "Token, email, and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Hash the incoming raw token to compare against the stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Look up by email first, then validate token — avoids timing leak on token
    const userByEmail = await User.findOne({
      email: email.toString().trim().toLowerCase(),
    });

    if (!userByEmail) {
      return NextResponse.json(
        { message: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Validate token match using crypto.timingSafeEqual to prevent timing attacks
    const storedToken = userByEmail.resetPasswordToken;
    const tokenValid =
      storedToken &&
      storedToken.length === hashedToken.length &&
      crypto.timingSafeEqual(Buffer.from(storedToken, "hex"), Buffer.from(hashedToken, "hex"));

    if (!tokenValid) {
      return NextResponse.json(
        { message: "Invalid reset link. Please request a new one." },
        { status: 400 }
      );
    }

    if (
      !userByEmail.resetPasswordExpiry ||
      userByEmail.resetPasswordExpiry < new Date()
    ) {
      return NextResponse.json(
        { message: "Reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password and clear the reset token atomically
    const hashedPassword = await bcrypt.hash(password, 12);

    await User.findOneAndUpdate(
      { _id: userByEmail._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpiry: "" },
      }
    );

    logger.info("Password reset successful", { userId: String(userByEmail._id) });

    return NextResponse.json({
      message: "Password reset successfully. You can now log in.",
      success: true,
    });
  } catch (error) {
    logger.error("Reset password error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
