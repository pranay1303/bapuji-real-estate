// controllers/otp.controller.js
import OTP from "../models/otp.model.js";
import Property from "../models/property.model.js";
import Lead from "../models/lead.model.js";
import View from "../models/view.model.js";
import nodemailer from "nodemailer";

// ----------------------------------
// EMAIL TRANSPORTER
// ----------------------------------
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

// ----------------------------------
// SEND OTP
// ----------------------------------
export const sendOtpEmail = async (req, res) => {
  try {
    const { email, propertyId, phone } = req.body;
    if (!email || !propertyId)
      return res.status(400).json({ message: "Email & propertyId required" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // store phone with OTP if provided (optional)
    await OTP.create({ email, phone: phone || "", code, property: propertyId, expiresAt });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Your Bapuji Real Estate Brochure OTP",
      html: `<p>Your OTP to download the brochure is <b>${code}</b>. It expires in 10 minutes.</p>`
    });

    return res.json({ message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ----------------------------------
// VERIFY OTP + RETURN BROCHURE
// ----------------------------------
export const verifyOtpAndGetBrochure = async (req, res) => {
  try {
    // quick debug log (remove or reduce level in production)
    console.log('VERIFY OTP payload:', req.body);

    const { email, propertyId, code, name } = req.body;
    // Accept phone under either `phone` or `mobile` keys (defensive)
    const rawPhone = req.body.phone ?? req.body.mobile ?? "";

    if (!email || !propertyId || !code)
      return res.status(400).json({ message: "Missing fields: email, propertyId and code are required" });

    const otp = await OTP.findOne({
      email, property: propertyId, code, used: false
    }).sort({ createdAt: -1 });

    if (!otp) return res.status(400).json({ message: "Invalid OTP" });

    if (otp.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    otp.used = true;
    await otp.save();

    const property = await Property.findById(propertyId);

    if (!property || !property.brochureUrl) {
      return res.status(404).json({
        message: "Property has no brochure uploaded"
      });
    }

    // Normalize phone: trim and coerce to string; fallback to empty string
    const safePhone = (typeof rawPhone === "string" ? rawPhone.trim() : String(rawPhone || ""));

    if (!safePhone) {
      // log so you can see how many leads miss phone; this is not fatal
      console.warn(`verifyOtpAndGetBrochure: missing phone for email=${email} property=${propertyId}`);
    }

    // Create lead (phone is optional in schema now)
    const lead = await Lead.create({
      name: name || "",
      phone: safePhone,
      email,
      property: propertyId,
      action: "download_brochure",
      source: "email_otp"
    });

    // Analytics: increment brochure downloads count
    await View.findOneAndUpdate(
      { property: propertyId },
      { $inc: { brochureDownloads: 1 } },
      { upsert: true }
    );

    return res.json({
      message: "OTP verified",
      brochureUrl: property.brochureUrl,
      lead,
    });

  } catch (err) {
    // If it's a Mongoose validation error, return 400 with details
    if (err && err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message).join("; ");
      return res.status(400).json({ message: `Validation failed: ${messages}` });
    }
    console.error("verifyOtpAndGetBrochure error:", err);
    res.status(500).json({ message: err.message });
  }
};
