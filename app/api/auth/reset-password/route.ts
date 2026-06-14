import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { token, email, password } = await req.json();

    console.log("RESET ATTEMPT - email:", email, "token length:", token?.length);

    if (!token || !email || !password) {
      return NextResponse.json(
        { message: "Token, email, and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Hash the incoming raw token to match stored hashed token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    console.log("Looking for token hash:", hashedToken.substring(0, 20) + "...");

    // Find user with matching email first (for better debugging)
    const userByEmail = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!userByEmail) {
      console.log("No user found with email:", email);
      return NextResponse.json(
        { message: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    console.log("User found. Stored token:", userByEmail.resetPasswordToken?.substring(0, 20) + "...");
    console.log("Token expiry:", userByEmail.resetPasswordExpiry);
    console.log("Now:", new Date());
    console.log("Token match:", userByEmail.resetPasswordToken === hashedToken);
    console.log("Token expired:", userByEmail.resetPasswordExpiry && userByEmail.resetPasswordExpiry < new Date());

    // Validate token and expiry
    if (
      !userByEmail.resetPasswordToken ||
      userByEmail.resetPasswordToken !== hashedToken
    ) {
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset fields using findOneAndUpdate
    await User.findOneAndUpdate(
      { _id: userByEmail._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpiry: "" },
      }
    );

    console.log("PASSWORD RESET SUCCESS:", userByEmail.email);

    return NextResponse.json({
      message: "Password reset successfully. You can now log in.",
      success: true,
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
