import express from "express"; // ✅ ADD THIS LINE
import { uploadKYC as kycUploadMiddleware } from "../middleware/upload.js";
import {
  getKYCStatus,
  uploadKYC,
  fetchPendingKYCRequests,
  getAllKYCRequests,
  getKYCStats,
  approveKYCRequest,
  rejectKYCRequest,
  viewDocument
} from "../controllers/kycController.js";
import verifyJWT from "../middleware/verifyToken.js";
import checkRole from "../middleware/requireRole.js";

const router = express.Router();

// Restaurant routes
router.get("/status", verifyJWT, checkRole("restaurant"), getKYCStatus);
router.post("/upload", verifyJWT, checkRole("restaurant"), kycUploadMiddleware, uploadKYC);

// Admin routes
router.get("/pending", verifyJWT, checkRole("admin"), fetchPendingKYCRequests);
router.get("/all", verifyJWT, checkRole("admin"), getAllKYCRequests);
router.get("/statistics", verifyJWT, checkRole("admin"), getKYCStats);
router.get("/document", verifyJWT, checkRole("admin"), viewDocument);
router.post("/approve/:kycId", verifyJWT, checkRole("admin"), approveKYCRequest);
router.post("/reject/:kycId", verifyJWT, checkRole("admin"), rejectKYCRequest);

export default router;