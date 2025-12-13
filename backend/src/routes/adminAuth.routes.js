import express from "express";
import {
  registerAdmin,
  loginAdmin,
  getAdminMe,
  updateAdminMe,
} from "../controllers/adminAuth.controller.js";

import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// auth
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// profile (ADMIN ONLY)
router.get("/me", verifyToken, requireAdmin, getAdminMe);
router.put("/me", verifyToken, requireAdmin, updateAdminMe);

export default router;
