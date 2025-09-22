import { body, query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import * as WalletModel from '../models/walletModel.js';

// Rate limiters for different operations
export const pinAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many PIN attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 payment attempts per minute
  message: {
    success: false,
    message: 'Too many payment attempts. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const spendingLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 10, // 10 spending attempts per 30 seconds
  message: {
    success: false,
    message: 'Too many spending attempts. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// PIN validation rules
const pinValidationRules = [
  body('pin')
    .isLength({ min: 6, max: 6 })
    .withMessage('PIN must be exactly 6 digits')
    .isNumeric()
    .withMessage('PIN must contain only numbers')
    .custom((value) => {
      // Check for common weak patterns
      const weakPatterns = [
        '000000', '111111', '222222', '333333', '444444', '555555',
        '666666', '777777', '888888', '999999', '123456', '654321',
        '123123', '456456', '789789', '147147', '258258', '369369'
      ];
      
      if (weakPatterns.includes(value)) {
        throw new Error('PIN is too weak. Please choose a different combination.');
      }
      
      return true;
    })
];

// Spending validation
export const validateSpend = [
  spendingLimiter,
  body('coins')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Coins must be between 1 and 10,000'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim()
    .escape(),
  body('orderId')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Order ID must not exceed 100 characters')
    .trim(),
  body('category')
    .optional()
    .isIn(['Food Orders', 'Delivery', 'Service Fee', 'Other'])
    .withMessage('Invalid category'),
  body('requirePin')
    .optional()
    .isBoolean()
    .withMessage('requirePin must be a boolean'),
  handleValidationErrors,
  // Additional middleware to check wallet status
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const wallet = await WalletModel.getWalletByUserId(userId);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      if (wallet.wallet_status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'Wallet is not active. Please contact support.'
        });
      }
      
      next();
    } catch (error) {
      console.error('Error validating wallet status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate wallet status'
      });
    }
  }
];

// Transaction query validation
export const validateTransactionQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['PURCHASE', 'SPEND', 'REFUND', 'TRANSFER'])
    .withMessage('Invalid transaction type'),
  query('status')
    .optional()
    .isIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .withMessage('Invalid transaction status'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid dateFrom format. Use ISO 8601 format.'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid dateTo format. Use ISO 8601 format.'),
  handleValidationErrors
];

// Analytics query validation
export const validateAnalyticsQuery = [
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year', 'all'])
    .withMessage('Invalid period. Must be one of: week, month, quarter, year, all'),
  handleValidationErrors
];

// Payment intent validation
export const validatePaymentIntent = [
  paymentLimiter,
  body('coins')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Coins must be between 1 and 10,000'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'AUD', 'JPY'])
    .withMessage('Invalid currency. Supported currencies: USD, EUR, GBP, AUD, JPY'),
  handleValidationErrors,
  // Additional middleware to check daily/monthly limits
  /*async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { coins } = req.body;
      
      // Calculate LKR amount
      const basePrice = 50;
      const totalLKR = coins * basePrice;
      
      // Check transaction limits
      const limitCheck = await WalletModel.checkTransactionLimits(userId, totalLKR);
      if (!limitCheck.valid) {
        return res.status(400).json({
          success: false,
          message: limitCheck.message,
          limits: {
            dailyRemaining: limitCheck.dailyRemaining || 0,
            monthlyRemaining: limitCheck.monthlyRemaining || 0
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('Error checking transaction limits:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate transaction limits'
      });
    }
  }*/
];

// PIN setup validation
export const validatePinSetup = [
  pinAttemptLimiter,
  ...pinValidationRules,
  body('confirmPin')
    .custom((value, { req }) => {
      if (value !== req.body.pin) {
        throw new Error('PIN confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors,
  // Check if PIN is already set
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const isPinSet = await WalletModel.isPinSet(userId);
      
      if (isPinSet) {
        return res.status(400).json({
          success: false,
          message: 'PIN already set. Use PIN change functionality instead.'
        });
      }
      
      next();
    } catch (error) {
      console.error('Error checking PIN status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate PIN status'
      });
    }
  }
];

// PIN verification validation
export const validatePinVerification = [
  pinAttemptLimiter,
  body('pin')
    .isLength({ min: 6, max: 6 })
    .withMessage('PIN must be exactly 6 digits')
    .isNumeric()
    .withMessage('PIN must contain only numbers'),
  handleValidationErrors,
  // Check wallet status and failed attempts
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const walletInfo = await WalletModel.getWalletPinInfo(userId);
      
      if (!walletInfo) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      if (walletInfo.wallet_status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'Wallet is not active'
        });
      }
      
      if (walletInfo.failed_pin_attempts >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Wallet locked. Contact support.'
        });
      }
      
      if (!walletInfo.pin_hash) {
        return res.status(400).json({
          success: false,
          message: 'PIN not set. Please set a PIN first.'
        });
      }
      
      next();
    } catch (error) {
      console.error('Error validating PIN verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate PIN verification'
      });
    }
  }
];

// PIN change validation
export const validatePinChange = [
  pinAttemptLimiter,
  body('currentPin')
    .isLength({ min: 6, max: 6 })
    .withMessage('Current PIN must be exactly 6 digits')
    .isNumeric()
    .withMessage('Current PIN must contain only numbers'),
  body('newPin')
    .isLength({ min: 6, max: 6 })
    .withMessage('New PIN must be exactly 6 digits')
    .isNumeric()
    .withMessage('New PIN must contain only numbers')
    .custom((value, { req }) => {
      // Check for weak patterns
      const weakPatterns = [
        '000000', '111111', '222222', '333333', '444444', '555555',
        '666666', '777777', '888888', '999999', '123456', '654321',
        '123123', '456456', '789789', '147147', '258258', '369369'
      ];
      
      if (weakPatterns.includes(value)) {
        throw new Error('New PIN is too weak. Please choose a different combination.');
      }
      
      if (value === req.body.currentPin) {
        throw new Error('New PIN must be different from current PIN');
      }
      
      return true;
    }),
  body('confirmNewPin')
    .custom((value, { req }) => {
      if (value !== req.body.newPin) {
        throw new Error('New PIN confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors
];

// Admin user action validation
export const validateAdminUserAction = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  handleValidationErrors,
  // Check if target user exists
  async (req, res, next) => {
    try {
      const { userId } = req.body;
      const wallet = await WalletModel.getWalletByUserId(userId);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Target user wallet not found'
        });
      }
      
      next();
    } catch (error) {
      console.error('Error validating target user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate target user'
      });
    }
  }
];

// Currency conversion validation
export const validateCurrencyConversion = [
  query('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  query('from')
    .isLength({ min: 3, max: 3 })
    .withMessage('From currency must be a 3-letter currency code')
    .isAlpha()
    .withMessage('From currency must contain only letters')
    .toUpperCase(),
  query('to')
    .isLength({ min: 3, max: 3 })
    .withMessage('To currency must be a 3-letter currency code')
    .isAlpha()
    .withMessage('To currency must contain only letters')
    .toUpperCase(),
  handleValidationErrors
];

// Payment status validation
export const validatePaymentStatus = [
  param('paymentIntentId')
    .matches(/^pi_[a-zA-Z0-9]+$/)
    .withMessage('Invalid payment intent ID format'),
  handleValidationErrors
];

// Manual coin addition validation (admin only)
export const validateManualCoinAddition = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  body('coins')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Coins must be between 1 and 100,000'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// Refund validation
export const validateRefund = [
  body('originalTransactionId')
    .isInt({ min: 1 })
    .withMessage('Valid original transaction ID is required'),
  body('refundAmount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Refund amount must be a positive integer'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// Security middleware to check for suspicious activity
export const checkSuspiciousActivity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check for recent failed PIN attempts
    const recentFailedAttempts = await WalletModel.getRecentFailedAttempts(userId, 1); // Last hour
    
    if (recentFailedAttempts >= 5) {
      await WalletModel.logSecurityEvent(userId, 'SUSPICIOUS_ACTIVITY_DETECTED', {
        failed_attempts: recentFailedAttempts,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        endpoint: req.originalUrl
      });
      
      return res.status(429).json({
        success: false,
        message: 'Suspicious activity detected. Please contact support.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    // Don't block the request if security check fails
    next();
  }
};

// Wallet status middleware
export const checkWalletStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const wallet = await WalletModel.getWalletByUserId(userId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (wallet.wallet_status === 'FROZEN') {
      return res.status(403).json({
        success: false,
        message: 'Wallet is frozen. Please contact support.'
      });
    }
    
    if (wallet.wallet_status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Wallet is suspended. Please contact support.'
      });
    }
    
    req.wallet = wallet;
    next();
  } catch (error) {
    console.error('Error checking wallet status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check wallet status',
      error: error.message
    });
  }
};

// Export all validation functions
export default {
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
};