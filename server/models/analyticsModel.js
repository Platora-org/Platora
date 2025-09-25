import pool from '../config/db.js';

// Customer analytics
export const getCustomerAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      COUNT(DISTINCT w.user_id) as total_customers,
      COUNT(DISTINCT CASE WHEN w.wallet_status = 'ACTIVE' THEN w.user_id END) as active_customers,
      SUM(w.balance_coins) as total_coins_in_circulation,
      AVG(w.balance_coins) as avg_balance_per_customer,
      COUNT(DISTINCT CASE WHEN t.created_at >= $1 THEN t.user_id END) as customers_with_transactions
    FROM wallets w
    LEFT JOIN transactions t ON w.user_id = t.user_id 
      AND t.created_at BETWEEN $1 AND $2
      AND t.status = 'COMPLETED'
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows[0];
};

// Transaction analytics
export const getTransactionAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      transaction_type,
      COUNT(*) as transaction_count,
      SUM(ABS(amount_coins)) as total_coins,
      SUM(CASE WHEN amount_money != 0 THEN amount_money ELSE ABS(amount_coins) * 50 END) as total_value_lkr,
      AVG(ABS(amount_coins)) as avg_coins_per_transaction
    FROM transactions
    WHERE created_at BETWEEN $1 AND $2
      AND status = 'COMPLETED'
    GROUP BY transaction_type
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
};

// Daily transaction trends
export const getDailyTransactionTrends = async (startDate, endDate) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      transaction_type,
      COUNT(*) as count,
      SUM(ABS(amount_coins)) as total_coins
    FROM transactions
    WHERE created_at BETWEEN $1 AND $2
      AND status = 'COMPLETED'
    GROUP BY DATE(created_at), transaction_type
    ORDER BY date DESC
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
};

// Restaurant performance analytics
export const getRestaurantPerformanceAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      rp.id,
      rp.name,
      COUNT(re.id) as transaction_count,
      SUM(re.gross_coins) as total_gross_coins,
      SUM(re.net_coins) as total_net_coins,
      SUM(re.commission_coins) as total_commission,
      SUM(re.net_coins * 50) as total_earnings_lkr
    FROM restaurant_profiles rp
    LEFT JOIN restaurant_earnings re ON rp.id = re.restaurant_id
      AND re.created_at BETWEEN $1 AND $2
    GROUP BY rp.id, rp.name
    HAVING COUNT(re.id) > 0
    ORDER BY total_net_coins DESC
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
};

// Platform revenue analytics
export const getPlatformRevenueAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      SUM(commission_coins) as daily_commission_coins,
      SUM(commission_coins * 50) as daily_commission_lkr,
      COUNT(*) as daily_transaction_count
    FROM platform_revenue
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
};

// Top spending customers
export const getTopSpendingCustomers = async (startDate, endDate, limit = 10) => {
  const query = `
    SELECT 
      u.id,
      u.first_name || ' ' || u.last_name as customer_name,
      u.email,
      COUNT(t.id) as transaction_count,
      SUM(ABS(t.amount_coins)) as total_coins_spent,
      SUM(ABS(t.amount_coins) * 50) as total_value_lkr,
      w.balance_coins as current_balance
    FROM users u
    JOIN transactions t ON u.id = t.user_id
    JOIN wallets w ON u.id = w.user_id
    WHERE t.transaction_type = 'SPEND'
      AND t.created_at BETWEEN $1 AND $2
      AND t.status = 'COMPLETED'
    GROUP BY u.id, u.first_name, u.last_name, u.email, w.balance_coins
    ORDER BY total_coins_spent DESC
    LIMIT $3
  `;
  
  const result = await pool.query(query, [startDate, endDate, limit]);
  return result.rows;
};

// Export transaction data
export const getTransactionExportData = async (filters = {}) => {
  let query = `
    SELECT 
      t.id,
      t.created_at,
      u.first_name || ' ' || u.last_name as customer_name,
      u.email,
      t.transaction_type,
      t.amount_coins,
      t.amount_money,
      t.currency,
      t.description,
      t.status,
      t.reference_id as order_id,
      CASE 
        WHEN t.metadata->>'restaurant_id' IS NOT NULL 
        THEN rp.name 
        ELSE NULL 
      END as restaurant_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN restaurant_profiles rp ON (t.metadata->>'restaurant_id')::int = rp.id
    WHERE t.status = 'COMPLETED'
  `;
  
  const params = [];
  let paramCount = 0;
  
  if (filters.startDate) {
    paramCount++;
    query += ` AND t.created_at >= $${paramCount}`;
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    paramCount++;
    query += ` AND t.created_at <= $${paramCount}`;
    params.push(filters.endDate);
  }
  
  if (filters.transactionType) {
    paramCount++;
    query += ` AND t.transaction_type = $${paramCount}`;
    params.push(filters.transactionType);
  }
  
  if (filters.userId) {
    paramCount++;
    query += ` AND t.user_id = $${paramCount}`;
    params.push(filters.userId);
  }
  
  query += ` ORDER BY t.created_at DESC`;
  
  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
  }
  
  const result = await pool.query(query, params);
  return result.rows;
};

// Get transaction details for PDF generation
export const getTransactionForInvoice = async (transactionId, userId) => {
  const query = `
    SELECT 
      t.*,
      u.first_name || ' ' || u.last_name as customer_name,
      u.email,
      CASE 
        WHEN t.metadata->>'restaurant_id' IS NOT NULL 
        THEN rp.name 
        ELSE NULL 
      END as restaurant_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN restaurant_profiles rp ON (t.metadata->>'restaurant_id')::int = rp.id
    WHERE t.id = $1 AND t.user_id = $2
  `;
  
  const result = await pool.query(query, [transactionId, userId]);
  return result.rows[0];
};

// Get user monthly transactions
export const getUserMonthlyTransactions = async (userId, month, year) => {
  const query = `
    SELECT * FROM transactions 
    WHERE user_id = $1 
      AND EXTRACT(MONTH FROM created_at) = $2 
      AND EXTRACT(YEAR FROM created_at) = $3 
      AND status = 'COMPLETED'
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [userId, month, year]);
  return result.rows;
};

// Get user info
export const getUserInfo = async (userId) => {
  const query = `
    SELECT first_name, last_name, email 
    FROM users 
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};