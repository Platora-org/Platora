import pool from "../config/db.js";
import * as WalletModel from "../models/walletModel.js";
import * as TransactionModel from "../models/transactionModel.js";
import * as WalletService from "../services/walletService.js";
import bcrypt from 'bcrypt';

// Get wallet information
export const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const wallet = await WalletModel.getWalletByUserId(userId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const stats = await WalletModel.getWalletStats(userId);
    
    res.json({
      success: true,
      wallet: {
        ...wallet,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet information'
    });
  }
};

// Get current exchange rates
export const getExchangeRates = async (req, res) => {
  try {
    const ratesResult = await WalletService.getCurrentRates();
    
    if (!ratesResult.success) {
      return res.status(500).json({
        success: false,
        message: ratesResult.message
      });
    }

    res.json({
      success: true,
      rates: ratesResult.rates,
      lastUpdated: ratesResult.lastUpdated,
      source: ratesResult.source
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates'
    });
  }
};

// Update exchange rates
export const updateExchangeRates = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await WalletService.updateExchangeRates();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        rates: result.rates,
        source: result.source,
        lastUpdated: result.lastUpdated
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exchange rates'
    });
  }
};

// Unlock wallet (admin only)
export const unlockWallet = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.body;
    const adminId = req.user.id;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    await client.query('BEGIN');

    const result = await WalletModel.unlockWallet(userId, adminId, client);
    
    if (result) {
      // Log admin action
      await WalletModel.logSecurityEvent(adminId, 'ADMIN_WALLET_UNLOCKED', {
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        ip_address: req.ip
      }, client);

      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Wallet unlocked successfully'
      });
    } else {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error unlocking wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock wallet'
    });
  } finally {
    client.release();
  }
};

// Get PIN security report (admin only)
export const getPinSecurityReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const query = `
      SELECT 
        COUNT(*) as total_wallets,
        COUNT(CASE WHEN pin_hash IS NOT NULL THEN 1 END) as wallets_with_pin,
        COUNT(CASE WHEN failed_pin_attempts >= 3 THEN 1 END) as locked_wallets,
        COUNT(CASE WHEN failed_pin_attempts >= 1 THEN 1 END) as wallets_with_failed_attempts,
        AVG(failed_pin_attempts) as avg_failed_attempts,
        COUNT(CASE WHEN wallet_status = 'FROZEN' THEN 1 END) as frozen_wallets,
        COUNT(CASE WHEN wallet_status = 'ACTIVE' THEN 1 END) as active_wallets
      FROM wallets
    `;
    
    const result = await pool.query(query);
    const stats = result.rows[0];

    // Get recent security events
    const securityEventsQuery = `
      SELECT 
        action,
        COUNT(*) as count
      FROM security_logs 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY action
      ORDER BY count DESC
    `;
    
    const securityEvents = await pool.query(securityEventsQuery);

    res.json({
      success: true,
      securityReport: {
        totalWallets: parseInt(stats.total_wallets),
        walletsWithPin: parseInt(stats.wallets_with_pin),
        lockedWallets: parseInt(stats.locked_wallets),
        frozenWallets: parseInt(stats.frozen_wallets),
        activeWallets: parseInt(stats.active_wallets),
        walletsWithFailedAttempts: parseInt(stats.wallets_with_failed_attempts),
        averageFailedAttempts: parseFloat(stats.avg_failed_attempts || 0).toFixed(2),
        pinAdoptionRate: ((stats.wallets_with_pin / stats.total_wallets) * 100).toFixed(1) + '%',
        recentSecurityEvents: securityEvents.rows
      }
    });

  } catch (error) {
    console.error('Error getting PIN security report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security report'
    });
  }
};

// Process refund
export const processRefund = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { originalTransactionId, refundAmount, reason = 'Customer request' } = req.body;

    if (!originalTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Original transaction ID is required'
      });
    }

    await client.query('BEGIN');

    const refundTransaction = await TransactionModel.processRefund(
      originalTransactionId, 
      userId, 
      reason, 
      refundAmount
    );

    // Log refund event
    await WalletModel.logSecurityEvent(userId, 'REFUND_PROCESSED', {
      originalTransactionId,
      refundAmount: refundAmount || 'full',
      reason
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refundTransaction
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  } finally {
    client.release();
  }
};

// Get wallet security status
export const getSecurityStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const securityMetrics = await WalletModel.checkSuspiciousActivity(userId);
    const recentLogs = await WalletModel.getSecurityLogs(userId, 10);
    const recentFailedAttempts = await WalletModel.getRecentFailedAttempts(userId, 24);

    res.json({
      success: true,
      security: {
        status: securityMetrics?.security_status || 'NORMAL',
        metrics: securityMetrics,
        recentLogs,
        recentFailedAttempts,
        recommendations: generateSecurityRecommendations(securityMetrics, recentFailedAttempts)
      }
    });

  } catch (error) {
    console.error('Error fetching security status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security status'
    });
  }
};

// Helper function to generate security recommendations
const generateSecurityRecommendations = (metrics, failedAttempts) => {
  const recommendations = [];

  if (!metrics?.pin_hash) {
    recommendations.push({
      type: 'warning',
      message: 'Set up a PIN for additional security',
      action: 'setup_pin'
    });
  }

  if (failedAttempts > 2) {
    recommendations.push({
      type: 'alert',
      message: 'Multiple failed PIN attempts detected. Consider changing your PIN.',
      action: 'change_pin'
    });
  }

  if (metrics?.failed_pin_attempts >= 2) {
    recommendations.push({
      type: 'warning',
      message: 'Recent failed PIN attempts. Ensure your PIN is secure.',
      action: 'review_security'
    });
  }

  return recommendations;
};

// Bulk operations for admin
export const bulkWalletOperation = async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { operation, userIds, params = {} } = req.body;
    
    if (!operation || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Operation and user IDs array are required'
      });
    }

    await client.query('BEGIN');

    let results = [];

    switch (operation) {
      case 'freeze':
        results = await WalletModel.bulkUpdateWalletStatus(userIds, 'FROZEN', client);
        break;
      
      case 'unfreeze':
        results = await WalletModel.bulkUpdateWalletStatus(userIds, 'ACTIVE', client);
        break;
      
      case 'reset_pins':
        for (const userId of userIds) {
          await WalletModel.updateWalletPin(userId, null, client);
          await WalletModel.unlockWallet(userId, req.user.id, client);
        }
        results = userIds.map(id => ({ user_id: id, status: 'PIN_RESET' }));
        break;
      
      default:
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Invalid operation'
        });
    }

    // Log bulk operation
    await WalletModel.logSecurityEvent(req.user.id, 'BULK_OPERATION', {
      operation,
      userIds,
      affectedCount: results.length
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      results,
      affectedCount: results.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk wallet operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation'
    });
  } finally {
    client.release();
  }
};

// Get wallet limits
export const getWalletLimits = async (req, res) => {
  try {
    const userId = req.user.id;
    const limits = await WalletModel.getWalletLimits(userId);
    
    if (!limits) {
      return res.status(404).json({
        success: false,
        message: 'Wallet limits not found'
      });
    }

    res.json({
      success: true,
      limits
    });

  } catch (error) {
    console.error('Error fetching wallet limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet limits'
    });
  }
};

// Update wallet limits (admin only)
export const updateWalletLimits = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, dailyLimit, monthlyLimit } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!userId || (!dailyLimit && !monthlyLimit)) {
      return res.status(400).json({
        success: false,
        message: 'User ID and at least one limit value are required'
      });
    }

    await client.query('BEGIN');

    const result = await WalletModel.updateWalletLimits(
      userId, 
      dailyLimit || null, 
      monthlyLimit || null, 
      client
    );

    // Log admin action
    await WalletModel.logSecurityEvent(req.user.id, 'LIMITS_UPDATED', {
      targetUserId: userId,
      dailyLimit,
      monthlyLimit,
      adminId: req.user.id
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Wallet limits updated successfully',
      limits: result
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating wallet limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wallet limits'
    });
  } finally {
    client.release();
  }
};

// Get transaction by ID (for detailed view)
export const getTransactionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const transaction = await TransactionModel.getTransactionById(transactionId, userId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction'
    });
  }
};

// Cancel pending transaction
export const cancelTransaction = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    await client.query('BEGIN');

    const cancelledTransaction = await TransactionModel.cancelTransaction(
      transactionId, 
      userId, 
      reason
    );

    // Log cancellation event
    await WalletModel.logSecurityEvent(userId, 'TRANSACTION_CANCELLED', {
      transactionId,
      reason
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Transaction cancelled successfully',
      transaction: cancelledTransaction
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel transaction'
    });
  } finally {
    client.release();
  }
};

// Get wallet activity summary
export const getWalletActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));
    const dateTo = new Date();

    const summary = await TransactionModel.getTransactionSummary(
      userId, 
      dateFrom.toISOString(), 
      dateTo.toISOString()
    );

    const recentTransactions = await TransactionModel.getTransactionsByUserId(
      userId, 
      10, 
      0, 
      { dateFrom: dateFrom.toISOString() }
    );

    res.json({
      success: true,
      activity: {
        summary,
        recentTransactions: recentTransactions.transactions,
        period: `${days} days`
      }
    });

  } catch (error) {
    console.error('Error fetching wallet activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet activity'
    });
  }
};

// Validate transaction PIN (middleware function that can be used)
export const validateTransactionPin = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN is required for this transaction'
      });
    }

    await client.query('BEGIN');

    const walletPinInfo = await WalletModel.getWalletPinInfo(userId);
    
    if (!walletPinInfo || !walletPinInfo.pin_hash) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'PIN not set. Please set a PIN first.'
      });
    }

    if (walletPinInfo.failed_pin_attempts >= 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Wallet locked.'
      });
    }

    const isPinValid = await bcrypt.compare(pin, walletPinInfo.pin_hash);

    if (isPinValid) {
      await WalletModel.resetFailedPinAttempts(userId, client);
      await client.query('COMMIT');
      req.pinVerified = true;
      next();
    } else {
      await WalletModel.incrementFailedPinAttempts(userId, client);
      await client.query('COMMIT');
      
      return res.status(400).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error validating transaction PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate PIN'
    });
  } finally {
    client.release();
  }
};

// Calculate coin price
export const calculateCoinPrice = async (req, res) => {
  try {
    const { coins, currency = 'LKR' } = req.query;

    if (!coins || coins <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid coin amount is required'
      });
    }

    const basePrice = 50;
    const totalLKR = parseInt(coins) * basePrice;

    if (currency === 'LKR') {
      return res.json({
        success: true,
        coins: parseInt(coins),
        currency: 'LKR',
        amount: totalLKR,
        basePrice
      });
    }

    const conversionResult = await WalletService.convertCurrency(totalLKR, 'LKR', currency);
    
    if (!conversionResult.success) {
      return res.status(400).json({
        success: false,
        message: conversionResult.message
      });
    }

    res.json({
      success: true,
      coins: parseInt(coins),
      currency,
      amount: conversionResult.convertedAmount,
      basePrice,
      exchangeRate: conversionResult.rate,
      baseCurrency: 'LKR',
      baseAmount: totalLKR
    });

  } catch (error) {
    console.error('Error calculating coin price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate coin price'
    });
  }
};

// Get supported currencies
export const getSupportedCurrencies = async (req, res) => {
  try {
    const currencies = WalletService.getSupportedCurrencies();
    
    res.json({
      success: true,
      currencies
    });
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported currencies'
    });
  }
};

// Create payment intent for Stripe
export const createPaymentIntent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { coins, currency = 'USD' } = req.body;

    if (!coins || coins <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid coin amount is required'
      });
    }

    // Check if currency is supported by Stripe
    const supportedCurrencies = WalletService.getSupportedCurrencies();
    if (!supportedCurrencies[currency]?.supported) {
      return res.status(400).json({
        success: false,
        message: `Currency ${currency} is not supported for payments. Please use USD, EUR, GBP, AUD, or JPY.`
      });
    }

    // Calculate amount in selected currency
    const basePrice = 50;
    const totalLKR = coins * basePrice;
    
    const conversionResult = await WalletService.convertCurrency(totalLKR, 'LKR', currency);
    
    if (!conversionResult.success) {
      return res.status(400).json({
        success: false,
        message: `Failed to convert to ${currency}: ${conversionResult.message}`
      });
    }

    const amount = conversionResult.convertedAmount;
    
    // Check transaction limits
    const limitCheck = await WalletModel.checkTransactionLimits(userId, totalLKR);

    if (!limitCheck.valid) {
      return res.status(400).json({
        success: false,
        message: limitCheck.message,
        limits: {
          dailyRemaining: limitCheck.dailyRemaining,
          monthlyRemaining: limitCheck.monthlyRemaining
        }
      });
    }

    // Check wallet status
    const wallet = await WalletModel.getWalletByUserId(userId);
    if (!wallet || wallet.wallet_status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Wallet is not active. Please contact support.'
      });
    }

    await client.query('BEGIN');

    // Get user details for Stripe customer
    const userQuery = `SELECT email, first_name, last_name FROM users WHERE id = $1`;
    const userResult = await client.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Create payment intent via service
    const paymentResult = await WalletService.createPaymentIntent({
      amount: amount,
      currency: currency,
      userId: userId,
      coins: coins,
      customerEmail: user.email,
      description: `Purchase ${coins} coins for ${currency} ${amount.toFixed(2)}`
    });

    if (!paymentResult.success) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        message: paymentResult.message,
        type: paymentResult.type
      });
    }

    // Log payment intent creation
    await WalletModel.logSecurityEvent(userId, 'PAYMENT_INTENT_CREATED', {
      amount,
      currency,
      coins,
      paymentIntentId: paymentResult.paymentIntentId
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      clientSecret: paymentResult.clientSecret,
      paymentIntentId: paymentResult.paymentIntentId,
      amount: paymentResult.amount,
      currency: paymentResult.currency,
      coins,
      exchangeRate: conversionResult.rate,
      baseAmountLKR: totalLKR
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  } finally {
    client.release();
  }
};
// Process successful payment (replaces webhook functionality)
export const processSuccessfulPayment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID is required'
      });
    }

    await client.query('BEGIN');

    const result = await WalletService.processSuccessfulPayment(paymentIntentId, userId, client);

    if (result.success) {
      await client.query('COMMIT');
      res.json({
        success: true,
        message: result.message,
        transaction: result.transaction,
        coinsAdded: result.coinsAdded
      });
    } else {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing successful payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  } finally {
    client.release();
  }
};

// Check payment status (for frontend to poll)
export const checkPaymentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.params;

    const result = await WalletService.checkPaymentStatus(paymentIntentId, userId);

    if (result.success) {
      res.json({
        success: true,
        status: result.status,
        paymentIntent: result.paymentIntent
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
};

// Spend coins
export const spendCoins = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { 
      coins, 
      description, 
      orderId, 
      category = 'Food Orders',
      requirePin = true
    } = req.body;

    if (!coins || coins <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coin amount'
      });
    }

    await client.query('BEGIN');

    // Check wallet status and PIN if required
    const walletInfo = await WalletModel.getWalletPinInfo(userId);
    if (!walletInfo) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (walletInfo.wallet_status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Wallet is not active'
      });
    }

    if (requirePin && walletInfo.pin_hash && !req.pinVerified) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'PIN verification required for this transaction',
        requirePin: true
      });
    }

    const hasSufficient = await WalletModel.hasSufficientBalance(userId, coins);
    if (!hasSufficient) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient coin balance'
      });
    }

    const transactionData = {
      userId,
      transactionType: 'SPEND',
      amountCoins: -coins,
      amountMoney: 0,
      currency: 'LKR',
      description: description || `Purchase - ${category}`,
      referenceId: orderId,
      status: 'COMPLETED',
      paymentMethod: 'coins',
      metadata: {
        category,
        order_id: orderId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    };

    const transaction = await TransactionModel.createTransaction(transactionData, client);
    await WalletModel.updateBalance(userId, -coins, 0, client);

    // Log spending event
    await WalletModel.logSecurityEvent(userId, 'COINS_SPENT', {
      amount: coins,
      category,
      orderId
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully spent ${coins} coins`,
      transaction
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error spending coins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to spend coins',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get transaction history
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      dateFrom, 
      dateTo 
    } = req.query;

    const offset = (page - 1) * limit;
    const filters = {};
    
    if (type) filters.type = type.toUpperCase();
    if (status) filters.status = status.toUpperCase();
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await TransactionModel.getTransactionsByUserId(userId, parseInt(limit), offset, filters);

    res.json({
      success: true,
      ...result,
      page: parseInt(page),
      totalPages: Math.ceil(result.total / limit)
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

// Get spending analytics
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;

    const analytics = await TransactionModel.getSpendingAnalytics(userId, period);
    const trends = await TransactionModel.getMonthlyTrends(userId, 6);
    const categorySpending = await TransactionModel.getCategorySpending(userId, period);

    res.json({
      success: true,
      analytics: {
        spendingByType: analytics,
        monthlyTrends: trends,
        categorySpending
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

// Get refund history
export const getRefunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const refunds = await TransactionModel.getRefundHistory(userId, parseInt(limit), offset);

    res.json({
      success: true,
      refunds,
      page: parseInt(page)
    });

  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refunds'
    });
  }
};

// Add coins manually (for testing - admin only)
export const addCoinsManually = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, coins, reason = 'Manual addition by admin' } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!userId || !coins || coins <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID and coin amount required'
      });
    }

    await client.query('BEGIN');

    const transactionData = {
      userId: parseInt(userId),
      transactionType: 'PURCHASE',
      amountCoins: coins,
      amountMoney: 0,
      currency: 'LKR',
      description: reason,
      referenceId: `manual_${Date.now()}`,
      status: 'COMPLETED',
      paymentMethod: 'manual',
      metadata: {
        payment_method: 'manual',
        admin_id: req.user.id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    };

    const transaction = await TransactionModel.createTransaction(transactionData, client);
    await WalletModel.updateBalance(parseInt(userId), coins, 0, client);

    // Log admin action
    await WalletModel.logSecurityEvent(req.user.id, 'ADMIN_COINS_ADDED', {
      targetUserId: userId,
      amount: coins,
      reason
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully added ${coins} coins to user ${userId}`,
      transaction
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding coins manually:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add coins',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Currency converter endpoint
export const convertCurrency = async (req, res) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Amount, from currency, and to currency are required'
      });
    }

    const conversionResult = await WalletService.convertCurrency(
      parseFloat(amount), 
      from.toUpperCase(), 
      to.toUpperCase()
    );

    if (!conversionResult.success) {
      return res.status(400).json({
        success: false,
        message: conversionResult.message
      });
    }

    res.json({
      success: true,
      originalAmount: parseFloat(amount),
      fromCurrency: from.toUpperCase(),
      toCurrency: to.toUpperCase(),
      convertedAmount: conversionResult.convertedAmount,
      exchangeRate: conversionResult.rate
    });

  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency'
    });
  }
};

// PIN MANAGEMENT FUNCTIONS

// Set wallet PIN
export const setWalletPin = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { pin, confirmPin } = req.body;

    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: 'PIN confirmation does not match'
      });
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 6 digits'
      });
    }

    await client.query('BEGIN');

    // Check if user already has a PIN
    const existingPinStatus = await WalletModel.isPinSet(userId);
    if (existingPinStatus) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'PIN already set. Use PIN change functionality instead.'
      });
    }

    // Hash the PIN with higher salt rounds for security
    const pinHash = await bcrypt.hash(pin, 14);

    // Update wallet with PIN
    const result = await WalletModel.updateWalletPin(userId, pinHash, client);
    
    if (result) {
      // Log PIN setup
      await WalletModel.logSecurityEvent(userId, 'PIN_SET', {
        timestamp: new Date().toISOString()
      }, client);

      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'PIN set successfully'
      });
    } else {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting wallet PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set PIN'
    });
  } finally {
    client.release();
  }
};

// Verify wallet PIN
export const verifyWalletPin = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    if (!pin || pin.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid 6-digit PIN required'
      });
    }

    await client.query('BEGIN');

    // Get wallet PIN information using model
    const walletPinInfo = await WalletModel.getWalletPinInfo(userId);
    
    if (!walletPinInfo) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (walletPinInfo.wallet_status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Wallet is not active'
      });
    }

    if (walletPinInfo.failed_pin_attempts >= 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Wallet locked. Contact support.'
      });
    }

    if (!walletPinInfo.pin_hash) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'PIN not set. Please set a PIN first.'
      });
    }

    // Verify PIN with bcrypt
    const isPinValid = await bcrypt.compare(pin, walletPinInfo.pin_hash);

    if (isPinValid) {
      // Reset failed attempts on success
      await WalletModel.resetFailedPinAttempts(userId, client);

      // Log successful PIN verification
      await WalletModel.logSecurityEvent(userId, 'PIN_VERIFIED', {
        timestamp: new Date().toISOString(),
        ip_address: req.ip
      }, client);

      await client.query('COMMIT');

      // Set PIN verification flag in request for subsequent operations
      req.pinVerified = true;

      res.json({
        success: true,
        message: 'PIN verified successfully'
      });
    } else {
      // Increment failed attempts
      const updatedAttempts = await WalletModel.incrementFailedPinAttempts(userId, client);
      
      // Log failed PIN attempt
      await WalletModel.logSecurityEvent(userId, 'PIN_FAILED', {
        attempts: updatedAttempts.failed_pin_attempts,
        ip_address: req.ip
      }, client);

      // Lock wallet if too many attempts
      if (updatedAttempts.failed_pin_attempts >= 3) {
        await WalletModel.lockWallet(userId, 'Too many failed PIN attempts', client);
        
        await client.query('COMMIT');
        
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Wallet has been locked for security.'
        });
      }

      await client.query('COMMIT');

      res.status(400).json({
        success: false,
        message: `Invalid PIN. ${3 - updatedAttempts.failed_pin_attempts} attempts remaining.`
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error verifying wallet PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify PIN'
    });
  } finally {
    client.release();
  }
};

// Check if PIN is set
export const checkPinStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('User role:', req.user.role);
    console.log('User ID:', userId);

    // Get comprehensive PIN status using model
    const walletPinInfo = await WalletModel.getWalletPinInfo(userId);
    
    if (!walletPinInfo) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const pinSet = !!walletPinInfo.pin_hash;
    const isLocked = walletPinInfo.failed_pin_attempts >= 3;
    const suspiciousActivity = await WalletModel.checkSuspiciousActivity(userId);

    res.json({
      success: true,
      hasPin: pinSet,
      isLocked,
      walletStatus: walletPinInfo.wallet_status,
      failedAttempts: walletPinInfo.failed_pin_attempts,
      lastAttempt: walletPinInfo.last_pin_attempt,
      securityStatus: suspiciousActivity?.security_status || 'NORMAL'
    });

  } catch (error) {
    console.error('Error checking PIN status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check PIN status'
    });
  }
};

// Change existing PIN (requires current PIN verification)
export const changeWalletPin = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { currentPin, newPin, confirmNewPin } = req.body;

    if (!currentPin || !newPin || !confirmNewPin) {
      return res.status(400).json({
        success: false,
        message: 'Current PIN, new PIN, and confirmation are required'
      });
    }

    if (newPin !== confirmNewPin) {
      return res.status(400).json({
        success: false,
        message: 'New PIN confirmation does not match'
      });
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: 'New PIN must be exactly 6 digits'
      });
    }

    if (currentPin === newPin) {
      return res.status(400).json({
        success: false,
        message: 'New PIN must be different from current PIN'
      });
    }

    await client.query('BEGIN');

    // Verify current PIN first
    const walletPinInfo = await WalletModel.getWalletPinInfo(userId);
    
    if (!walletPinInfo || !walletPinInfo.pin_hash) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No existing PIN found'
      });
    }

    const isCurrentPinValid = await bcrypt.compare(currentPin, walletPinInfo.pin_hash);
    
    if (!isCurrentPinValid) {
      await WalletModel.incrementFailedPinAttempts(userId, client);
      
      await WalletModel.logSecurityEvent(userId, 'PIN_CHANGE_FAILED', {
        reason: 'Invalid current PIN',
        ip_address: req.ip
      }, client);

      await client.query('COMMIT');
      
      return res.status(400).json({
        success: false,
        message: 'Current PIN is incorrect'
      });
    }

    // Hash new PIN
    const newPinHash = await bcrypt.hash(newPin, 14);

    // Update with new PIN
    const result = await WalletModel.updateWalletPin(userId, newPinHash, client);
    
    if (result) {
      // Log PIN change
      await WalletModel.logSecurityEvent(userId, 'PIN_CHANGED', {
        timestamp: new Date().toISOString(),
        ip_address: req.ip
      }, client);

      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'PIN changed successfully'
      });
    } else {
      await client.query('ROLLBACK');
      res.status(500).json({
        success: false,
        message: 'Failed to update PIN'
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error changing wallet PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change PIN'
    });
  } finally {
    client.release();
  }
};

// Reset PIN (admin only)
export const resetWalletPin = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.body;
    const adminId = req.user.id;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    await client.query('BEGIN');

    // Reset PIN and unlock wallet using model functions
    await WalletModel.updateWalletPin(userId, null, client);
    await WalletModel.unlockWallet(userId, adminId, client);

    // Log admin action
    await WalletModel.logSecurityEvent(adminId, 'ADMIN_PIN_RESET', {
      targetUserId: userId,
      timestamp: new Date().toISOString(),
      ip_address: req.ip
    }, client);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'PIN reset successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resetting PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset PIN'
    });
  } finally {
    client.release();
  }
};