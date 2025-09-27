import pool from "../config/db.js";
import Stripe from 'stripe';
import * as TransactionModel from '../models/transactionModel.js';
import * as WalletModel from '../models/walletModel.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Supported currencies configuration
const SUPPORTED_CURRENCIES = {
  'LKR': { name: 'Sri Lankan Rupee', symbol: '₨', supported: false },
  'USD': { name: 'US Dollar', symbol: '$', supported: true },
  'EUR': { name: 'Euro', symbol: '€', supported: true },
  'GBP': { name: 'British Pound', symbol: '£', supported: true },
  'AUD': { name: 'Australian Dollar', symbol: 'A$', supported: true },
  'JPY': { name: 'Japanese Yen', symbol: '¥', supported: true }
};

// Get supported currencies
export const getSupportedCurrencies = () => {
  return SUPPORTED_CURRENCIES;
};

// Get current exchange rates
export const getCurrentRates = async () => {
  try {
    const query = `
      SELECT base_currency, target_currency, rate, source, valid_from
      FROM exchange_rates 
      WHERE valid_until IS NULL OR valid_until > NOW()
      ORDER BY valid_from DESC
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'No exchange rates found'
      };
    }
    
    const rates = {};
    let lastUpdated = null;
    let source = 'manual';
    
    result.rows.forEach(row => {
      const key = `${row.base_currency}_${row.target_currency}`;
      rates[key] = parseFloat(row.rate);
      
      if (!lastUpdated || new Date(row.valid_from) > new Date(lastUpdated)) {
        lastUpdated = row.valid_from;
        source = row.source;
      }
    });
    
    return {
      success: true,
      rates,
      lastUpdated,
      source
    };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return {
      success: false,
      message: 'Failed to fetch exchange rates'
    };
  }
};

// Update exchange rates using Alpha Vantage API
export const updateExchangeRates = async () => {
  try {
    const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    
    if (!API_KEY) {
      console.warn('Alpha Vantage API key not configured, using fallback rates');
      return await updateWithFallbackRates();
    }

    const baseCurrency = 'LKR';
    const targetCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'JPY'];
    const newRates = [];

    // Get exchange rates for each currency pair
    for (const targetCurrency of targetCurrencies) {
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${baseCurrency}&to_currency=${targetCurrency}&apikey=${API_KEY}`
        );
        
        const data = await response.json();
        
        if (data['Error Message']) {
          console.error(`Alpha Vantage error for ${baseCurrency}/${targetCurrency}:`, data['Error Message']);
          continue;
        }

        if (data['Note']) {
          console.warn('Alpha Vantage API limit reached:', data['Note']);
          break;
        }

        const exchangeRateData = data['Realtime Currency Exchange Rate'];
        
        if (exchangeRateData) {
          const rate = parseFloat(exchangeRateData['5. Exchange Rate']);
          
          newRates.push({
            base: baseCurrency,
            target: targetCurrency,
            rate: rate
          });
        }
        
        // Add delay to respect API rate limits (5 calls per minute)
        if (targetCurrency !== targetCurrencies[targetCurrencies.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
        
      } catch (error) {
        console.error(`Error fetching ${baseCurrency}/${targetCurrency}:`, error);
        continue;
      }
    }

    if (newRates.length === 0) {
      return await updateWithFallbackRates();
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Mark old rates as expired
      await client.query(`
        UPDATE exchange_rates 
        SET valid_until = NOW() 
        WHERE valid_until IS NULL
      `);
      
      // Insert new rates from Alpha Vantage
      for (const rateData of newRates) {
        await client.query(`
          INSERT INTO exchange_rates (
            base_currency, target_currency, rate, source, valid_from
          )
          VALUES ($1, $2, $3, $4, NOW())
        `, [rateData.base, rateData.target, rateData.rate, 'alpha_vantage']);
      }
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: `Exchange rates updated from Alpha Vantage API (${newRates.length} rates)`,
        rates: newRates,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating exchange rates from Alpha Vantage:', error);
    return await updateWithFallbackRates();
  }
};

// Fallback function for manual rates
const updateWithFallbackRates = async () => {
  try {
    const fallbackRates = [
      { base: 'LKR', target: 'USD', rate: 0.0031 },
      { base: 'LKR', target: 'EUR', rate: 0.0028 },
      { base: 'LKR', target: 'GBP', rate: 0.0024 },
      { base: 'LKR', target: 'AUD', rate: 0.0047 },
      { base: 'LKR', target: 'JPY', rate: 0.46 }
    ];
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Mark old rates as expired
      await client.query(`
        UPDATE exchange_rates 
        SET valid_until = NOW() 
        WHERE valid_until IS NULL
      `);
      
      // Insert fallback rates
      for (const rate of fallbackRates) {
        await client.query(`
          INSERT INTO exchange_rates (base_currency, target_currency, rate, source, valid_from)
          VALUES ($1, $2, $3, 'fallback_manual', NOW())
        `, [rate.base, rate.target, rate.rate]);
      }
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Using fallback exchange rates (API unavailable)',
        rates: fallbackRates,
        source: 'fallback_manual',
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to update exchange rates',
      error: error.message
    };
  }
};

// Convert currency
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    if (fromCurrency === toCurrency) {
      return {
        success: true,
        convertedAmount: amount,
        rate: 1.0
      };
    }
    
    // Get exchange rate
    const query = `
      SELECT rate FROM exchange_rates 
      WHERE base_currency = $1 AND target_currency = $2
        AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY valid_from DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [fromCurrency, toCurrency]);
    
    if (result.rows.length === 0) {
      return {
        success: false,
        message: `Exchange rate not found for ${fromCurrency} to ${toCurrency}`
      };
    }
    
    const rate = parseFloat(result.rows[0].rate);
    const convertedAmount = amount * rate;
    
    return {
      success: true,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      rate
    };
    
  } catch (error) {
    console.error('Error converting currency:', error);
    return {
      success: false,
      message: 'Currency conversion failed'
    };
  }
};

// Create Stripe payment intent
export const createPaymentIntent = async ({
  amount,
  currency,
  userId,
  coins,
  customerEmail,
  description
}) => {
  try {
    // Convert amount to smallest currency unit
    const amountInCents = Math.round(amount * 100);
    
    // Get or create Stripe customer
    let customerId = await getOrCreateStripeCustomer(userId, customerEmail);
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      customer: customerId,
      description,
      metadata: {
        userId: userId.toString(),
        coins: coins.toString(),
        baseCurrency: 'LKR'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    // Store payment intent in database
    await pool.query(`
      INSERT INTO payment_intents (
        user_id, stripe_payment_intent_id, amount_coins, amount_money, 
        currency, status, client_secret, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      userId,
      paymentIntent.id,
      coins,
      amount,
      currency,
      paymentIntent.status,
      paymentIntent.client_secret,
      JSON.stringify({
        description,
        created_at: new Date().toISOString()
      })
    ]);
    
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: currency
    };
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    if (error.type === 'StripeCardError') {
      return {
        success: false,
        message: 'Payment failed. Please check your card details.',
        type: 'card_error'
      };
    }
    
    return {
      success: false,
      message: 'Failed to create payment intent',
      type: 'api_error'
    };
  }
};

// Get or create Stripe customer
const getOrCreateStripeCustomer = async (userId, email) => {
  try {
    // Check if customer already exists in database
    const existingCustomer = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1 AND stripe_customer_id IS NOT NULL',
      [userId]
    );

    if (existingCustomer.rows.length > 0) {
      return existingCustomer.rows[0].stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        userId: userId.toString()
      }
    });

    // Save customer ID to database
    await pool.query(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
      [customer.id, userId]
    );

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

// Process successful payment
export const processSuccessfulPayment = async (paymentIntentId, userId, client = null) => {
  const queryClient = client || pool;
  
  try {
    console.log('=== PROCESS SUCCESSFUL PAYMENT START ===');
    console.log('Payment Intent ID:', paymentIntentId);
    console.log('User ID:', userId);
    
    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('Stripe Payment Status:', paymentIntent.status);
    
    if (paymentIntent.status !== 'succeeded') {
      console.log('Payment not succeeded yet, current status:', paymentIntent.status);
      return {
        success: false,
        message: `Payment has not succeeded yet. Current status: ${paymentIntent.status}`
      };
    }
    
    // Check if already processed
    console.log('Checking for existing transaction...');
    const existingTransaction = await TransactionModel.getTransactionByStripePaymentIntent(paymentIntentId);
    if (existingTransaction) {
      console.log('Transaction already exists:', existingTransaction.id);
      return {
        success: false,
        message: 'Payment already processed'
      };
    }
    
    // Get payment intent from database
    console.log('Fetching payment intent from database...');
    const paymentIntentQuery = await queryClient.query(
      'SELECT * FROM payment_intents WHERE stripe_payment_intent_id = $1 AND user_id = $2',
      [paymentIntentId, userId]
    );
    
    if (paymentIntentQuery.rows.length === 0) {
      console.log('Payment intent not found in database');
      return {
        success: false,
        message: 'Payment intent not found in database'
      };
    }
    
    const dbPaymentIntent = paymentIntentQuery.rows[0];
    const coins = dbPaymentIntent.amount_coins;
    const amountMoney = dbPaymentIntent.amount_money;
    
    console.log('Creating transaction for', coins, 'coins, amount:', amountMoney);
    
    // Create transaction record
    const transactionData = {
      userId,
      transactionType: 'PURCHASE',
      amountCoins: coins,
      amountMoney: amountMoney,
      currency: dbPaymentIntent.currency,
      description: `Purchased ${coins} coins via Stripe`,
      referenceId: paymentIntentId,
      status: 'COMPLETED',
      stripePaymentIntentId: paymentIntentId,
      paymentMethod: 'stripe',
      metadata: {
        payment_method: 'stripe',
        stripe_customer_id: paymentIntent.customer,
        payment_intent_id: paymentIntentId
      }
    };
    
    console.log('Creating transaction...');
    const transaction = await TransactionModel.createTransaction(transactionData, queryClient);
    console.log('Transaction created:', transaction.id);
    
    // Update wallet balance
    console.log('Updating wallet balance...');
    await WalletModel.updateBalance(userId, coins, 0, queryClient);
    console.log('Wallet balance updated');
    
    // Update payment intent status
    console.log('Updating payment intent status...');
    await queryClient.query(
      'UPDATE payment_intents SET status = $1, processed_at = NOW() WHERE stripe_payment_intent_id = $2',
      ['succeeded', paymentIntentId]
    );
    console.log('Payment intent status updated');
    
    console.log('=== PROCESS SUCCESSFUL PAYMENT COMPLETE ===');
    
    return {
      success: true,
      message: 'Payment processed successfully',
      transaction,
      coinsAdded: coins
    };
    
  } catch (error) {
    console.error('=== PROCESS SUCCESSFUL PAYMENT ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('==========================================');
    
    return {
      success: false,
      message: `Failed to process payment: ${error.message}`
    };
  }
};

// Check payment status
export const checkPaymentStatus = async (paymentIntentId, userId) => {
  try {
    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Verify ownership
    const dbCheck = await pool.query(
      'SELECT user_id FROM payment_intents WHERE stripe_payment_intent_id = $1',
      [paymentIntentId]
    );
    
    if (dbCheck.rows.length === 0 || dbCheck.rows[0].user_id !== userId) {
      return {
        success: false,
        message: 'Payment intent not found or access denied'
      };
    }
    
    return {
      success: true,
      status: paymentIntent.status,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata
      }
    };
    
  } catch (error) {
    console.error('Error checking payment status:', error);
    return {
      success: false,
      message: 'Failed to check payment status'
    };
  }
};

// Webhook handler for Stripe events (optional - for backup processing)
export const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const userId = parseInt(paymentIntent.metadata.userId);
        
        if (userId) {
          await processSuccessfulPayment(paymentIntent.id, userId);
        }
        break;
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error handling webhook:', error);
    return { success: false, error: error.message };
  }
};

// Get payment history for user
export const getPaymentHistory = async (userId, limit = 20, offset = 0) => {
  try {
    const query = `
      SELECT 
        pi.*,
        t.description as transaction_description,
        t.created_at as transaction_date
      FROM payment_intents pi
      LEFT JOIN transactions t ON pi.stripe_payment_intent_id = t.stripe_payment_intent_id
      WHERE pi.user_id = $1
      ORDER BY pi.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_intents
      WHERE user_id = $1
    `;
    
    const countResult = await pool.query(countQuery, [userId]);
    
    return {
      success: true,
      payments: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    };
    
  } catch (error) {
    console.error('Error getting payment history:', error);
    return {
      success: false,
      message: 'Failed to get payment history'
    };
  }
};

// Calculate transaction fees (if applicable)
export const calculateTransactionFee = (amount, currency = 'USD') => {
  const stripeFeePercentage = 0.029;
  const stripeFixedFee = currency === 'USD' ? 0.30 : 0.25;
  
  const percentageFee = amount * stripeFeePercentage;
  const totalFee = percentageFee + stripeFixedFee;
  
  return {
    percentageFee: Math.round(percentageFee * 100) / 100,
    fixedFee: stripeFixedFee,
    totalFee: Math.round(totalFee * 100) / 100,
    netAmount: Math.round((amount - totalFee) * 100) / 100
  };
};

// Refund payment via Stripe
export const refundStripePayment = async (paymentIntentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
      reason
    };
    
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }
    
    const refund = await stripe.refunds.create(refundData);
    
    return {
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      }
    };
    
  } catch (error) {
    console.error('Error processing Stripe refund:', error);
    return {
      success: false,
      message: 'Failed to process refund',
      error: error.message
    };
  }
};

// Get Stripe customer details
export const getStripeCustomer = async (userId) => {
  try {
    const userQuery = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (!userQuery.rows[0]?.stripe_customer_id) {
      return {
        success: false,
        message: 'No Stripe customer found'
      };
    }
    
    const customer = await stripe.customers.retrieve(userQuery.rows[0].stripe_customer_id);
    
    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        created: customer.created,
        metadata: customer.metadata
      }
    };
    
  } catch (error) {
    console.error('Error getting Stripe customer:', error);
    return {
      success: false,
      message: 'Failed to get customer details'
    };
  }
};

// Update Stripe customer
export const updateStripeCustomer = async (userId, updateData) => {
  try {
    const userQuery = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (!userQuery.rows[0]?.stripe_customer_id) {
      return {
        success: false,
        message: 'No Stripe customer found'
      };
    }
    
    const customer = await stripe.customers.update(
      userQuery.rows[0].stripe_customer_id,
      updateData
    );
    
    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        metadata: customer.metadata
      }
    };
    
  } catch (error) {
    console.error('Error updating Stripe customer:', error);
    return {
      success: false,
      message: 'Failed to update customer'
    };
  }
};

// Validate payment data
export const validatePaymentData = (coins, currency, amount) => {
  const errors = [];
  
  if (!coins || coins <= 0 || !Number.isInteger(coins)) {
    errors.push('Coins must be a positive integer');
  }
  
  if (coins > 10000) {
    errors.push('Maximum 10,000 coins per transaction');
  }
  
  if (!SUPPORTED_CURRENCIES[currency] || !SUPPORTED_CURRENCIES[currency].supported) {
    errors.push(`Currency ${currency} is not supported`);
  }
  
  if (!amount || amount <= 0) {
    errors.push('Amount must be positive');
  }
  
  if (amount > 50000) {
    errors.push('Amount exceeds maximum limit');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get exchange rate with fallback
export const getExchangeRateWithFallback = async (fromCurrency, toCurrency) => {
  try {
    const conversionResult = await convertCurrency(1, fromCurrency, toCurrency);
    
    if (conversionResult.success) {
      return conversionResult.rate;
    }
    
    // Fallback rates
    const fallbackRates = {
      'LKR_USD': 0.0031,
      'LKR_EUR': 0.0028,
      'LKR_GBP': 0.0024,
      'LKR_AUD': 0.0047,
      'LKR_JPY': 0.46
    };
    
    const key = `${fromCurrency}_${toCurrency}`;
    return fallbackRates[key] || null;
    
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return null;
  }
};

// Clean up old payment intents
export const cleanupOldPaymentIntents = async (daysOld = 30) => {
  try {
    const query = `
      DELETE FROM payment_intents 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND status IN ('canceled', 'succeeded')
      RETURNING COUNT(*) as deleted_count
    `;
    
    const result = await pool.query(query);
    const deletedCount = result.rows[0]?.deleted_count || 0;
    
    console.log(`Cleaned up ${deletedCount} old payment intents`);
    
    return {
      success: true,
      deletedCount
    };
    
  } catch (error) {
    console.error('Error cleaning up payment intents:', error);
    return {
      success: false,
      error: error.message
    };
  }
};