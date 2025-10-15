import pool from "../config/db.js";
import { refundModel, getTransactionsForRestaurantOrder, getTransactionForReservation } from '../models/refundModel.js';
import { createTransaction } from '../models/transactionModel.js';
import { updateBalance, logSecurityEvent, getWalletByUserId } from '../models/walletModel.js';
import * as RestaurantEarningsModel from '../models/restaurantEarningsModel.js';

// Process Order Refund (Restaurant Rejection Only)
const processOrderRefund = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { restaurantOrderId, reason } = req.body;

    if (!restaurantOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant Order ID is required'
      });
    }

    await client.query('BEGIN');

    // Check if refund already exists
    const refundExists = await refundModel.refundExistsForOrder(restaurantOrderId);
    if (refundExists) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Refund already processed for this order'
      });
    }

    // Get restaurant order details
    const orderDetails = await refundModel.getRestaurantOrderDetails(restaurantOrderId);
    if (!orderDetails) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Restaurant order not found'
      });
    }

    // Get all transactions for this restaurant order (by reference_id)
    const transactions = await getTransactionsForRestaurantOrder(restaurantOrderId);
    
    if (transactions.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No transactions found for this order. Order may not have been paid yet.'
      });
    }

    const userId = orderDetails.user_id;
    const restaurantId = orderDetails.restaurant_id;
    let totalRefundAmount = 0;
    const refundIds = [];

    // Process refund for each transaction
    for (const transaction of transactions) {
      const refundAmount = Math.abs(transaction.amount_coins);
      totalRefundAmount += refundAmount;

      const commissionCoins = transaction.metadata?.commission_coins || 0;
      const restaurantCoins = transaction.metadata?.restaurant_coins || 0;

      // Create refund record for each transaction
      const refund = await refundModel.createRefund({
        userId,
        transactionId: transaction.id,
        orderId: restaurantOrderId,
        refundAmountCoins: refundAmount,
        refundReason: reason || 'Restaurant rejected the order',
        refundType: 'ORDER_REJECT',
        restaurantId,
        status: 'PENDING',
        metadata: {
          original_amount: refundAmount,
          commission_reversed: commissionCoins,
          restaurant_amount_reversed: restaurantCoins,
          original_reference: transaction.metadata?.original_menu_item_id || transaction.reference_id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      }, client);

      refundIds.push(refund.id);

      // Create refund transaction (credit back to user)
      const refundTransactionData = {
        userId,
        transactionType: 'REFUND',
        amountCoins: refundAmount,
        amountMoney: 0,
        currency: 'LKR',
        description: `Refund for Order #${restaurantOrderId} - ${reason || 'Restaurant rejected'}`,
        referenceId: String(restaurantOrderId),
        status: 'COMPLETED',
        paymentMethod: 'coins_refund',
        metadata: {
          refund_id: refund.id,
          original_transaction_id: transaction.id,
          refund_type: 'ORDER_REJECT',
          restaurant_order_id: restaurantOrderId,
          restaurant_id: restaurantId
        }
      };

      await createTransaction(refundTransactionData, client);

      // Reverse restaurant earnings for this transaction
      if (restaurantId && (commissionCoins > 0 || restaurantCoins > 0)) {
        await RestaurantEarningsModel.createEarning({
          restaurantId,
          transactionId: transaction.id,
          orderId: restaurantOrderId,
          grossCoins: -restaurantCoins,
          commissionCoins: -commissionCoins,
          netCoins: -restaurantCoins
        }, client);
      }

      // Update refund status to completed
      await refundModel.updateRefundStatus(refund.id, 'COMPLETED', client);
    }

    // Credit total coins back to user wallet (single update)
    await updateBalance(userId, totalRefundAmount, 0, client);

    // Log security event
    await logSecurityEvent(userId, 'REFUND_PROCESSED', {
      refund_ids: refundIds,
      total_amount: totalRefundAmount,
      restaurant_order_id: restaurantOrderId,
      refund_type: 'ORDER_REJECT',
      transaction_count: transactions.length
    }, client);

    await client.query('COMMIT');

    // Get updated wallet balance
    const wallet = await getWalletByUserId(userId);

    res.json({
      success: true,
      message: `Successfully refunded ${totalRefundAmount} coins for ${transactions.length} item${transactions.length > 1 ? 's' : ''}`,
      refund: {
        ids: refundIds,
        total_amount: totalRefundAmount,
        items_refunded: transactions.length,
        new_balance: wallet.balance_coins
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing order refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Process Reservation Refund (Based on time before reservation)
export const processReservationRefund = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { reservationId, reservationDateTime } = req.body;

    if (!reservationId || !reservationDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Reservation ID and datetime are required'
      });
    }

    await client.query('BEGIN');

    // Check if refund already exists
    const refundExists = await refundModel.refundExistsForReservation(reservationId);
    if (refundExists) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Refund already processed for this reservation'
      });
    }

    // Get transaction for this reservation (by reference_id)
    const transaction = await getTransactionForReservation(reservationId);
    
    if (!transaction) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Transaction not found for this reservation. Reservation may not have been paid yet.'
      });
    }

    // Validate reservation belongs to user
    if (transaction.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to refund this reservation'
      });
    }

    // Calculate hours until reservation
    const now = new Date();
    const reservationDate = new Date(reservationDateTime);
    const hoursUntilReservation = (reservationDate - now) / (1000 * 60 * 60);

    // Validate refund eligibility based on cancellation policy
    if (hoursUntilReservation < 24) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Refund not available. Cancellation must be at least 24 hours before reservation.',
        hours_remaining: Math.floor(hoursUntilReservation * 10) / 10
      });
    }

    // Full refund for ≥24 hours
    const refundAmount = Math.abs(transaction.amount_coins);
    const restaurantId = transaction.metadata?.restaurant_id;
    const commissionCoins = transaction.metadata?.commission_coins || 0;
    const restaurantCoins = transaction.metadata?.restaurant_coins || 0;

    // Create refund record
    const refund = await refundModel.createRefund({
      userId,
      transactionId: transaction.id,
      reservationId,
      refundAmountCoins: refundAmount,
      refundReason: `Reservation cancelled ${Math.floor(hoursUntilReservation)} hours in advance`,
      refundType: 'RESERVATION_CANCEL',
      restaurantId,
      status: 'PENDING',
      metadata: {
        original_amount: refundAmount,
        hours_before_reservation: hoursUntilReservation,
        commission_reversed: commissionCoins,
        restaurant_amount_reversed: restaurantCoins,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    }, client);

    // Create refund transaction
    const refundTransactionData = {
      userId,
      transactionType: 'REFUND',
      amountCoins: refundAmount,
      amountMoney: 0,
      currency: 'LKR',
      description: `Refund for Reservation #${reservationId} - Cancelled in advance`,
      referenceId: String(reservationId),
      status: 'COMPLETED',
      paymentMethod: 'coins_refund',
      metadata: {
        refund_id: refund.id,
        original_transaction_id: transaction.id,
        refund_type: 'RESERVATION_CANCEL',
        reservation_id: reservationId,
        restaurant_id: restaurantId
      }
    };

    await createTransaction(refundTransactionData, client);

    // Credit coins back to user
    await updateBalance(userId, refundAmount, 0, client);

    // Reverse restaurant earnings (if applicable)
    if (restaurantId && (commissionCoins > 0 || restaurantCoins > 0)) {
      await RestaurantEarningsModel.createEarning({
        restaurantId,
        transactionId: transaction.id,
        reservationId,
        grossCoins: -restaurantCoins,
        commissionCoins: -commissionCoins,
        netCoins: -restaurantCoins
      }, client);
    }

    // Update refund status
    await refundModel.updateRefundStatus(refund.id, 'COMPLETED', client);

    // Log security event
    await logSecurityEvent(userId, 'REFUND_PROCESSED', {
      refund_id: refund.id,
      amount: refundAmount,
      reservation_id: reservationId,
      refund_type: 'RESERVATION_CANCEL',
      hours_before: hoursUntilReservation
    }, client);

    await client.query('COMMIT');

    // Get updated wallet balance
    const wallet = await getWalletByUserId(userId);

    res.json({
      success: true,
      message: `Successfully refunded ${refundAmount} coins`,
      refund: {
        id: refund.id,
        amount: refundAmount,
        new_balance: wallet.balance_coins
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing reservation refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get user refund history
export const getUserRefunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const refunds = await refundModel.getUserRefunds(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    // Get total count for pagination
    const countQuery = await pool.query(
      'SELECT COUNT(*) FROM refunds WHERE user_id = $1',
      [userId]
    );
    const totalCount = parseInt(countQuery.rows[0].count);

    res.json({
      success: true,
      refunds,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + refunds.length) < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching user refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refunds',
      error: error.message
    });
  }
};

// Get refund details by ID
export const getRefundById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { refundId } = req.params;

    const refund = await refundModel.getRefundById(refundId);
    
    if (!refund) {
      return res.status(404).json({
        success: false,
        message: 'Refund not found'
      });
    }

    if (refund.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    res.json({
      success: true,
      refund
    });

  } catch (error) {
    console.error('Error fetching refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refund',
      error: error.message
    });
  }
};

// Get user refund statistics
export const getUserRefundStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await refundModel.getUserRefundStats(userId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching refund stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refund statistics',
      error: error.message
    });
  }
};

export default processOrderRefund;