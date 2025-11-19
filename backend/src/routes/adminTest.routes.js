import express from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// protected admin-only test route
router.get("/private", verifyToken, requireAdmin, (req, res) => {
  return res.json({
    message: "Hello Admin — you accessed a protected route",
    admin: req.user.admin || { id: req.user.id, role: req.user.role },
  });
});

export default router;
