import pool from "../config/db.js";

// Create wallet for a user
export const createWallet = async ({ userId, userType = "CUSTOMER", currency = "LKR" }, client = null) => {
  const queryClient = client || pool;
  
  const result = await queryClient.query(
    `INSERT INTO wallets (user_id, user_type, currency, balance_coins, balance_money)
     VALUES ($1, $2, $3, 0, 0)
     RETURNING *`,
    [userId, userType, currency]
  );
  return result.rows[0];
};

// Get wallet by user ID
export const getWalletByUserId = async (userId) => {
  const result = await pool.query(`SELECT * FROM wallets WHERE user_id=$1`, [userId]);
  return result.rows[0];
};

// Get wallet with user details
export const getWalletWithUserDetails = async (userId) => {
  const query = `
    SELECT w.*, u.first_name, u.last_name, u.email, u.role
    FROM wallets w
    JOIN users u ON w.user_id = u.id
    WHERE w.user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

// Update balance (with transaction safety)
export const updateBalance = async (userId, coinAmount, moneyAmount = 0, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET balance_coins = balance_coins + $2,
        balance_money = balance_money + $3,
        updated_at = NOW()
    WHERE user_id = $1 AND wallet_status = 'ACTIVE'
    RETURNING *
  `;
  const result = await queryClient.query(query, [userId, coinAmount, moneyAmount]);
  
  if (result.rows.length === 0) {
    throw new Error('Wallet not found or not active');
  }
  
  return result.rows[0];
};

// Check if user has sufficient balance
export const hasSufficientBalance = async (userId, requiredCoins) => {
  const query = `
    SELECT balance_coins 
    FROM wallets 
    WHERE user_id = $1 AND wallet_status = 'ACTIVE'
  `;
  const result = await pool.query(query, [userId]);
  
  if (result.rows.length === 0) {
    return false;
  }
  
  return parseFloat(result.rows[0].balance_coins) >= requiredCoins;
};

// Set wallet status
export const setWalletStatus = async (userId, status, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET wallet_status = $2, updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `;
  const result = await queryClient.query(query, [userId, status]);
  return result.rows[0];
};

// Get wallet statistics
export const getWalletStats = async (userId) => {
  const query = `
    SELECT 
      w.balance_coins,
      w.balance_money,
      w.currency,
      w.created_at as member_since,
      w.updated_at as last_activity,
      w.wallet_status,
      COALESCE(t.total_transactions, 0) as total_transactions,
      COALESCE(t.total_spent, 0) as total_spent,
      COALESCE(t.total_purchased, 0) as total_purchased,
      COALESCE(t.total_refunded, 0) as total_refunded
    FROM wallets w
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'SPEND' THEN ABS(amount_coins) ELSE 0 END) as total_spent,
        SUM(CASE WHEN transaction_type = 'PURCHASE' THEN amount_coins ELSE 0 END) as total_purchased,
        SUM(CASE WHEN transaction_type = 'REFUND' THEN amount_coins ELSE 0 END) as total_refunded
      FROM transactions 
      WHERE user_id = $1 AND status = 'COMPLETED'
      GROUP BY user_id
    ) t ON w.user_id = t.user_id
    WHERE w.user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

// Check daily/monthly limits
export const checkTransactionLimits = async (userId, amountLKR) => {
  const query = `
    SELECT 
      COALESCE(ws.daily_spend_limit, 1000000) as daily_limit,
      COALESCE(ws.monthly_spend_limit, 10000000) as monthly_limit,
      COALESCE(daily.daily_spent_lkr, 0) as daily_spent,
      COALESCE(monthly.monthly_spent_lkr, 0) as monthly_spent
    FROM wallets w
    LEFT JOIN wallet_settings ws ON w.user_id = ws.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        -- Convert all amounts to LKR using base coin value
        SUM(amount_coins * 50) as daily_spent_lkr
      FROM transactions
      WHERE user_id = $1
        AND transaction_type = 'PURCHASE'
        AND status = 'COMPLETED'
        AND DATE(created_at) = CURRENT_DATE
      GROUP BY user_id
    ) daily ON w.user_id = daily.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        -- Convert all amounts to LKR using base coin value
        SUM(amount_coins * 50) as monthly_spent_lkr
      FROM transactions
      WHERE user_id = $1
        AND transaction_type = 'PURCHASE'
        AND status = 'COMPLETED'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY user_id
    ) monthly ON w.user_id = monthly.user_id
    WHERE w.user_id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  
  if (result.rows.length === 0) {
    return { valid: false, message: 'Wallet not found' };
  }
  
  const limits = result.rows[0];

  // Parse to integers to ensure proper comparison
  const dailySpent = parseInt(limits.daily_spent) || 0;
  const monthlySpent = parseInt(limits.monthly_spent) || 0;
  const dailyLimit = parseInt(limits.daily_limit);
  const monthlyLimit = parseInt(limits.monthly_limit);
  
  console.log('Limit Check:', {
    userId,
    amountLKR,
    daily_spent: dailySpent,
    daily_limit: dailyLimit,
    would_exceed: (dailySpent + amountLKR) > dailyLimit
  });
  
  if ((dailySpent + amountLKR) > dailyLimit) {
    return { 
      valid: false, 
      message: 'Daily limit exceeded',
      dailyRemaining: Math.max(0, dailyLimit - dailySpent)
    };
  }
  
  if ((monthlySpent + amountLKR) > monthlyLimit) {
    return { 
      valid: false, 
      message: 'Monthly limit exceeded',
      monthlyRemaining: Math.max(0, monthlyLimit - monthlySpent)
    };
  }
  
  return { 
    valid: true,
    dailyRemaining: dailyLimit - dailySpent - amountLKR,
    monthlyRemaining: monthlyLimit - monthlySpent - amountLKR
  };
};
// PIN MANAGEMENT FUNCTIONS (Consolidated and Enhanced)

// Update wallet PIN
export const updateWalletPin = async (userId, pinHash, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET pin_hash = $2, failed_pin_attempts = 0, updated_at = NOW()
    WHERE user_id = $1
    RETURNING id, user_id, updated_at
  `;
  const result = await queryClient.query(query, [userId, pinHash]);
  return result.rows[0];
};

// Get wallet PIN info
export const getWalletPinInfo = async (userId) => {
  const query = `
    SELECT pin_hash, failed_pin_attempts, wallet_status, last_pin_attempt
    FROM wallets 
    WHERE user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

// Increment failed PIN attempts
export const incrementFailedPinAttempts = async (userId, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET failed_pin_attempts = failed_pin_attempts + 1, 
        last_pin_attempt = NOW(),
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING failed_pin_attempts
  `;
  const result = await queryClient.query(query, [userId]);
  return result.rows[0];
};

// Reset failed PIN attempts
export const resetFailedPinAttempts = async (userId, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET failed_pin_attempts = 0, 
        last_pin_attempt = NOW(),
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING failed_pin_attempts
  `;
  const result = await queryClient.query(query, [userId]);
  return result.rows[0];
};

// Lock wallet (set status to FROZEN)
export const lockWallet = async (userId, reason = 'Too many failed PIN attempts', client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET wallet_status = 'FROZEN',
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `;
  const result = await queryClient.query(query, [userId]);
  
  // Log the lock event
  if (result.rows.length > 0) {
    try {
      await queryClient.query(`
        INSERT INTO security_logs (user_id, action, details, ip_address)
        VALUES ($1, 'WALLET_LOCKED', $2, NULL)
      `, [userId, `Wallet locked: ${reason}`]);
    } catch (logError) {
      console.error('Failed to log wallet lock event:', logError);
      // Don't fail the main operation if logging fails
    }
  }
  
  return result.rows[0];
};

// Unlock wallet (set status back to ACTIVE)
export const unlockWallet = async (userId, adminId = null, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET wallet_status = 'ACTIVE',
        failed_pin_attempts = 0,
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `;
  const result = await queryClient.query(query, [userId]);
  
  // Log the unlock event
  if (result.rows.length > 0 && adminId) {
    try {
      await queryClient.query(`
        INSERT INTO security_logs (user_id, action, details, metadata)
        VALUES ($1, 'WALLET_UNLOCKED', $2, $3)
      `, [userId, `Wallet unlocked by admin`, JSON.stringify({ admin_id: adminId })]);
    } catch (logError) {
      console.error('Failed to log wallet unlock event:', logError);
      // Don't fail the main operation if logging fails
    }
  }
  
  return result.rows[0];
};

// Check if PIN is set
export const isPinSet = async (userId) => {
  const query = `
    SELECT 
      CASE WHEN pin_hash IS NOT NULL THEN true ELSE false END as pin_set
    FROM wallets 
    WHERE user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0]?.pin_set || false;
};

// Get PIN attempt history (for security monitoring)
export const getPinAttemptHistory = async (userId, days = 7) => {
  const query = `
    SELECT 
      failed_pin_attempts,
      last_pin_attempt,
      wallet_status
    FROM wallets 
    WHERE user_id = $1
      AND last_pin_attempt >= NOW() - INTERVAL '${days} days'
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Enhanced security: Check for suspicious PIN activity
export const checkSuspiciousActivity = async (userId) => {
  const query = `
    SELECT 
      failed_pin_attempts,
      last_pin_attempt,
      wallet_status,
      CASE 
        WHEN failed_pin_attempts >= 3 THEN 'LOCKED'
        WHEN failed_pin_attempts >= 2 THEN 'WARNING'
        ELSE 'NORMAL'
      END as security_status
    FROM wallets 
    WHERE user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

// SECURITY AND AUDIT FUNCTIONS

// Log security events
export const logSecurityEvent = async (userId, action, details = {}, client = null) => {
  const queryClient = client || pool;
  
  try {
    const query = `
      INSERT INTO security_logs (user_id, action, details, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `;
    
    const result = await queryClient.query(query, [
      userId,
      action,
      typeof details === 'string' ? details : JSON.stringify(details),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        ...details
      })
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw error to avoid disrupting main operation
    return null;
  }
};

// Get security logs for a user
export const getSecurityLogs = async (userId, limit = 50, offset = 0) => {
  const query = `
    SELECT * FROM security_logs 
    WHERE user_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `;
  
  const result = await pool.query(query, [userId, limit, offset]);
  return result.rows;
};

// Get recent failed login attempts
export const getRecentFailedAttempts = async (userId, hours = 24) => {
  const query = `
    SELECT COUNT(*) as failed_count
    FROM security_logs 
    WHERE user_id = $1 
      AND action = 'PIN_FAILED'
      AND created_at >= NOW() - INTERVAL '${hours} hours'
  `;
  
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0]?.failed_count || 0);
};

// WALLET LIMITS AND SETTINGS

// Update wallet limits
export const updateWalletLimits = async (userId, dailyLimit, monthlyLimit, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET daily_limit = $2, monthly_limit = $3, updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `;
  
  const result = await queryClient.query(query, [userId, dailyLimit, monthlyLimit]);
  return result.rows[0];
};

// Get wallet limits
export const getWalletLimits = async (userId) => {
  const query = `
    SELECT daily_limit, monthly_limit
    FROM wallets 
    WHERE user_id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

// BATCH OPERATIONS

// Get multiple wallets by user IDs
export const getWalletsByUserIds = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  
  const query = `
    SELECT * FROM wallets 
    WHERE user_id = ANY($1)
    ORDER BY user_id
  `;
  
  const result = await pool.query(query, [userIds]);
  return result.rows;
};

// Bulk update wallet statuses
export const bulkUpdateWalletStatus = async (userIds, status, client = null) => {
  if (!userIds || userIds.length === 0) return [];
  
  const queryClient = client || pool;
  
  const query = `
    UPDATE wallets 
    SET wallet_status = $2, updated_at = NOW()
    WHERE user_id = ANY($1)
    RETURNING user_id, wallet_status
  `;
  
  const result = await queryClient.query(query, [userIds, status]);
  return result.rows;
};

// ADMIN FUNCTIONS

// Get all wallets with pagination
export const getAllWallets = async (limit = 50, offset = 0, filters = {}) => {
  let whereClause = 'WHERE 1=1';
  let values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    whereClause += ` AND wallet_status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.userType) {
    paramCount++;
    whereClause += ` AND user_type = $${paramCount}`;
    values.push(filters.userType);
  }

  if (filters.hasPin !== undefined) {
    paramCount++;
    whereClause += ` AND (pin_hash IS ${filters.hasPin ? 'NOT' : ''} NULL)`;
  }

  const query = `
    SELECT w.*, u.email, u.first_name, u.last_name
    FROM wallets w
    JOIN users u ON w.user_id = u.id
    ${whereClause}
    ORDER BY w.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;
  
  values.push(limit, offset);
  
  const result = await pool.query(query, values);
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM wallets w
    JOIN users u ON w.user_id = u.id
    ${whereClause}
  `;
  
  const countResult = await pool.query(countQuery, values.slice(0, -2));
  
  return {
    wallets: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  };
};

// Get wallet analytics for admin
export const getWalletAnalytics = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_wallets,
      COUNT(CASE WHEN wallet_status = 'ACTIVE' THEN 1 END) as active_wallets,
      COUNT(CASE WHEN wallet_status = 'FROZEN' THEN 1 END) as frozen_wallets,
      COUNT(CASE WHEN wallet_status = 'SUSPENDED' THEN 1 END) as suspended_wallets,
      COUNT(CASE WHEN pin_hash IS NOT NULL THEN 1 END) as wallets_with_pin,
      SUM(balance_coins) as total_coins_in_circulation,
      SUM(balance_money) as total_money_in_wallets,
      AVG(balance_coins) as avg_coins_per_wallet,
      COUNT(CASE WHEN failed_pin_attempts > 0 THEN 1 END) as wallets_with_failed_attempts
    FROM wallets
  `;
  
  const result = await pool.query(query);
  return result.rows[0];
};