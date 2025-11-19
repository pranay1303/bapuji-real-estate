// ---------------- LOAD ENV FIRST ---------------- //
import dotenv from "dotenv";
dotenv.config();

// ---------------- IMPORTS ---------------- //
import express from "express";
import cors from "cors";
import connectDB from "./src/config/db.js";

// ROUTES
import adminAuthRoutes from "./src/routes/adminAuth.routes.js";
import adminTestRoutes from "./src/routes/adminTest.routes.js";
import propertyRoutes from "./src/routes/property.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";
import adminDashboardRoutes from "./src/routes/adminDashboard.routes.js";

import leadRoutes from "./src/routes/lead.routes.js";
import inquiryRoutes from "./src/routes/inquiry.routes.js";
import reviewRoutes from "./src/routes/review.routes.js";
import viewRoutes from "./src/routes/view.routes.js";

import userAuthRoutes from "./src/routes/userAuth.routes.js";   // ⭐ USER AUTH ROUTES
import otpRoutes from "./src/routes/otp.routes.js";            // ⭐ OTP ROUTES


const app = express();

// ---------------- MIDDLEWARES ---------------- //
app.use(express.json());
app.use(cors());

// ---------------- ROUTES ---------------- //
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin-test", adminTestRoutes);

app.use("/api/user", userAuthRoutes);        // ⭐ USER AUTH
app.use("/api/otp", otpRoutes);              // ⭐ OTP SEND + VERIFY

app.use("/api/properties", propertyRoutes);
app.use("/api/upload", uploadRoutes);

app.use("/api/admin-dashboard", adminDashboardRoutes);

app.use("/api/leads", leadRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/views", viewRoutes);

// ---------------- DEFAULT ROUTE ---------------- //
app.get("/", (req, res) => {
  res.send("🔥 THIS IS THE CORRECT BACKEND 🔥");
});

// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
    