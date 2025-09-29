import pool from '../config/db.js';

// Customer analytics
export const getCustomerAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      COALESCE(COUNT(DISTINCT w.user_id), 0) as total_customers,
      COALESCE(COUNT(DISTINCT CASE WHEN w.wallet_status = 'ACTIVE' THEN w.user_id END), 0) as active_customers,
      COALESCE(SUM(w.balance_coins), 0) as total_coins_in_circulation,
      COALESCE(AVG(w.balance_coins), 0) as avg_balance_per_customer,
      COALESCE(COUNT(DISTINCT CASE WHEN t.created_at >= $1 THEN t.user_id END), 0) as customers_with_transactions
    FROM wallets w
    LEFT JOIN transactions t ON w.user_id = t.user_id 
      AND t.created_at BETWEEN $1 AND $2
      AND t.status = 'COMPLETED'
  `;
  
  try {
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows[0] || {
      total_customers: 0,
      active_customers: 0,
      total_coins_in_circulation: 0,
      avg_balance_per_customer: 0,
      customers_with_transactions: 0
    };
  } catch (error) {
    console.error('Error in getCustomerAnalytics:', error);
    return {
      total_customers: 0,
      active_customers: 0,
      total_coins_in_circulation: 0,
      avg_balance_per_customer: 0,
      customers_with_transactions: 0
    };
  }
};

// Transaction analytics
export const getTransactionAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      transaction_type,
      COUNT(*) as transaction_count,
      SUM(ABS(amount_coins)) as total_coins,
      SUM(CASE 
        WHEN amount_money != 0 THEN amount_money 
        ELSE ABS(amount_coins) * 50 
      END) as total_value_lkr,
      AVG(ABS(amount_coins)) as avg_coins_per_transaction
    FROM transactions
    WHERE created_at BETWEEN $1 AND $2
      AND status = 'COMPLETED'
    GROUP BY transaction_type
    ORDER BY transaction_count DESC
  `;
  
  try {
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getTransactionAnalytics:', error);
    return [];
  }
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
  
  try {
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getDailyTransactionTrends:', error);
    return [];
  }
};

// Restaurant performance analytics - FIXED
export const getRestaurantPerformanceAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      rp.id,
      rp.restaurant_name as name,
      COUNT(re.id) as transaction_count,
      COALESCE(SUM(re.gross_coins), 0) as total_gross_coins,
      COALESCE(SUM(re.net_coins), 0) as total_net_coins,
      COALESCE(SUM(re.commission_coins), 0) as total_commission,
      COALESCE(SUM(re.net_coins * 50), 0) as total_earnings_lkr
    FROM restaurant_profiles rp
    JOIN users u ON rp.user_id = u.id
    LEFT JOIN restaurant_earnings re ON rp.id = re.restaurant_id
      AND re.created_at BETWEEN $1 AND $2
    WHERE u.role = 'restaurant'
    GROUP BY rp.id, rp.restaurant_name
    HAVING COUNT(re.id) > 0
    ORDER BY total_net_coins DESC
    LIMIT 10
  `;
  
  try {
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getRestaurantPerformanceAnalytics:', error);
    // Return empty array on error, but log the specific error
    console.error('SQL Error details:', error.message);
    return [];
  }
};

// Platform revenue analytics - FIXED
export const getPlatformRevenueAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      COALESCE(SUM(commission_coins), 0) as daily_commission_coins,
      COALESCE(SUM(commission_coins * 50), 0) as daily_commission_lkr,
      COUNT(*) as daily_transaction_count
    FROM platform_revenue
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `;
  
  try {
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getPlatformRevenueAnalytics:', error);
    // If platform_revenue table doesn't exist or is empty, return empty array
    return [];
  }
};

// Top spending customers - FIXED
export const getTopSpendingCustomers = async (startDate, endDate, limit = 10) => {
  const query = `
    SELECT 
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown User') as customer_name,
      u.email,
      COUNT(t.id) as transaction_count,
      COALESCE(SUM(ABS(t.amount_coins)), 0) as total_coins_spent,
      COALESCE(SUM(ABS(t.amount_coins) * 50), 0) as total_value_lkr,
      COALESCE(w.balance_coins, 0) as current_balance
    FROM users u
    JOIN wallets w ON u.id = w.user_id
    LEFT JOIN transactions t ON u.id = t.user_id
      AND t.transaction_type = 'SPEND'
      AND t.created_at BETWEEN $1 AND $2
      AND t.status = 'COMPLETED'
    WHERE u.role = 'customer'
    GROUP BY u.id, u.first_name, u.last_name, u.email, w.balance_coins
    HAVING COUNT(t.id) > 0
    ORDER BY total_coins_spent DESC
    LIMIT $3
  `;
  
  try {
    const result = await pool.query(query, [startDate, endDate, limit]);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getTopSpendingCustomers:', error);
    return [];
  }
};

// Export transaction data - ENHANCED
export const getTransactionExportData = async (filters = {}) => {
  let query = `
    SELECT 
      t.id,
      t.created_at,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown User') as customer_name,
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
        THEN rp.restaurant_name 
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
  
  try {
    const result = await pool.query(query, params);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getTransactionExportData:', error);
    return [];
  }
};

// Get transaction details for PDF generation - ENHANCED FOR ADMINS
export const getTransactionForInvoice = async (transactionId, userId, userRole = 'customer') => {
  let query = `
    SELECT 
      t.*,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown User') as customer_name,
      u.email,
      CASE 
        WHEN t.metadata->>'restaurant_id' IS NOT NULL 
        THEN rp.restaurant_name 
        ELSE NULL 
      END as restaurant_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN restaurant_profiles rp ON (t.metadata->>'restaurant_id')::int = rp.id
    WHERE t.id = $1
  `;
  
  const params = [transactionId];
  
  // Only add user restriction for non-admin users
  if (userRole !== 'admin') {
    query += ` AND t.user_id = $2`;
    params.push(userId);
  }
  
  try {
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getTransactionForInvoice:', error);
    return null;
  }
};

// Get transaction details for admin PDF generation (no user restriction) - LEGACY SUPPORT
export const getTransactionForInvoiceAdmin = async (transactionId) => {
  const query = `
    SELECT 
      t.*,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown User') as customer_name,
      u.email,
      CASE 
        WHEN t.metadata->>'restaurant_id' IS NOT NULL 
        THEN rp.restaurant_name 
        ELSE NULL 
      END as restaurant_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN restaurant_profiles rp ON (t.metadata->>'restaurant_id')::int = rp.id
    WHERE t.id = $1
  `;
  
  try {
    const result = await pool.query(query, [transactionId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getTransactionForInvoiceAdmin:', error);
    return null;
  }
};

// Get user monthly transactions - ENHANCED
export const getUserMonthlyTransactions = async (userId, month, year) => {
  const query = `
    SELECT * FROM transactions 
    WHERE user_id = $1 
      AND EXTRACT(MONTH FROM created_at) = $2 
      AND EXTRACT(YEAR FROM created_at) = $3 
      AND status = 'COMPLETED'
    ORDER BY created_at DESC
  `;
  
  try {
    const result = await pool.query(query, [userId, month, year]);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getUserMonthlyTransactions:', error);
    return [];
  }
};

// Get user info - ENHANCED
export const getUserInfo = async (userId) => {
  const query = `
    SELECT 
      COALESCE(first_name, '') as first_name, 
      COALESCE(last_name, '') as last_name, 
      email 
    FROM users 
    WHERE id = $1
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getUserInfo:', error);
    return null;
  }
};

// Database health check function
export const checkDatabaseHealth = async () => {
  const checks = {
    users: false,
    wallets: false,
    transactions: false,
    restaurant_profiles: false,
    restaurant_earnings: false,
    platform_revenue: false
  };
  
  try {
    // Check if required tables exist and have data
    const tableChecks = [
      { table: 'users', key: 'users' },
      { table: 'wallets', key: 'wallets' },
      { table: 'transactions', key: 'transactions' },
      { table: 'restaurant_profiles', key: 'restaurant_profiles' },
      { table: 'restaurant_earnings', key: 'restaurant_earnings' },
      { table: 'platform_revenue', key: 'platform_revenue' }
    ];
    
    for (const check of tableChecks) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${check.table} LIMIT 1`);
        checks[check.key] = true;
      } catch (error) {
        console.warn(`Table ${check.table} check failed:`, error.message);
        checks[check.key] = false;
      }
    }
    
    return checks;
  } catch (error) {
    console.error('Database health check failed:', error);
    return checks;
  }
};

// Get admin transaction data with filters
export const getAdminTransactionData = async (filters = {}) => {
  let query = `
    SELECT 
      t.id,
      t.created_at,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown User') as customer_name,
      u.email,
      t.transaction_type,
      t.amount_coins,
      t.amount_money,
      t.currency,
      t.description,
      t.status,
      t.reference_id,
      CASE 
        WHEN t.metadata->>'restaurant_id' IS NOT NULL 
        THEN rp.restaurant_name 
        ELSE 'Direct Purchase' 
      END as restaurant_name,
      u.id as user_id
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN restaurant_profiles rp ON (t.metadata->>'restaurant_id')::int = rp.id
    WHERE 1=1
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
  
  if (filters.status) {
    paramCount++;
    query += ` AND t.status = $${paramCount}`;
    params.push(filters.status);
  }
  
  query += ` ORDER BY t.created_at DESC`;
  
  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
  }
  
  if (filters.offset) {
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(filters.offset);
  }
  
  try {
    const result = await pool.query(query, params);
    return result.rows || [];
  } catch (error) {
    console.error('Error in getAdminTransactionData:', error);
    return [];
  }
};

// Get total count for admin transactions
export const getAdminTransactionCount = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
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
  
  if (filters.status) {
    paramCount++;
    query += ` AND t.status = $${paramCount}`;
    params.push(filters.status);
  }
  
  try {
    const result = await pool.query(query, params);
    return parseInt(result.rows[0]?.total) || 0;
  } catch (error) {
    console.error('Error in getAdminTransactionCount:', error);
    return 0;
  }
};