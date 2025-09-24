import pool from '../config/db.js';

// Record restaurant earnings from an order/reservation
export const createEarning = async (data, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    INSERT INTO restaurant_earnings (
      restaurant_id, transaction_id, order_id, reservation_id,
      gross_coins, commission_coins, net_coins, payout_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *
  `;
  
  const values = [
    data.restaurantId,
    data.transactionId,
    data.orderId || null,
    data.reservationId || null,
    data.grossCoins,
    data.commissionCoins,
    data.netCoins
  ];
  
  const result = await queryClient.query(query, values);
  return result.rows[0];
};

// Record platform commission
export const createCommission = async (data, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    INSERT INTO platform_revenue (
      transaction_id, restaurant_id, commission_coins, commission_percentage
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const values = [
    data.transactionId,
    data.restaurantId,
    data.commissionCoins,
    data.commissionPercentage || 5.00
  ];
  
  const result = await queryClient.query(query, values);
  return result.rows[0];
};

// Get restaurant's pending earnings
export const getPendingEarnings = async (restaurantId) => {
  const query = `
    SELECT 
      re.*,
      t.description,
      t.created_at as transaction_date
    FROM restaurant_earnings re
    JOIN transactions t ON re.transaction_id = t.id
    WHERE re.restaurant_id = $1 AND re.payout_status = 'pending'
    ORDER BY re.created_at DESC
  `;
  
  const result = await pool.query(query, [restaurantId]);
  return result.rows;
};

// Get earnings summary for a restaurant
export const getEarningsSummary = async (restaurantId, startDate, endDate) => {
  const query = `
    SELECT 
      COUNT(*) as transaction_count,
      SUM(gross_coins) as total_gross,
      SUM(commission_coins) as total_commission,
      SUM(net_coins) as total_net,
      payout_status
    FROM restaurant_earnings
    WHERE restaurant_id = $1
      AND created_at BETWEEN $2 AND $3
    GROUP BY payout_status
  `;
  
  const result = await pool.query(query, [restaurantId, startDate, endDate]);
  return result.rows;
};

// ADD THESE NEW FUNCTIONS:

// Get monthly earnings for a restaurant
export const getMonthlyEarnings = async (restaurantId, month, year) => {
  const query = `
    SELECT 
      SUM(net_coins) as total_earnings,
      COUNT(*) as transaction_count,
      payout_status
    FROM restaurant_earnings
    WHERE restaurant_id = $1
      AND EXTRACT(MONTH FROM created_at) = $2
      AND EXTRACT(YEAR FROM created_at) = $3
    GROUP BY payout_status
  `;
  
  const result = await pool.query(query, [restaurantId, month, year]);
  return result.rows;
};

// Get all pending payouts for admin (all restaurants)
export const getAllPendingPayouts = async () => {
  const query = `
    SELECT 
      re.restaurant_id,
      rp.name as restaurant_name,
      rp.email as restaurant_email,
      COUNT(re.id) as transaction_count,
      SUM(re.net_coins) as total_earnings,
      SUM(re.net_coins * 50) as amount_lkr
    FROM restaurant_earnings re
    JOIN restaurant_profiles rp ON re.restaurant_id = rp.id
    WHERE re.payout_status = 'pending'
    GROUP BY re.restaurant_id, rp.name, rp.email
    ORDER BY total_earnings DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Mark earnings as paid
export const markAsPaid = async (restaurantId, month, year, payoutId, client = null) => {
  const queryClient = client || pool;
  
  const query = `
    UPDATE restaurant_earnings
    SET payout_status = 'paid', 
        payout_id = $1,
        updated_at = NOW()
    WHERE restaurant_id = $2
      AND EXTRACT(MONTH FROM created_at) = $3
      AND EXTRACT(YEAR FROM created_at) = $4
      AND payout_status = 'pending'
    RETURNING *
  `;
  
  const result = await queryClient.query(query, [payoutId, restaurantId, month, year]);
  return result.rows;
};

// Get platform revenue summary
export const getPlatformRevenue = async (startDate, endDate) => {
  const query = `
    SELECT 
      COUNT(*) as transaction_count,
      SUM(commission_coins) as total_commission,
      SUM(commission_coins * 50) as total_lkr,
      settled
    FROM platform_revenue
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY settled
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
};

// Add these to your restaurantEarningsModel.js

// Get earnings history with filters
export const getEarningsHistory = async (restaurantId, startDate, endDate, status = null) => {
  let query = `
    SELECT 
      re.*,
      t.description,
      t.created_at as transaction_date,
      u.first_name || ' ' || u.last_name as customer_name
    FROM restaurant_earnings re
    JOIN transactions t ON re.transaction_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE re.restaurant_id = $1
  `;
  
  const params = [restaurantId];
  let paramCount = 1;
  
  if (startDate) {
    paramCount++;
    query += ` AND re.created_at >= $${paramCount}`;
    params.push(startDate);
  }
  
  if (endDate) {
    paramCount++;
    query += ` AND re.created_at <= $${paramCount}`;
    params.push(endDate);
  }
  
  if (status) {
    paramCount++;
    query += ` AND re.payout_status = $${paramCount}`;
    params.push(status);
  }
  
  query += ` ORDER BY re.created_at DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
};

// Get earnings by month (for charts)
export const getEarningsByMonth = async (restaurantId, year) => {
  const query = `
    SELECT 
      EXTRACT(MONTH FROM created_at) as month,
      SUM(net_coins) as total_coins,
      SUM(net_coins * 50) as total_lkr,
      COUNT(*) as transaction_count,
      payout_status
    FROM restaurant_earnings
    WHERE restaurant_id = $1
      AND EXTRACT(YEAR FROM created_at) = $2
    GROUP BY EXTRACT(MONTH FROM created_at), payout_status
    ORDER BY month
  `;
  
  const result = await pool.query(query, [restaurantId, year]);
  return result.rows;
};

// Get restaurant dashboard stats
export const getRestaurantDashboardStats = async (restaurantId) => {
  const query = `
    SELECT 
      COUNT(*) FILTER (WHERE payout_status = 'pending') as pending_count,
      SUM(net_coins) FILTER (WHERE payout_status = 'pending') as pending_coins,
      SUM(net_coins * 50) FILTER (WHERE payout_status = 'pending') as pending_lkr,
      COUNT(*) FILTER (WHERE payout_status = 'paid') as paid_count,
      SUM(net_coins) FILTER (WHERE payout_status = 'paid') as total_earned_coins,
      SUM(net_coins * 50) FILTER (WHERE payout_status = 'paid') as total_earned_lkr,
      COUNT(*) as total_transactions,
      SUM(gross_coins) as total_gross_coins,
      SUM(commission_coins) as total_commission_coins
    FROM restaurant_earnings
    WHERE restaurant_id = $1
  `;
  
  const result = await pool.query(query, [restaurantId]);
  return result.rows[0];
};