import express from "express";
import { sendOtpEmail, verifyOtpAndGetBrochure } from "../controllers/otp.controller.js";

const router = express.Router();

router.post("/send", sendOtpEmail);
router.post("/verify", verifyOtpAndGetBrochure);

export default router;
