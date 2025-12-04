import express from "express";
import { sendPasswordResetEmail, verifyResetAndSetPassword } from "../controllers/password.controller.js";

const router = express.Router();

// send reset code to email
router.post("/send-reset", sendPasswordResetEmail);

// verify code and set new password
router.post("/verify-reset", verifyResetAndSetPassword);

export default router;
