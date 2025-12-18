// ---------------- LOAD ENV FIRST ---------------- //
import dotenv from "dotenv";
dotenv.config();

// ---------------- IMPORTS ---------------- //
import express from "express";
import cors from "cors";
import connectDB from "./src/config/db.js";

// --- ADMIN ROUTES ---
import adminAuthRoutes from "./src/routes/adminAuth.routes.js";
import adminTestRoutes from "./src/routes/adminTest.routes.js";
import adminDashboardRoutes from "./src/routes/adminDashboard.routes.js";
import adminUserRoutes from "./src/routes/adminUser.routes.js";

// --- PROPERTY / UPLOAD ROUTES ---
import propertyRoutes from "./src/routes/property.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";

// --- USER ROUTES ---
import userAuthRoutes from "./src/routes/userAuth.routes.js";
import userRoutes from "./src/routes/user.routes.js";

// --- OTP + PASSWORD RESET ---
import otpRoutes from "./src/routes/otp.routes.js";
import passwordRoutes from "./src/routes/password.routes.js";

// --- LEADS / INQUIRIES / REVIEWS / VIEWS ---
import leadRoutes from "./src/routes/lead.routes.js";
import inquiryRoutes from "./src/routes/inquiry.routes.js";
import reviewRoutes from "./src/routes/review.routes.js";
import viewRoutes from "./src/routes/view.routes.js";

// ---------------- INIT APP ---------------- //
const app = express();

// ---------------- DB CONNECT (SAFE FOR SERVERLESS) ---------------- //
connectDB();

// ---------------- MIDDLEWARES ---------------- //
app.use(cors());
app.use(express.json());

// ---------------- ROUTES ---------------- //

// Admin
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin-test", adminTestRoutes);
app.use("/api/admin-dashboard", adminDashboardRoutes);
app.use("/api/admin/users", adminUserRoutes);

// Users
app.use("/api/user", userAuthRoutes);
app.use("/api/user", userRoutes);

// OTP & Password
app.use("/api/otp", otpRoutes);
app.use("/api/password", passwordRoutes);

// Properties
app.use("/api/properties", propertyRoutes);
app.use("/api/upload", uploadRoutes);

// Leads / Reviews / Views
app.use("/api/leads", leadRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/views", viewRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("🔥 Backend is running on Vercel 🔥");
});

// ❌ NO app.listen()
export default app;
