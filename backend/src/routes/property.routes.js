import express from "express";
import multer from "multer";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

import {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  uploadPropertyImages,
  uploadBrochure
} from "../controllers/property.controller.js";

const router = express.Router();
const upload = multer(); // to handle file uploads

// ===============================
// PUBLIC ROUTES
// ===============================
router.get("/", getAllProperties);
router.get("/:id", getPropertyById);

// ===============================
// ADMIN ONLY ROUTES (CRUD)
// ===============================
router.post("/", verifyToken, requireAdmin, createProperty);
router.put("/:id", verifyToken, requireAdmin, updateProperty);
router.delete("/:id", verifyToken, requireAdmin, deleteProperty);

// ===============================
// FILE UPLOAD ROUTES
// ===============================

// 📌 Upload Multiple Images
router.post(
  "/:id/images",
  verifyToken,
  requireAdmin,
  upload.array("images"),
  uploadPropertyImages
);

// 📌 Upload Single Brochure (PDF)
router.post(
  "/:id/brochure",
  verifyToken,
  requireAdmin,
  upload.single("brochure"),
  uploadBrochure
);

export default router;
