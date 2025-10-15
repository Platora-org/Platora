import express from "express";
import {
  getDeliveryDetails,
  getAgentProfile,
  getCurrentDelivery,
  getAgentDeliveries,
  updateAgentStatus,
  markAsPickedUp,
  verifyDeliveryOtp,
  getActiveAgents,
  getAllAgents
} from "../controllers/deliveryController.js";

import verifyJWT from "../middleware/verifyToken.js";
import checkRole from "../middleware/requireRole.js";

const router = express.Router();

// ============================================
// CUSTOMER ROUTES
// ============================================

router.get(
  "/order/:orderId/details",
  verifyJWT,
  checkRole("customer", "admin"),
  getDeliveryDetails
);

// ============================================
// DELIVERY AGENT ROUTES
// ============================================

router.get(
  "/agent/profile",
  verifyJWT,
  checkRole("delivery"),
  getAgentProfile
);

router.get(
  "/agent/current",
  verifyJWT,
  checkRole("delivery", "admin"),
  getCurrentDelivery
);

router.get(
  "/agent/deliveries",
  verifyJWT,
  checkRole("delivery", "admin"),
  getAgentDeliveries
);

router.put(
  "/agent/status",
  verifyJWT,
  checkRole("delivery", "admin"),
  updateAgentStatus
);

router.put(
  "/order/:orderId/pickup",
  verifyJWT,
  checkRole("delivery"),
  markAsPickedUp
);

router.post(
  "/order/:orderId/verify-otp",
  verifyJWT,
  checkRole("delivery", "admin"),
  verifyDeliveryOtp
);

// ============================================
// ADMIN ROUTES
// ============================================

router.get(
  "/agents/active",
  verifyJWT,
  checkRole("admin"),
  getActiveAgents
);

router.get(
  "/agents",
  verifyJWT,
  checkRole("admin"),
  getAllAgents
);

export default router;
