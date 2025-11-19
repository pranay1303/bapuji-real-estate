import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js"; // reuse existing
import {
  getProfile,
  updateProfile,
  saveProperty,
  unsaveProperty,
  listSaved,
  addRecentView,
  getUserDashboard
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", verifyToken, getProfile);
router.put("/me", verifyToken, updateProfile);

router.post("/save/:id", verifyToken, saveProperty);
router.delete("/save/:id", verifyToken, unsaveProperty);
router.get("/saved", verifyToken, listSaved);

// recent view (protected if user logged in) - can also be used by frontend for guests by calling view route
router.post("/view/:id", verifyToken, addRecentView);

// dashboard
router.get("/dashboard", verifyToken, getUserDashboard);

export default router;
