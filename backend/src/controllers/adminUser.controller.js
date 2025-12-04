import User from "../models/user.model.js";

/**
 * GET /api/admin/users
 * Query params: page, limit, q, role, active
 */
export const listUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "20"));
    const q = req.query.q || "";
    const role = req.query.role;
    const active = req.query.active;

    const filter = {};
    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [{ name: re }, { username: re }, { email: re }, { mobile: re }];
    }
    if (role) filter.role = role;
    if (active !== undefined) filter.isActive = active === "true";

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ total, page, limit, users });
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select("-password").populate("savedProperties").populate("recentViews");
    if (!u) return res.status(404).json({ message: "User not found" });
    res.json({ user: u });
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "role required" });
    const allowed = ["user", "agent", "admin"];
    if (!allowed.includes(role)) return res.status(400).json({ message: "Invalid role" });

    const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Role updated", user: updated });
  } catch (err) {
    console.error("updateUserRole error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const blockUnblockUser = async (req, res) => {
  try {
    const { block } = req.body;
    if (typeof block !== "boolean") return res.status(400).json({ message: "block must be boolean" });

    // block=true => isActive=false
    const updated = await User.findByIdAndUpdate(req.params.id, { isActive: !block }, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });

    const message = block ? "User blocked" : "User unblocked";
    res.json({ message, user: updated });
  } catch (err) {
    console.error("blockUnblockUser error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: err.message });
  }
};
