// server/models/refundModel.js
import pool from "../config/db.js";

// Helper function to get transactions for a restaurant order
export async function getTransactionsForRestaurantOrder(restaurantOrderId) {
  const { rows } = await pool.query(
    `SELECT * FROM transactions 
     WHERE reference_id = $1
     AND transaction_type = 'SPEND'
     AND status = 'COMPLETED'
     ORDER BY created_at DESC`,
    [String(restaurantOrderId)]
  );
  return rows;
}

// Helper function to get transaction for a reservation
export async function getTransactionForReservation(reservationId) {
  const { rows } = await pool.query(
    `SELECT * FROM transactions 
     WHERE reference_id = $1 
     AND transaction_type = 'SPEND'
     AND status = 'COMPLETED'
     ORDER BY created_at DESC 
     LIMIT 1`,
    [String(reservationId)]
  );
  return rows[0];
}

// Main refund model object
export const refundModel = {
  // Create refund record
  async createRefund(refundData, client = null) {
    const shouldRelease = !client;
    if (!client) client = await pool.connect();
    
    try {
      const { rows } = await client.query(
        `INSERT INTO refunds (
          user_id, 
          transaction_id,
          order_id,
          reservation_id,
          refund_amount_coins,
          refund_reason,
          refund_type,
          restaurant_id,
          status,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          refundData.userId,
          refundData.transactionId,
          refundData.orderId || null,
          refundData.reservationId || null,
          refundData.refundAmountCoins,
          refundData.refundReason,
          refundData.refundType,
          refundData.restaurantId,
          refundData.status || 'PENDING',
          JSON.stringify(refundData.metadata || {})
        ]
      );
      return rows[0];
    } finally {
      if (shouldRelease) client.release();
    }
  },

  // Check if refund already exists for restaurant order
  async refundExistsForOrder(restaurantOrderId) {
    const { rows } = await pool.query(
      `SELECT id FROM refunds 
       WHERE order_id = $1 
       AND status IN ('PENDING', 'COMPLETED')
       LIMIT 1`,
      [restaurantOrderId]
    );
    return rows.length > 0;
  },

  // Check if refund already exists for reservation
  async refundExistsForReservation(reservationId) {
    const { rows } = await pool.query(
      `SELECT id FROM refunds 
       WHERE reservation_id = $1 
       AND status IN ('PENDING', 'COMPLETED')
       LIMIT 1`,
      [reservationId]
    );
    return rows.length > 0;
  },

  // Update refund status
  async updateRefundStatus(refundId, status, client = null) {
    const shouldRelease = !client;
    if (!client) client = await pool.connect();
    
    try {
      const { rows } = await client.query(
        `UPDATE refunds 
         SET status = $1, processed_at = NOW(), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, refundId]
      );
      return rows[0];
    } finally {
      if (shouldRelease) client.release();
    }
  },

  // Get refund by ID
  async getRefundById(refundId) {
    const { rows } = await pool.query(
      `SELECT * FROM refunds WHERE id = $1`,
      [refundId]
    );
    return rows[0];
  },

  // Get user refunds with pagination
  async getUserRefunds(userId, limit = 10, offset = 0) {
    const { rows } = await pool.query(
      `SELECT 
        r.*,
        t.description as original_transaction_description
       FROM refunds r
       LEFT JOIN transactions t ON r.transaction_id = t.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Get restaurant refunds (for restaurant dashboard)
  async getRestaurantRefunds(restaurantId, limit = 20, offset = 0) {
    const { rows } = await pool.query(
      `SELECT 
        r.*,
        u.first_name, u.last_name, u.email
       FROM refunds r
       JOIN users u ON r.user_id = u.id
       WHERE r.restaurant_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [restaurantId, limit, offset]
    );
    return rows;
  },

  // Get restaurant order details
  async getRestaurantOrderDetails(restaurantOrderId) {
    const { rows } = await pool.query(
      `SELECT 
        ro.id,
        ro.restaurant_id,
        ro.status,
        ro.subtotal,
        o.customer_id,
        cp.user_id
       FROM restaurant_orders ro
       JOIN orders o ON ro.order_id = o.id
       JOIN customer_profiles cp ON o.customer_id = cp.id
       WHERE ro.id = $1`,
      [restaurantOrderId]
    );
    return rows[0];
  },

  // Get total refund stats for a user (for analytics)
  async getUserRefundStats(userId) {
    const { rows } = await pool.query(
      `SELECT 
        COUNT(*) as total_refunds,
        COALESCE(SUM(refund_amount_coins), 0) as total_refunded_coins,
        COUNT(CASE WHEN refund_type = 'ORDER_REJECT' THEN 1 END) as order_refunds,
        COUNT(CASE WHEN refund_type = 'RESERVATION_CANCEL' THEN 1 END) as reservation_refunds
       FROM refunds
       WHERE user_id = $1 AND status = 'COMPLETED'`,
      [userId]
    );
    return rows[0];
  },
};