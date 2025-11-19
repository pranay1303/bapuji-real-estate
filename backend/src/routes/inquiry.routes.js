import express from "express";
import {
  createInquiry,
  replyInquiry,
  listInquiries
} from "../controllers/inquiry.controller.js";

import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createInquiry);
router.post("/:id/reply", verifyToken, requireAdmin, replyInquiry);
router.get("/", verifyToken, requireAdmin, listInquiries);

export default router;
