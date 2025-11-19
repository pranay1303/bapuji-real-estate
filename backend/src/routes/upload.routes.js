import express from "express";
import multer from "multer";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

import {
  uploadPropertyImages,
  uploadBrochure,
  deletePropertyImage,
  deleteBrochure
} from "../controllers/upload.controller.js";

const router = express.Router();

// multer memory storage
const upload = multer({ storage: multer.memoryStorage() });


// UPLOAD IMAGES (max 5)
router.post(
  "/:id/images",
  verifyToken,
  requireAdmin,
  upload.array("images", 5),
  uploadPropertyImages
);

// UPLOAD BROCHURE (PDF)
router.post(
  "/:id/brochure",
  verifyToken,
  requireAdmin,
  upload.single("brochure"),
  uploadBrochure
);

// DELETE A SPECIFIC IMAGE
router.delete(
  "/:id/images/:imageIndex",
  verifyToken,
  requireAdmin,
  deletePropertyImage
);

// DELETE BROCHURE
router.delete(
  "/:id/brochure",
  verifyToken,
  requireAdmin,
  deleteBrochure
);

export default router;
