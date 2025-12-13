import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";

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

    // If role is admin, attempt Admin collection -> fallback to User collection
    if (payload.role === "admin") {
      // 1) Try Admin collection
      const admin = await Admin.findById(payload.id).select("-password").lean();
      if (admin) {
        req.user.admin = admin;
        req.user.profile = {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role || "admin",
          username: admin.username || (admin.email ? admin.email.split("@")[0] : ""),
        };
        return next();
      }

      // 2) Fallback: try User collection (maybe promoted user exists only in users collection)
      const user = await User.findById(payload.id).select("-password").lean();
      if (user && user.role === "admin") {
        // no Admin doc, but user has admin role
        req.user.admin = null;
        req.user.profile = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
        };
        return next();
      }

      // Not found in either → unauthorized
      return res.status(401).json({ message: "Unauthorized: admin not found" });
    }

    // If non-admin role, try to populate profile from User if present
    if (!payload.role || payload.role === "user") {
      const user = await User.findById(payload.id).select("-password").lean();
      if (user) {
        req.user.profile = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role || "user",
          username: user.username,
        };
      }
    }

    next();
  } catch (err) {
    console.error("verifyToken error", err && err.message ? err.message : err);
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
