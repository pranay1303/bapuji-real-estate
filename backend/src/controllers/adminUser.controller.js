import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";

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

/**
 * Update role of a user (and keep Admin collection in sync)
 * If role -> 'admin' : ensure Admin doc exists with same _id (create or sync)
 * If role != 'admin' : remove Admin doc for that id (optional / currently deleting)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "role required" });
    const allowed = ["user", "agent", "admin"];
    if (!allowed.includes(role)) return res.status(400).json({ message: "Invalid role" });

    const userId = req.params.id;

    // Update user role first
    const updated = await User.findByIdAndUpdate(userId, { role }, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });

    // If promoted to admin, ensure Admin doc exists (with same _id)
    if (role === "admin") {
      try {
        const existsAdmin = await Admin.findById(userId);
        if (!existsAdmin) {
          // create Admin doc reusing user's details; maintain same _id
          await Admin.create({
            _id: updated._id,
            name: updated.name,
            email: updated.email,
            password: updated.password || "", // hashed password if present
            role: "admin",
            username: updated.username,
            mobile: updated.mobile,
            profileImage: updated.profileImage || "",
            // add other admin fields/defaults if necessary
          });
        } else {
          // sync some fields
          existsAdmin.name = updated.name || existsAdmin.name;
          existsAdmin.email = updated.email || existsAdmin.email;
          existsAdmin.username = updated.username || existsAdmin.username;
          existsAdmin.mobile = updated.mobile || existsAdmin.mobile;
          await existsAdmin.save();
        }
      } catch (err) {
        console.warn("Failed to create/sync Admin doc after promotion:", err);
        // do not fail the whole request; user role was updated. return a warning.
      }
    } else {
      // demoted from admin => remove Admin doc (optional)
      try {
        await Admin.findByIdAndDelete(userId);
      } catch (err) {
        console.warn("Failed to delete Admin doc after demotion:", err);
      }
    }

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

    // Also delete Admin doc if exists (cleanup)
    try {
      await Admin.findByIdAndDelete(req.params.id);
    } catch (err) {
      console.warn("Failed to delete corresponding Admin doc:", err);
    }

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: err.message });
  }
};
