// routes/adminUser.routes.js
import express from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";
import {
  listUsers,
  getUserById,
  updateUserRole,
  blockUnblockUser,
  deleteUser
} from "../controllers/adminUser.controller.js";

import { listAdmins } from "../controllers/adminList.controller.js"; // <-- NEW

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get("/", listUsers);               // GET /api/admin/users
router.get("/admins", listAdmins);        // GET /api/admin/users/admins  <-- NEW
router.get("/:id", getUserById);         // GET /api/admin/users/:id
router.put("/:id/role", updateUserRole); // PUT /api/admin/users/:id/role
router.put("/:id/block", blockUnblockUser);
router.delete("/:id", deleteUser);

export default router;
