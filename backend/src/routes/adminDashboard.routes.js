import express from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";
import { getAdminDashboardStats } from "../controllers/adminDashboard.controller.js";

const router = express.Router();

// Admin Dashboard → Protected Route
router.get("/stats", verifyToken, requireAdmin, getAdminDashboardStats);

export default router;
