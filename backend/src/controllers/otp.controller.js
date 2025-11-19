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
    const { email, propertyId } = req.body;
    if (!email || !propertyId)
      return res.status(400).json({ message: "Email & propertyId required" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({ email, code, property: propertyId, expiresAt });

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
    const { email, propertyId, code, name, phone } = req.body;

    if (!email || !propertyId || !code)
      return res.status(400).json({ message: "Missing fields" });

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

    // Create lead
    const lead = await Lead.create({
      name: name || "",
      phone: phone || "",
      email,
      property: propertyId,
      action: "download_brochure",
      source: "email_otp"
    });

    // Analytics
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
    res.status(500).json({ message: err.message });
  }
};
