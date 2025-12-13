// routes/property.route.js
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
  uploadBrochure,
  deletePropertyImage,
  deleteBrochure
} from "../controllers/property.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // to handle file uploads in memory

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

// Upload Multiple Images
router.post(
  "/:id/images",
  verifyToken,
  requireAdmin,
  upload.array("images", 10), // allow up to 10 images at once
  uploadPropertyImages
);

// Upload Single Brochure (PDF)
router.post(
  "/:id/brochure",
  verifyToken,
  requireAdmin,
  upload.single("brochure"),
  uploadBrochure
);

// DELETE a specific image by index
router.delete(
  "/:id/images/:imageIndex",
  verifyToken,
  requireAdmin,
  deletePropertyImage
);

// DELETE brochure
router.delete(
  "/:id/brochure",
  verifyToken,
  requireAdmin,
  deleteBrochure
);

export default router;
