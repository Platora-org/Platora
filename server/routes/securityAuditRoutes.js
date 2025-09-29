import express from 'express';
import { 
  getAllSecurityLogs,
  getSecurityStatistics,
  getUserSecurityLogs,
  getSecurityLogsByIP,
  clearOldSecurityLogs,
  exportSecurityLogs
} from '../controllers/securityAuditController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

// Admin-only routes for security audit management
router.get("/all", verifyJWT, checkRole("admin"), getAllSecurityLogs);
router.get("/statistics", verifyJWT, checkRole("admin"), getSecurityStatistics);
router.get("/ip/:ipAddress", verifyJWT, checkRole("admin"), getSecurityLogsByIP);
router.get("/export", verifyJWT, checkRole("admin"), exportSecurityLogs);
router.delete("/cleanup", verifyJWT, checkRole("admin"), clearOldSecurityLogs);

// User routes (admin can access any user, users can only access their own)
router.get("/user/:userId", verifyJWT, getUserSecurityLogs);

export default router;