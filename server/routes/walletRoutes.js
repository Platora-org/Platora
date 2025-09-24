import express from "express";
import { body, validationResult } from "express-validator"; 
import pool from "../config/db.js";
import {
  getWallet,
  getExchangeRates,
  updateExchangeRates,
  calculateCoinPrice,
  getSupportedCurrencies,
  createPaymentIntent,
  processSuccessfulPayment,
  checkPaymentStatus,
  spendCoins,
  getTransactions,
  getAnalytics,
  getRefunds,
  addCoinsManually,
  convertCurrency,
  setWalletPin,
  verifyWalletPin,
  checkPinStatus,
  changeWalletPin,
  resetWalletPin,
  unlockWallet,
  getPinSecurityReport,
  getRestaurantEarnings,
  getRestaurantMonthlySummary,
  getRestaurantEarningsHistory
} from "../controllers/walletController.js";
import {
  validateSpend,
  validateTransactionQuery,
  validateAnalyticsQuery,
  validatePaymentIntent,
  validatePinSetup,
  validatePinVerification,
  validatePinChange,
  validateAdminUserAction,
  validateCurrencyConversion,
  validatePaymentStatus,
  validateManualCoinAddition,
  validateRefund,
  checkSuspiciousActivity,
  checkWalletStatus,
  pinAttemptLimiter,
  paymentLimiter,
  spendingLimiter
} from "../middleware/walletValidation.js";
import {
  getAdminPendingPayouts,
  processRestaurantPayout,
  getPayoutHistory,
  getPlatformRevenueAnalytics
} from '../controllers/adminPayoutController.js';
import verifyJWT from "../middleware/verifyToken.js";
import checkRole from "../middleware/requireRole.js";

const router = express.Router();

// Basic wallet routes
router.get("/", verifyJWT, checkWalletStatus, getWallet);
router.get("/transactions", verifyJWT, validateTransactionQuery, getTransactions);
router.get("/analytics", verifyJWT, validateAnalyticsQuery, getAnalytics);
router.get("/refunds", verifyJWT, getRefunds);

// PIN management routes with enhanced security
router.get("/pin/status", verifyJWT, checkPinStatus);
router.post("/pin/set", 
  verifyJWT, 
  checkSuspiciousActivity,
  validatePinSetup, 
  setWalletPin
);
router.post("/pin/verify", 
  verifyJWT, 
  checkSuspiciousActivity,
  validatePinVerification, 
  verifyWalletPin
);
router.post("/pin/change", 
  verifyJWT, 
  checkSuspiciousActivity,
  validatePinChange, 
  changeWalletPin
);

// Admin PIN routes
router.post("/pin/reset", 
  verifyJWT, 
  checkRole("admin"), 
  validateAdminUserAction, 
  resetWalletPin
);
router.post("/unlock", 
  verifyJWT, 
  checkRole("admin"), 
  validateAdminUserAction, 
  unlockWallet
);
router.get("/security-report", 
  verifyJWT, 
  checkRole("admin"), 
  getPinSecurityReport
);

// Exchange rate routes
router.get("/rates", getExchangeRates);
router.post("/rates/update", 
  verifyJWT, 
  checkRole("admin"), 
  updateExchangeRates
);

// Currency and pricing routes
router.get("/currencies", getSupportedCurrencies);
router.get("/calculate-price", calculateCoinPrice);
router.get("/convert", validateCurrencyConversion, convertCurrency);

// Stripe payment routes (without webhooks)
router.post("/create-payment-intent",
  verifyJWT,
  checkRole("customer"),
  checkWalletStatus,
  validatePaymentIntent,
  createPaymentIntent
);

// Manual payment processing (replaces webhook)
router.post("/process-payment",
  verifyJWT,
  checkRole("customer"),
  checkWalletStatus,
  processSuccessfulPayment
);

// Check payment status (for frontend polling)
router.get("/payment-status/:paymentIntentId",
  verifyJWT,
  checkPaymentStatus
);

// Transaction routes with enhanced validation
router.post("/spend", 
  verifyJWT, 
  checkWalletStatus,
  checkSuspiciousActivity,
  validateSpend, 
  spendCoins
);

// Admin routes
router.post("/add-coins", 
  verifyJWT, 
  checkRole("admin"), 
  validateManualCoinAddition,
  addCoinsManually
);

// Additional security and utility routes
router.get("/security/logs", 
  verifyJWT, 
  checkRole("admin"), 
  async (req, res) => {
    try {
      const { page = 1, limit = 50, userId, action } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT sl.*, u.email, u.first_name, u.last_name
        FROM security_logs sl
        LEFT JOIN users u ON sl.user_id = u.id
        WHERE 1=1
      `;
      let values = [];
      let paramCount = 0;
      
      if (userId) {
        paramCount++;
        query += ` AND sl.user_id = $${paramCount}`;
        values.push(userId);
      }
      
      if (action) {
        paramCount++;
        query += ` AND sl.action = $${paramCount}`;
        values.push(action);
      }
      
      query += ` ORDER BY sl.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      
      res.json({
        success: true,
        logs: result.rows,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
    } catch (error) {
      console.error('Error fetching security logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch security logs'
      });
    }
  }
);

// Wallet settings routes
router.get("/settings", 
  verifyJWT, 
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      const query = `
        SELECT * FROM wallet_settings 
        WHERE user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Create default settings if not exists
        const createQuery = `
          INSERT INTO wallet_settings (user_id)
          VALUES ($1)
          RETURNING *
        `;
        const createResult = await pool.query(createQuery, [userId]);
        return res.json({
          success: true,
          settings: createResult.rows[0]
        });
      }
      
      res.json({
        success: true,
        settings: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error fetching wallet settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet settings'
      });
    }
  }
);

router.put("/settings", 
  verifyJWT,
  [
    body('daily_spend_limit')
      .optional()
      .isFloat({ min: 0, max: 1000000 })
      .withMessage('Daily spend limit must be between 0 and 1,000,000'),
    body('monthly_spend_limit')
      .optional()
      .isFloat({ min: 0, max: 10000000 })
      .withMessage('Monthly spend limit must be between 0 and 10,000,000'),
    body('require_pin_for_spending')
      .optional()
      .isBoolean()
      .withMessage('require_pin_for_spending must be a boolean'),
    body('require_pin_amount_threshold')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('PIN amount threshold must be positive'),
    body('email_notifications')
      .optional()
      .isBoolean()
      .withMessage('email_notifications must be a boolean'),
    body('sms_notifications')
      .optional()
      .isBoolean()
      .withMessage('sms_notifications must be a boolean'),
    body('spending_alerts')
      .optional()
      .isBoolean()
      .withMessage('spending_alerts must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const userId = req.user.id;
      const {
        daily_spend_limit,
        monthly_spend_limit,
        require_pin_for_spending,
        require_pin_amount_threshold,
        email_notifications,
        sms_notifications,
        spending_alerts
      } = req.body;
      
      const updateFields = [];
      const values = [];
      let paramCount = 0;
      
      const addField = (field, value) => {
        if (value !== undefined) {
          paramCount++;
          updateFields.push(`${field} = $${paramCount}`);
          values.push(value);
        }
      };
      
      addField('daily_spend_limit', daily_spend_limit);
      addField('monthly_spend_limit', monthly_spend_limit);
      addField('require_pin_for_spending', require_pin_for_spending);
      addField('require_pin_amount_threshold', require_pin_amount_threshold);
      addField('email_notifications', email_notifications);
      addField('sms_notifications', sms_notifications);
      addField('spending_alerts', spending_alerts);
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      const query = `
        UPDATE wallet_settings 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE user_id = $${paramCount + 1}
        RETURNING *
      `;
      
      values.push(userId);
      
      const result = await pool.query(query, values);
      
      res.json({
        success: true,
        message: 'Settings updated successfully',
        settings: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error updating wallet settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update wallet settings'
      });
    }
  }
);

// Analytics routes for admin
router.get("/admin/analytics", 
  verifyJWT, 
  checkRole("admin"), 
  async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      // Get wallet analytics
      const walletAnalyticsQuery = `
        SELECT * FROM wallet_analytics
        ORDER BY total_spent DESC
        LIMIT 100
      `;
      
      const securityMetricsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN has_pin THEN 1 END) as users_with_pin,
          COUNT(CASE WHEN wallet_status = 'FROZEN' THEN 1 END) as frozen_wallets,
          COUNT(CASE WHEN suspicious_activities > 0 THEN 1 END) as users_with_suspicious_activity,
          AVG(recent_failed_pins) as avg_recent_failed_pins
        FROM security_metrics
      `;
      
      const [walletAnalytics, securityMetrics] = await Promise.all([
        pool.query(walletAnalyticsQuery),
        pool.query(securityMetricsQuery)
      ]);
      
      res.json({
        success: true,
        analytics: {
          walletMetrics: walletAnalytics.rows,
          securityMetrics: securityMetrics.rows[0]
        }
      });
      
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }
  }
);

// Cleanup route for admin
router.post("/admin/cleanup", 
  verifyJWT, 
  checkRole("admin"), 
  async (req, res) => {
    try {
      const result = await pool.query('SELECT cleanup_old_logs()');
      const deletedCount = result.rows[0].cleanup_old_logs;
      
      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old log entries`
      });
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform cleanup'
      });
    }
  }
);

// Restaurant earnings routes
router.get('/restaurant/earnings', verifyJWT, getRestaurantEarnings);
router.get('/restaurant/monthly-summary', verifyJWT, getRestaurantMonthlySummary);
router.get('/restaurant/history', verifyJWT, getRestaurantEarningsHistory);

// Admin payout routes
router.get('/admin/pending-payouts', verifyJWT, checkRole(['admin']), getAdminPendingPayouts);
router.post('/admin/process-payout', verifyJWT, checkRole(['admin']), processRestaurantPayout);
router.get('/admin/payout-history', verifyJWT, checkRole(['admin']), getPayoutHistory);
router.get('/admin/platform-revenue', verifyJWT, checkRole(['admin']), getPlatformRevenueAnalytics);

export default router;