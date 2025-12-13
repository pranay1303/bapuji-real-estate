import express from "express";
import {
  createInquiry,
  replyInquiry,
  listInquiries,
  closeInquiry   // <-- import it
} from "../controllers/inquiry.controller.js";

import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createInquiry);
router.post("/:id/reply", verifyToken, requireAdmin, replyInquiry);
router.post("/:id/close", verifyToken, requireAdmin, closeInquiry); // <-- new: POST to close
router.get("/", verifyToken, requireAdmin, listInquiries);

export default router;
