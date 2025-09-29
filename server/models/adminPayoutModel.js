import pool from '../config/db.js';

// Get all restaurants with pending payouts
export const getAllPendingPayouts = async () => {
  const query = `
    SELECT 
      re.restaurant_id,
      rp.restaurant_name,
      u.email as restaurant_email,
      kr.bank_account_number,
      kr.bank_name,
      COUNT(re.id) as transaction_count,
      SUM(re.net_coins) as total_earnings,
      SUM(re.net_coins * 50) as amount_lkr
    FROM restaurant_earnings re
    JOIN restaurant_profiles rp ON re.restaurant_id = rp.id
    JOIN users u ON rp.user_id = u.id
    LEFT JOIN kyc_requests kr ON kr.restaurant_id = u.id AND kr.status = 'APPROVED'
    WHERE re.payout_status = 'pending'
    GROUP BY re.restaurant_id, rp.restaurant_name, u.email, kr.bank_account_number, kr.bank_name
    ORDER BY total_earnings DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Get earnings for specific restaurant and period
export const getRestaurantPeriodEarnings = async (restaurantId, month, year) => {
  const query = `
    SELECT 
      COUNT(*) as transaction_count,
      SUM(net_coins) as total_coins,
      SUM(net_coins * 50) as total_lkr
    FROM restaurant_earnings
    WHERE restaurant_id = $1
      AND EXTRACT(MONTH FROM created_at) = $2
      AND EXTRACT(YEAR FROM created_at) = $3
      AND payout_status = 'pending'
  `;
  
  const result = await pool.query(query, [restaurantId, month, year]);
  return result.rows[0];
};

// Create payout record
export const createPayout = async (data, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    INSERT INTO payout_history (
      restaurant_id, period_month, period_year,
      total_coins, amount_lkr, bank_account, bank_name,
      payout_date, proof_url, processed_by, status, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)
    RETURNING *
  `;
  
  const values = [
    data.restaurantId,
    data.month,
    data.year,
    data.totalCoins,
    data.amountLkr,
    data.bankAccount || null,
    data.bankName || null,
    data.proofUrl || null,
    data.processedBy,
    data.status || 'completed',
    data.notes || null
  ];
  
  const result = await queryClient.query(query, values);
  return result.rows[0];
};

// Get payout history with filters
export const getPayoutHistory = async (filters = {}) => {
  let query = `
    SELECT 
      ph.*,
      rp.restaurant_name,
      u.email as restaurant_email,
      admin_user.first_name || ' ' || admin_user.last_name as processed_by_name
    FROM payout_history ph
    JOIN restaurant_profiles rp ON ph.restaurant_id = rp.id
    JOIN users u ON rp.user_id = u.id
    LEFT JOIN users admin_user ON ph.processed_by = admin_user.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 0;
  
  if (filters.restaurantId) {
    paramCount++;
    query += ` AND ph.restaurant_id = $${paramCount}`;
    params.push(filters.restaurantId);
  }
  
  if (filters.startDate) {
    paramCount++;
    query += ` AND ph.payout_date >= $${paramCount}`;
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    paramCount++;
    query += ` AND ph.payout_date <= $${paramCount}`;
    params.push(filters.endDate);
  }
  
  if (filters.status) {
    paramCount++;
    query += ` AND ph.status = $${paramCount}`;
    params.push(filters.status);
  }
  
  query += ` ORDER BY ph.payout_date DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
};

// Get platform revenue statistics
export const getPlatformRevenueStats = async (startDate, endDate) => {
  const query = `
    SELECT 
      COUNT(*) as transaction_count,
      SUM(commission_coins) as total_commission_coins,
      SUM(commission_coins * 50) as total_commission_lkr,
      settled
    FROM platform_revenue
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY settled
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
};

// Get monthly payout summary for admin dashboard
export const getMonthlyPayoutSummary = async (year) => {
  const query = `
    SELECT 
      period_month,
      COUNT(*) as payout_count,
      SUM(amount_lkr) as total_amount,
      status
    FROM payout_history
    WHERE period_year = $1
    GROUP BY period_month, status
    ORDER BY period_month DESC
  `;
  
  const result = await pool.query(query, [year]);
  return result.rows;
};