import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({
        message: "If that email exists, a reset link has been sent.",
      });
    }

    // Check if user signed up with Google only (no password)
    if (!user.password && user.googleId) {
      return NextResponse.json({
        message:
          "This account uses Google Sign-In. Please log in with Google instead.",
        googleOnly: true,
      });
    }

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Use findOneAndUpdate to reliably save token to MongoDB
    await User.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: hashedToken,
          resetPasswordExpiry: expiry,
        },
      }
    );

    console.log("Reset token saved for:", user.email);
    console.log("Token (first 20):", hashedToken.substring(0, 20));
    console.log("Expiry:", expiry);

    // Build reset URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Send email via nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: `"Bazaari" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Bazaari Password",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
                        <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:28px;font-weight:900;color:#fff;font-style:italic;">B</div>
                        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;">Password Reset</h1>
                        <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;font-weight:500;">Bazaari · Secure Gateway</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:36px 40px;">
                        <p style="margin:0 0 16px;color:#a0a0b0;font-size:14px;line-height:1.6;">Hi <strong style="color:#e0e0f0;">${user.name || "there"}</strong>,</p>
                        <p style="margin:0 0 28px;color:#a0a0b0;font-size:14px;line-height:1.6;">
                          We received a request to reset your password. Click the button below — this link expires in <strong style="color:#e0e0f0;">1 hour</strong>.
                        </p>
                        <div style="text-align:center;margin:0 0 28px;">
                          <a href="${resetUrl}"
                            style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:900;font-size:13px;letter-spacing:1px;text-transform:uppercase;box-shadow:0 8px 32px rgba(99,102,241,0.3);">
                            Reset My Password
                          </a>
                        </div>
                        <p style="margin:0 0 8px;color:#606070;font-size:12px;line-height:1.6;">
                          If the button doesn't work, copy this link:
                        </p>
                        <p style="margin:0 0 28px;word-break:break-all;">
                          <a href="${resetUrl}" style="color:#6366f1;font-size:11px;">${resetUrl}</a>
                        </p>
                        <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                          <p style="margin:0;color:#505060;font-size:12px;line-height:1.6;">
                            If you didn't request this, you can safely ignore this email. Your password won't change.
                          </p>
                        </div>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 40px;background:#111120;text-align:center;border-top:1px solid rgba(255,255,255,0.04);">
                        <p style="margin:0;color:#404050;font-size:11px;">© 2025 Bazaari · All rights reserved</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    return NextResponse.json({
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
