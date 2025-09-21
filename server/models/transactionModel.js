import pool from "../config/db.js";

// Create new transaction
export const createTransaction = async (transactionData, client = null) => {
  const queryClient = client || pool;
  
  const {
    userId,
    transactionType,
    amountCoins,
    amountMoney = 0,
    currency = 'LKR',
    description,
    referenceId = null,
    status = 'COMPLETED',
    stripePaymentIntentId = null,  // Added for Stripe integration
    paymentMethod = null,          // Added for payment method tracking
    metadata = {}
  } = transactionData;

  // Validate required fields
  if (!userId || !transactionType || amountCoins === undefined || !description) {
    throw new Error('Missing required transaction fields');
  }

  // Validate transaction type
  const validTypes = ['PURCHASE', 'SPEND', 'REFUND', 'TRANSFER'];
  if (!validTypes.includes(transactionType)) {
    throw new Error(`Invalid transaction type: ${transactionType}`);
  }

  // Validate status
  const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid transaction status: ${status}`);
  }

  const query = `
    INSERT INTO transactions (
      user_id, transaction_type, amount_coins, amount_money, 
      currency, description, reference_id, status, 
      stripe_payment_intent_id, payment_method, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  
  const values = [
    userId, transactionType, amountCoins, amountMoney, 
    currency, description, referenceId, status,
    stripePaymentIntentId, paymentMethod, JSON.stringify(metadata)
  ];
  
  const result = await queryClient.query(query, values);
  return result.rows[0];
};

// Get user transaction history
export const getTransactionsByUserId = async (userId, limit = 50, offset = 0, filters = {}) => {
  let whereClause = 'WHERE user_id = $1';
  let values = [userId];
  let paramCount = 1;

  // Add filters
  if (filters.type) {
    paramCount++;
    whereClause += ` AND transaction_type = $${paramCount}`;
    values.push(filters.type);
  }

  if (filters.status) {
    paramCount++;
    whereClause += ` AND status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.dateFrom) {
    paramCount++;
    whereClause += ` AND created_at >= $${paramCount}`;
    values.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    paramCount++;
    whereClause += ` AND created_at <= $${paramCount}`;
    values.push(filters.dateTo);
  }

  if (filters.paymentMethod) {
    paramCount++;
    whereClause += ` AND payment_method = $${paramCount}`;
    values.push(filters.paymentMethod);
  }

  if (filters.minAmount) {
    paramCount++;
    whereClause += ` AND ABS(amount_coins) >= $${paramCount}`;
    values.push(filters.minAmount);
  }

  if (filters.maxAmount) {
    paramCount++;
    whereClause += ` AND ABS(amount_coins) <= $${paramCount}`;
    values.push(filters.maxAmount);
  }

  const query = `
    SELECT *
    FROM transactions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;
  
  values.push(limit, offset);
  
  const result = await pool.query(query, values);
  
  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM transactions
    ${whereClause}
  `;
  
  const countResult = await pool.query(countQuery, values.slice(0, -2));
  
  return {
    transactions: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  };
};

// Get transaction by ID
export const getTransactionById = async (transactionId, userId = null) => {
  let query = 'SELECT * FROM transactions WHERE id = $1';
  let values = [transactionId];
  
  if (userId) {
    query += ' AND user_id = $2';
    values.push(userId);
  }
  
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

// Get transaction by Stripe payment intent (NEW - for Stripe integration)
export const getTransactionByStripePaymentIntent = async (paymentIntentId) => {
  const query = `
    SELECT * FROM transactions 
    WHERE stripe_payment_intent_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  const result = await pool.query(query, [paymentIntentId]);
  return result.rows[0] || null;
};

// Update transaction status
export const updateTransactionStatus = async (transactionId, status, userId = null, client = null) => {
  const queryClient = client || pool;
  
  let query = `
    UPDATE transactions 
    SET status = $2, updated_at = NOW()
    WHERE id = $1
  `;
  let values = [transactionId, status];
  
  if (userId) {
    query += ' AND user_id = $3';
    values.push(userId);
  }
  
  query += ' RETURNING *';
  
  const result = await queryClient.query(query, values);
  return result.rows[0] || null;
};

// Update transaction with additional metadata
export const updateTransactionMetadata = async (transactionId, metadata, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE transactions 
    SET metadata = metadata || $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await queryClient.query(query, [transactionId, JSON.stringify(metadata)]);
  return result.rows[0] || null;
};

// Get spending analytics
export const getSpendingAnalytics = async (userId, period = 'month') => {
  let dateFilter = '';
  
  switch (period) {
    case 'week':
      dateFilter = "created_at >= DATE_TRUNC('week', CURRENT_DATE)";
      break;
    case 'month':
      dateFilter = "created_at >= DATE_TRUNC('month', CURRENT_DATE)";
      break;
    case 'quarter':
      dateFilter = "created_at >= DATE_TRUNC('quarter', CURRENT_DATE)";
      break;
    case 'year':
      dateFilter = "created_at >= DATE_TRUNC('year', CURRENT_DATE)";
      break;
    case 'all':
      dateFilter = '1=1';
      break;
    default:
      dateFilter = "created_at >= DATE_TRUNC('month', CURRENT_DATE)";
  }

  const query = `
    SELECT 
      transaction_type,
      COUNT(*) as transaction_count,
      SUM(ABS(amount_coins)) as total_coins,
      SUM(amount_money) as total_money,
      AVG(ABS(amount_coins)) as avg_coins,
      MIN(ABS(amount_coins)) as min_coins,
      MAX(ABS(amount_coins)) as max_coins
    FROM transactions
    WHERE user_id = $1 AND ${dateFilter} AND status = 'COMPLETED'
    GROUP BY transaction_type
    ORDER BY transaction_type
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Get monthly spending trends
export const getMonthlyTrends = async (userId, months = 6) => {
  const query = `
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      transaction_type,
      SUM(ABS(amount_coins)) as total_coins,
      SUM(amount_money) as total_money,
      COUNT(*) as transaction_count,
      AVG(ABS(amount_coins)) as avg_transaction_amount
    FROM transactions
    WHERE user_id = $1 
      AND created_at >= CURRENT_DATE - INTERVAL '${months} months'
      AND status = 'COMPLETED'
    GROUP BY DATE_TRUNC('month', created_at), transaction_type
    ORDER BY month DESC, transaction_type
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Get category-wise spending (requires metadata with category info)
export const getCategorySpending = async (userId, period = 'month') => {
  let dateFilter = '';
  
  switch (period) {
    case 'week':
      dateFilter = "AND created_at >= DATE_TRUNC('week', CURRENT_DATE)";
      break;
    case 'month':
      dateFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
      break;
    case 'quarter':
      dateFilter = "AND created_at >= DATE_TRUNC('quarter', CURRENT_DATE)";
      break;
    case 'year':
      dateFilter = "AND created_at >= DATE_TRUNC('year', CURRENT_DATE)";
      break;
    default:
      dateFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
  }

  const query = `
    SELECT 
      COALESCE(metadata->>'category', 'Other') as category,
      SUM(ABS(amount_coins)) as total_coins,
      COUNT(*) as transaction_count,
      AVG(ABS(amount_coins)) as avg_amount,
      MIN(ABS(amount_coins)) as min_amount,
      MAX(ABS(amount_coins)) as max_amount
    FROM transactions
    WHERE user_id = $1 
      AND transaction_type = 'SPEND'
      AND status = 'COMPLETED'
      ${dateFilter}
    GROUP BY metadata->>'category'
    ORDER BY total_coins DESC
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Process refund
export const processRefund = async (originalTransactionId, userId, reason = '', refundAmount = null) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get original transaction
    const originalQuery = `
      SELECT * FROM transactions 
      WHERE id = $1 AND user_id = $2 AND transaction_type = 'SPEND' AND status = 'COMPLETED'
    `;
    const originalResult = await client.query(originalQuery, [originalTransactionId, userId]);
    
    if (originalResult.rows.length === 0) {
      throw new Error('Original transaction not found or not refundable');
    }
    
    const originalTx = originalResult.rows[0];
    
    // Calculate refund amount (full refund if not specified)
    const refundCoins = refundAmount || Math.abs(originalTx.amount_coins);
    
    if (refundCoins > Math.abs(originalTx.amount_coins)) {
      throw new Error('Refund amount cannot exceed original transaction amount');
    }

    // Check if already refunded
    const existingRefundQuery = `
      SELECT SUM(amount_coins) as total_refunded
      FROM transactions
      WHERE reference_id = $1 AND transaction_type = 'REFUND' AND status = 'COMPLETED'
    `;
    const existingRefundResult = await client.query(existingRefundQuery, [originalTransactionId]);
    const totalRefunded = parseFloat(existingRefundResult.rows[0]?.total_refunded || 0);
    
    if (totalRefunded + refundCoins > Math.abs(originalTx.amount_coins)) {
      throw new Error('Total refund amount would exceed original transaction amount');
    }
    
    // Create refund transaction
    const refundData = {
      userId,
      transactionType: 'REFUND',
      amountCoins: refundCoins, // Make positive for refund
      amountMoney: 0,
      currency: originalTx.currency,
      description: `Refund for: ${originalTx.description}`,
      referenceId: originalTransactionId.toString(),
      status: 'COMPLETED',
      paymentMethod: 'refund',
      metadata: { 
        ...originalTx.metadata,
        refund_reason: reason,
        original_transaction: originalTransactionId,
        refund_type: refundAmount ? 'partial' : 'full'
      }
    };
    
    const refundTx = await createTransaction(refundData, client);
    
    // Update wallet balance
    const { updateBalance } = await import('./walletModel.js');
    await updateBalance(userId, refundCoins, 0, client);
    
    await client.query('COMMIT');
    return refundTx;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get refund history
export const getRefundHistory = async (userId, limit = 20, offset = 0) => {
  const query = `
    SELECT 
      t.*,
      orig.description as original_description,
      orig.created_at as original_date
    FROM transactions t
    LEFT JOIN transactions orig ON t.reference_id::integer = orig.id
    WHERE t.user_id = $1 AND t.transaction_type = 'REFUND'
    ORDER BY t.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const countQuery = `
    SELECT COUNT(*) as total
    FROM transactions
    WHERE user_id = $1 AND transaction_type = 'REFUND'
  `;

  const [transactionsResult, countResult] = await Promise.all([
    pool.query(query, [userId, limit, offset]),
    pool.query(countQuery, [userId])
  ]);

  return {
    refunds: transactionsResult.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  };
};

// Get transactions by reference ID (useful for order tracking)
export const getTransactionsByReference = async (referenceId) => {
  const query = `
    SELECT * FROM transactions 
    WHERE reference_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [referenceId]);
  return result.rows;
};

// Get transaction summary for a period
export const getTransactionSummary = async (userId, dateFrom, dateTo) => {
  const query = `
    SELECT 
      transaction_type,
      status,
      COUNT(*) as count,
      SUM(ABS(amount_coins)) as total_coins,
      SUM(amount_money) as total_money,
      AVG(ABS(amount_coins)) as avg_coins
    FROM transactions
    WHERE user_id = $1 
      AND created_at >= $2 
      AND created_at <= $3
    GROUP BY transaction_type, status
    ORDER BY transaction_type, status
  `;
  
  const result = await pool.query(query, [userId, dateFrom, dateTo]);
  return result.rows;
};

// Get pending transactions
export const getPendingTransactions = async (userId = null, limit = 50) => {
  let query = `
    SELECT t.*, u.email, u.first_name, u.last_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE t.status = 'PENDING'
  `;
  let values = [];
  
  if (userId) {
    query += ' AND t.user_id = $1';
    values.push(userId);
  }
  
  query += ` ORDER BY t.created_at ASC LIMIT ${values.length + 1}`;
  values.push(limit);
  
  const result = await pool.query(query, values);
  return result.rows;
};

// Cancel pending transaction
export const cancelTransaction = async (transactionId, userId, reason = 'Cancelled by user') => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get transaction
    const getTransactionQuery = `
      SELECT * FROM transactions 
      WHERE id = $1 AND user_id = $2 AND status = 'PENDING'
    `;
    const result = await client.query(getTransactionQuery, [transactionId, userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Transaction not found or cannot be cancelled');
    }
    
    // Update transaction status
    const updateQuery = `
      UPDATE transactions 
      SET status = 'CANCELLED', 
          metadata = metadata || $3,
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const updateResult = await client.query(updateQuery, [
      transactionId, 
      userId, 
      JSON.stringify({ cancellation_reason: reason })
    ]);
    
    await client.query('COMMIT');
    return updateResult.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get transaction statistics for admin
export const getTransactionStatistics = async (dateFrom = null, dateTo = null) => {
  let dateFilter = '';
  let values = [];
  
  if (dateFrom && dateTo) {
    dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
    values = [dateFrom, dateTo];
  } else if (dateFrom) {
    dateFilter = 'WHERE created_at >= $1';
    values = [dateFrom];
  } else if (dateTo) {
    dateFilter = 'WHERE created_at <= $1';
    values = [dateTo];
  }

  const query = `
    SELECT 
      COUNT(*) as total_transactions,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_transactions,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_transactions,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_transactions,
      COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_transactions,
      COUNT(CASE WHEN transaction_type = 'PURCHASE' THEN 1 END) as purchase_transactions,
      COUNT(CASE WHEN transaction_type = 'SPEND' THEN 1 END) as spend_transactions,
      COUNT(CASE WHEN transaction_type = 'REFUND' THEN 1 END) as refund_transactions,
      SUM(CASE WHEN transaction_type = 'PURCHASE' AND status = 'COMPLETED' THEN amount_coins ELSE 0 END) as total_coins_purchased,
      SUM(CASE WHEN transaction_type = 'SPEND' AND status = 'COMPLETED' THEN ABS(amount_coins) ELSE 0 END) as total_coins_spent,
      SUM(CASE WHEN transaction_type = 'REFUND' AND status = 'COMPLETED' THEN amount_coins ELSE 0 END) as total_coins_refunded,
      SUM(CASE WHEN transaction_type = 'PURCHASE' AND status = 'COMPLETED' THEN amount_money ELSE 0 END) as total_money_received,
      AVG(CASE WHEN status = 'COMPLETED' THEN ABS(amount_coins) END) as avg_transaction_amount
    FROM transactions
    ${dateFilter}
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get top spenders
export const getTopSpenders = async (period = 'month', limit = 10) => {
  let dateFilter = '';
  
  switch (period) {
    case 'week':
      dateFilter = "AND created_at >= DATE_TRUNC('week', CURRENT_DATE)";
      break;
    case 'month':
      dateFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
      break;
    case 'quarter':
      dateFilter = "AND created_at >= DATE_TRUNC('quarter', CURRENT_DATE)";
      break;
    case 'year':
      dateFilter = "AND created_at >= DATE_TRUNC('year', CURRENT_DATE)";
      break;
    case 'all':
      dateFilter = '';
      break;
    default:
      dateFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
  }

  const query = `
    SELECT 
      t.user_id,
      u.email,
      u.first_name,
      u.last_name,
      SUM(ABS(t.amount_coins)) as total_spent,
      COUNT(*) as transaction_count,
      AVG(ABS(t.amount_coins)) as avg_transaction
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE t.transaction_type = 'SPEND' 
      AND t.status = 'COMPLETED'
      ${dateFilter}
    GROUP BY t.user_id, u.email, u.first_name, u.last_name
    ORDER BY total_spent DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limit]);
  return result.rows;
};

// Get failed transactions for analysis
export const getFailedTransactions = async (limit = 50, offset = 0) => {
  const query = `
    SELECT 
      t.*,
      u.email,
      u.first_name,
      u.last_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE t.status = 'FAILED'
    ORDER BY t.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const countQuery = `
    SELECT COUNT(*) as total
    FROM transactions
    WHERE status = 'FAILED'
  `;
  
  const [transactionsResult, countResult] = await Promise.all([
    pool.query(query, [limit, offset]),
    pool.query(countQuery)
  ]);
  
  return {
    transactions: transactionsResult.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  };
};