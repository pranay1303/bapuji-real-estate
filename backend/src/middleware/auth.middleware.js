import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";

/**
 * verifyToken - validates JWT and sets req.user
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith?.("Bearer ")) return res.status(401).json({ message: "Unauthorized: no token" });

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // minimal payload contains id & role
    req.user = { id: payload.id, role: payload.role };

    // optional: fetch user/admin from DB (if you want fresh info)
    if (payload.role === "admin") {
      const admin = await Admin.findById(payload.id).select("-password");
      if (!admin) return res.status(401).json({ message: "Unauthorized: admin not found" });
      req.user.admin = admin;
    }

    next();
  } catch (err) {
    console.error("verifyToken error", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * requireAdmin - ensures req.user.role === 'admin'
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden: admin only" });
  next();
};
