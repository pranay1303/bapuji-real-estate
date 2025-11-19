import express from "express";
import {
  addReview,
  listReviews,
  moderateReview
} from "../controllers/review.controller.js";

import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", addReview);
router.get("/", listReviews);
router.put("/:id/moderate", verifyToken, requireAdmin, moderateReview);

export default router;
