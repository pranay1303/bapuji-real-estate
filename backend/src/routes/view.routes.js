import express from "express";
import {
  incrementView,
  incrementDownload,
  getTopProperties
} from "../controllers/view.controller.js";

import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:id/view", incrementView);
router.post("/:id/download", incrementDownload);
router.get("/top", verifyToken, requireAdmin, getTopProperties);

export default router;
