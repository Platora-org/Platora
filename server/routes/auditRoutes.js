import express from "express";
import {
  fetchKYCAuditLogs,
  fetchAllAuditLogs,
  fetchAdminAuditLogs,
  fetchAuditStatistics
} from "../controllers/auditController.js";
import verifyJWT from "../middleware/verifyToken.js";
import checkRole from "../middleware/requireRole.js";

const router = express.Router();

router.get("/kyc/:kycId", verifyJWT, checkRole("admin"), fetchKYCAuditLogs);
router.get("/all", verifyJWT, checkRole("admin"), fetchAllAuditLogs);
router.get("/my-logs", verifyJWT, checkRole("admin"), fetchAdminAuditLogs);
router.get("/statistics", verifyJWT, checkRole("admin"), fetchAuditStatistics);

export default router;