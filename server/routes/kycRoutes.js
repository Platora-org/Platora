import express from "express";
import { uploadKYC as kycUploadMiddleware } from "../middleware/upload.js";
import {
  getKYCStatus,
  uploadKYC,
  fetchPendingKYCRequests,
  approveKYCRequest,
  rejectKYCRequest
} from "../controllers/kycController.js";
import verifyJWT from "../middleware/verifyToken.js";
import checkRole from "../middleware/requireRole.js";

const router = express.Router();

// Restaurant routes
router.get("/status", verifyJWT, checkRole("restaurant"), getKYCStatus);
router.post("/upload", verifyJWT, checkRole("restaurant"), kycUploadMiddleware, uploadKYC);

// Admin routes
router.get("/pending", verifyJWT, checkRole("admin"), fetchPendingKYCRequests);
router.post("/approve/:kycId", verifyJWT, checkRole("admin"), approveKYCRequest);
router.post("/reject/:kycId", verifyJWT, checkRole("admin"), rejectKYCRequest);

export default router;