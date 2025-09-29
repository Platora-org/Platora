import pool from '../config/db.js';
import * as AdminPayoutModel from '../models/adminPayoutModel.js';
import * as RestaurantEarningsModel from '../models/restaurantEarningsModel.js';
import { sendPayoutNotification } from '../services/emailService.js';

// Get all pending payouts
export const getAdminPendingPayouts = async (req, res) => {
  try {
    const pendingPayouts = await AdminPayoutModel.getAllPendingPayouts();
    
    res.json({
      success: true,
      payouts: pendingPayouts,
      summary: {
        totalRestaurants: pendingPayouts.length,
        totalPendingCoins: pendingPayouts.reduce((sum, p) => sum + parseInt(p.total_earnings || 0), 0),
        totalPendingLKR: pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount_lkr || 0), 0)
      }
    });
    
  } catch (error) {
    console.error('Error getting pending payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending payouts',
      error: error.message
    });
  }
};

// Process payout for a restaurant
export const processRestaurantPayout = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { restaurantId, month, year, bankDetails, proofUrl, notes } = req.body;
    const adminId = req.user.id;
    
    if (!restaurantId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID, month, and year are required'
      });
    }
    
    await client.query('BEGIN');
    
    // Get restaurant info
    const restaurantQuery = await client.query(
      'SELECT name, email FROM restaurant_profiles WHERE id = $1',
      [restaurantId]
    );
    
    if (restaurantQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    const restaurant = restaurantQuery.rows[0];
    
    // Get earnings for the period
    const earnings = await AdminPayoutModel.getRestaurantPeriodEarnings(restaurantId, month, year);
    
    if (parseInt(earnings.transaction_count) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No pending earnings for this period'
      });
    }
    
    // Create payout record
    const payout = await AdminPayoutModel.createPayout({
      restaurantId,
      month,
      year,
      totalCoins: earnings.total_coins,
      amountLkr: earnings.total_lkr,
      bankAccount: bankDetails?.accountNumber,
      bankName: bankDetails?.bankName,
      proofUrl,
      processedBy: adminId,
      status: 'completed',
      notes
    }, client);
    
    // Mark earnings as paid
    await RestaurantEarningsModel.markAsPaid(restaurantId, month, year, payout.id, client);
    
    await client.query('COMMIT');
    
    // Send notification email
    sendPayoutNotification(
      { name: restaurant.name, email: restaurant.email },
      {
        amountLKR: parseFloat(earnings.total_lkr),
        month,
        year,
        transactionCount: parseInt(earnings.transaction_count),
        bankAccount: bankDetails?.accountNumber || 'On file'
      }
    ).catch(err => console.error('Email error:', err));
    
    res.json({
      success: true,
      message: 'Payout processed successfully',
      payout: {
        id: payout.id,
        restaurantName: restaurant.name,
        amount: earnings.total_lkr,
        transactionCount: earnings.transaction_count,
        period: `${month}/${year}`
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payout',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get payout history
export const getPayoutHistory = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate, status } = req.query;
    
    const payouts = await AdminPayoutModel.getPayoutHistory({
      restaurantId,
      startDate,
      endDate,
      status
    });
    
    res.json({
      success: true,
      payouts
    });
    
  } catch (error) {
    console.error('Error getting payout history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payout history',
      error: error.message
    });
  }
};

// Get platform revenue analytics
export const getPlatformRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(new Date().setDate(1)).toISOString();
    const end = endDate || new Date().toISOString();
    
    const revenue = await AdminPayoutModel.getPlatformRevenueStats(start, end);
    
    res.json({
      success: true,
      period: { start, end },
      revenue
    });
    
  } catch (error) {
    console.error('Error getting platform revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform revenue',
      error: error.message
    });
  }
};