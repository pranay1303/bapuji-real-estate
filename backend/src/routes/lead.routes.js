import express from "express";
import { createLead, listLeads } from "../controllers/lead.controller.js";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createLead);
router.get("/", verifyToken, requireAdmin, listLeads);

export default router;
