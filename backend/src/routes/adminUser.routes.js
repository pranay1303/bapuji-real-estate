import express from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";
import {
  listUsers,
  getUserById,
  updateUserRole,
  blockUnblockUser,
  deleteUser
} from "../controllers/adminUser.controller.js";

const router = express.Router();

// require admin for all routes here
router.use(verifyToken, requireAdmin);

router.get("/", listUsers); // GET /api/admin/users
router.get("/:id", getUserById); // GET /api/admin/users/:id
router.put("/:id/role", updateUserRole); // PUT /api/admin/users/:id/role
router.put("/:id/block", blockUnblockUser); // PUT /api/admin/users/:id/block  body { block: true }
router.delete("/:id", deleteUser); // DELETE /api/admin/users/:id

export default router;
