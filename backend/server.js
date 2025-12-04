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
import adminUserRoutes from "./src/routes/adminUser.routes.js"; // <-- ADDED

// --- PROPERTY / UPLOAD ROUTES ---
import propertyRoutes from "./src/routes/property.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";

// --- USER ROUTES ---
import userAuthRoutes from "./src/routes/userAuth.routes.js";    // Register/Login
import userRoutes from "./src/routes/user.routes.js";            // Profile/Saved/Dashboard

// --- OTP + PASSWORD RESET ---
import otpRoutes from "./src/routes/otp.routes.js";              // Brochure OTP
import passwordRoutes from "./src/routes/password.routes.js";    // Password Reset OTP

// --- LEADS / INQUIRIES / REVIEWS / VIEWS ---
import leadRoutes from "./src/routes/lead.routes.js";
import inquiryRoutes from "./src/routes/inquiry.routes.js";
import reviewRoutes from "./src/routes/review.routes.js";
import viewRoutes from "./src/routes/view.routes.js";


// ---------------- INIT APP ---------------- //
const app = express();

// ---------------- MIDDLEWARES ---------------- //
app.use(express.json());
app.use(cors());

// ---------------- ROUTES ---------------- //

// --- Admin ---
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin-test", adminTestRoutes);
app.use("/api/admin-dashboard", adminDashboardRoutes);

// --- Admin user management (requires admin token) ---
app.use("/api/admin/users", adminUserRoutes); // <-- ADDED

// --- User Auth + User Features ---
app.use("/api/user", userAuthRoutes);   // /register, /login
app.use("/api/user", userRoutes);       // /me, /saved, /dashboard etc.

// --- OTP & Password Reset ---
app.use("/api/otp", otpRoutes);         // brochure OTP
app.use("/api/password", passwordRoutes); // password reset

// --- Properties + Upload ---
app.use("/api/properties", propertyRoutes);
app.use("/api/upload", uploadRoutes);

// --- Leads / Inquiries / Reviews / Views ---
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
