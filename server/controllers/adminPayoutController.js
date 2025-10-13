import pool from '../config/db.js';
import Stripe from 'stripe';
import * as WalletService from '../services/walletService.js';
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
    const { restaurantId, month, year, paymentMethod = 'manual', notes } = req.body;
    const adminId = req.user.id;
    
    if (!restaurantId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID, month, and year are required'
      });
    }
    
    await client.query('BEGIN');
    
    // Get restaurant info with KYC bank details
    const restaurantQuery = await client.query(
      `SELECT 
        rp.restaurant_name as name, 
        u.email,
        kr.bank_account_number,
        kr.bank_name,
        kr.branch
      FROM restaurant_profiles rp
      JOIN users u ON rp.user_id = u.id
      LEFT JOIN kyc_requests kr ON kr.restaurant_id = u.id AND kr.status = 'APPROVED'
      WHERE rp.id = $1`,
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
    
    // Check if KYC is approved and bank details exist for Stripe payouts
    if (paymentMethod === 'stripe' && (!restaurant.bank_account_number || !restaurant.bank_name)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Restaurant KYC not approved or bank details missing. Cannot process Stripe payout.'
      });
    }
    
    // Get earnings for the period
    const earnings = await AdminPayoutModel.getRestaurantPeriodEarnings(restaurantId, month, year);
    
    if (parseInt(earnings.transaction_count) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No pending earnings for this period'
      });
    }
    
    const totalLKR = parseFloat(earnings.total_lkr);
    let payoutResult = null;
    let conversionResult = null;
    
    // Process Stripe payout if method is stripe
    if (paymentMethod === 'stripe') {
      // Convert LKR to USD
      conversionResult = await WalletService.convertCurrency(totalLKR, 'LKR', 'USD');
      
      if (!conversionResult.success) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Currency conversion failed: ${conversionResult.message}`
        });
      }
      
      const amountUSD = conversionResult.convertedAmount;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      try {
        // Create Stripe payout
        payoutResult = await stripe.payouts.create({
          amount: Math.round(amountUSD * 100), // Convert to cents
          currency: 'usd',
          method: 'standard',
          description: `Payout for ${restaurant.name} - ${month}/${year}`,
          metadata: {
            restaurant_id: restaurantId.toString(),
            period_month: month.toString(),
            period_year: year.toString(),
            original_amount_lkr: totalLKR.toString(),
            exchange_rate: conversionResult.rate.toString()
          }
        });
        
        console.log('Stripe payout created:', payoutResult.id);
        
      } catch (stripeError) {
        await client.query('ROLLBACK');
        console.error('Stripe payout error:', stripeError);
        return res.status(400).json({
          success: false,
          message: `Stripe payout failed: ${stripeError.message}`,
          type: 'stripe_error'
        });
      }
    }
    
    // Create payout record with metadata
    const payout = await AdminPayoutModel.createPayout({
      restaurantId,
      month,
      year,
      totalCoins: earnings.total_coins,
      amountLkr: totalLKR,
      bankAccount: restaurant.bank_account_number,
      bankName: restaurant.bank_name,
      proofUrl: payoutResult ? `stripe:${payoutResult.id}` : null,
      processedBy: adminId,
      status: payoutResult ? 'completed' : 'pending',
      notes: notes || `${paymentMethod} payout`,
      metadata: payoutResult ? {
        stripe_payout_id: payoutResult.id,
        amount_usd: payoutResult.amount / 100,
        exchange_rate: conversionResult?.rate,
        payment_method: paymentMethod
      } : { payment_method: paymentMethod }
    }, client);
    
    // Mark earnings as paid
    await RestaurantEarningsModel.markAsPaid(restaurantId, month, year, payout.id, client);
    
    await client.query('COMMIT');
    
    // Send notification email
    sendPayoutNotification(
      { name: restaurant.name, email: restaurant.email },
      {
        amountLKR: totalLKR,
        amountUSD: payoutResult ? payoutResult.amount / 100 : null,
        month,
        year,
        transactionCount: parseInt(earnings.transaction_count),
        bankAccount: restaurant.bank_account_number || 'On file',
        paymentMethod,
        stripePayoutId: payoutResult?.id
      }
    ).catch(err => console.error('Email error:', err));
    
    res.json({
      success: true,
      message: 'Payout processed successfully',
      payout: {
        id: payout.id,
        restaurantName: restaurant.name,
        amountLKR: totalLKR,
        amountUSD: payoutResult ? payoutResult.amount / 100 : null,
        transactionCount: earnings.transaction_count,
        period: `${month}/${year}`,
        paymentMethod,
        stripePayoutId: payoutResult?.id,
        status: payoutResult ? 'completed' : 'pending'
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

// Add these two new functions
export const checkStripePayoutStatus = async (req, res) => {
  try {
    const { stripePayoutId } = req.params;
    
    if (!stripePayoutId) {
      return res.status(400).json({
        success: false,
        message: 'Stripe payout ID is required'
      });
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const payout = await stripe.payouts.retrieve(stripePayoutId);
    
    res.json({
      success: true,
      payout: {
        id: payout.id,
        status: payout.status,
        amount: payout.amount / 100,
        currency: payout.currency.toUpperCase(),
        arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null,
        description: payout.description,
        metadata: payout.metadata
      }
    });
    
  } catch (error) {
    console.error('Error checking Stripe payout status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payout status',
      error: error.message
    });
  }
};

export const getPayoutExchangeRates = async (req, res) => {
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