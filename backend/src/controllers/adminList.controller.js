// controllers/adminList.controller.js
import Admin from "../models/admin.model.js";

/**
 * GET /api/admin/users/admins
 * Returns a list of admins (without passwords)
 */
export const listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    res.json({
      total: admins.length,
      admins,
    });
  } catch (err) {
    console.error("listAdmins error:", err);
    res.status(500).json({ message: err.message });
  }
};
