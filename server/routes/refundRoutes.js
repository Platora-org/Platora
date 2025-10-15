import express from 'express';
import processOrderRefund, { 
  processReservationRefund, 
  getUserRefunds, 
  getRefundById, 
  getUserRefundStats 
} from '../controllers/refundController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';
import reservationController from "../controllers/reservationController.js";

const router = express.Router();

// ============================================
// REFUND PROCESSING ROUTES
// ============================================

// Process order refund (restaurant rejects order)
// POST /api/refunds/order
router.post('/order', verifyJWT, processOrderRefund);

// Process reservation refund (user cancels ≥24 hours before)
// POST /api/refunds/reservation
router.post('/reservation', verifyJWT, checkRole('customer'), processReservationRefund);

// ============================================
// REFUND HISTORY & INFORMATION ROUTES
// ============================================

// Get user refund history with pagination
// GET /api/refunds/history?limit=10&offset=0
router.get('/history', verifyJWT, checkRole('customer'), getUserRefunds);

// Get user refund statistics
// GET /api/refunds/stats
router.get('/stats', verifyJWT, checkRole('customer'), getUserRefundStats);

// Get specific refund details by ID
// GET /api/refunds/:refundId
router.get('/:refundId', verifyJWT, checkRole('customer'), getRefundById);

export default router;