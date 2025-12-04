import OTP from "../models/otp.model.js";
import User from "../models/user.model.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

// reuse transporter (same config as your otp.controller)
// you can also import transporter from a shared utils file if you created one.
// For simplicity, duplicate config here (same env vars)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

// POST /api/password/send-reset
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) {
      // don't reveal whether email exists — respond success to prevent enumeration
      return res.json({ message: "If the email exists, a reset code has been sent" });
    }

    // generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // save OTP (property null for password flow)
    await OTP.create({ email, code, property: null, expiresAt });

    // send mail
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Code — Bapuji Real Estate",
      html: `<p>Your password reset code is <b>${code}</b>. It will expire in 10 minutes.</p>`
    });

    return res.json({ message: "If the email exists, a reset code has been sent" });
  } catch (err) {
    console.error("sendPasswordResetEmail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/password/verify-reset
export const verifyResetAndSetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: "Missing fields" });

    // find OTP (unused)
    const otp = await OTP.findOne({ email, code, used: false, property: null }).sort({ createdAt: -1 });
    if (!otp) return res.status(400).json({ message: "Invalid code" });
    if (otp.expiresAt < new Date()) return res.status(400).json({ message: "Code expired" });

    // mark used
    otp.used = true;
    await otp.save();

    // find user and set new password
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("verifyResetAndSetPassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
