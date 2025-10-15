import pool from "../config/db.js";

/**
 * Get all active delivery agents
 */
export const getActiveAgents = async (client = pool) => {
  const result = await client.query(
    `SELECT da.id, da.user_id, da.status, 
            CONCAT(u.first_name, ' ', u.last_name) as name, 
            u.phone 
     FROM deliveryagent da
     JOIN users u ON da.user_id = u.id
     WHERE da.status = 'active' 
     ORDER BY da.id ASC`
  );
  return result.rows;
};

/**
 * Get delivery agent by ID
 */
export const getAgentById = async (agentId, client = pool) => {
  const result = await client.query(
    `SELECT da.*, 
            CONCAT(u.first_name, ' ', u.last_name) as name, 
            u.phone 
     FROM deliveryagent da
     JOIN users u ON da.user_id = u.id
     WHERE da.id = $1`,
    [agentId]
  );
  return result.rows[0];
};

/**
 * Get delivery agent by user_id
 */
export const getAgentByUserId = async (userId, client = pool) => {
  const result = await client.query(
    `SELECT da.*, 
            CONCAT(u.first_name, ' ', u.last_name) as name, 
            u.phone 
     FROM deliveryagent da
     JOIN users u ON da.user_id = u.id
     WHERE da.user_id = $1`,
    [userId]
  );
  return result.rows[0];
};

/**
 * Update delivery agent status
 */
export const updateAgentStatus = async (agentId, status, client = pool) => {
  const result = await client.query(
    `UPDATE deliveryagent 
     SET status = $1 
     WHERE id = $2 
     RETURNING *`,
    [status, agentId]
  );
  
  if (result.rows.length === 0) {
    throw new Error("Delivery agent not found");
  }
  
  return result.rows[0];
};

/**
 * Create delivery record
 */
export const createDelivery = async (orderId, agentId, otpCode, client = pool) => {
  const result = await client.query(
    `INSERT INTO deliveries (order_id, delivery_agent_id, otp_code, status)
     VALUES ($1, $2, $3, 'assigned')
     RETURNING *`,
    [orderId, agentId, otpCode]
  );
  return result.rows[0];
};

/**
 * Get delivery by order ID
 */
export const getDeliveryByOrderId = async (orderId, client = pool) => {
  const result = await client.query(
    `SELECT d.*, 
            CONCAT(u.first_name, ' ', u.last_name) as agent_name, 
            u.phone as agent_phone,
            da.status as agent_status
     FROM deliveries d
     LEFT JOIN deliveryagent da ON d.delivery_agent_id = da.id
     LEFT JOIN users u ON da.user_id = u.id
     WHERE d.order_id = $1`,
    [orderId]
  );
  return result.rows[0];
};

/**
 * Get all deliveries for a specific agent
 */
export const getAgentDeliveries = async (agentId, client = pool) => {
  const result = await client.query(
    `SELECT d.id, d.order_id, d.otp_code, d.status, d.created_at,
            o.total_amount, o.type, o.status as order_status,
            odd.delivery_address, odd.contact_number,
            CONCAT(cu.first_name, ' ', cu.last_name) as customer_name,
            rp.restaurant_name as restaurant_name
     FROM deliveries d
     JOIN orders o ON d.order_id = o.id
     LEFT JOIN order_delivery_details odd ON o.id = odd.order_id
     LEFT JOIN customer_profiles cp ON o.customer_id = cp.id
     LEFT JOIN users cu ON cp.user_id = cu.id
     LEFT JOIN restaurant_orders ro ON o.id = ro.order_id
     LEFT JOIN restaurant_profiles rp ON ro.restaurant_id = rp.id
     WHERE d.delivery_agent_id = $1
     ORDER BY d.created_at DESC`,
    [agentId]
  );
  return result.rows;
};

/**
 * Update delivery status
 */
export const updateDeliveryStatus = async (orderId, status, client = pool) => {
  const result = await client.query(
    `UPDATE deliveries 
     SET status = $1, 
         delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
         updated_at = NOW()
     WHERE order_id = $2 
     RETURNING *`,
    [status, orderId]
  );
  return result.rows[0];
};

/**
 * Verify OTP and complete delivery
 */
export const verifyAndCompleteDelivery = async (orderId, otpCode, client = pool) => {
  const delivery = await getDeliveryByOrderId(orderId, client);
  
  if (!delivery) {
    throw new Error("Delivery not found");
  }
  
  if (delivery.otp_code !== otpCode) {
    throw new Error("Invalid OTP");
  }
  
  // Update delivery status
  await updateDeliveryStatus(orderId, "delivered", client);
  
  // Update order status
  await client.query(
    "UPDATE orders SET status = 'delivered' WHERE id = $1",
    [orderId]
  );
  
  // Free up the delivery agent
  await updateAgentStatus(delivery.delivery_agent_id, "active", client);
  
  return { success: true, message: "Delivery completed successfully" };
};

/**
 * Get delivery details for customer view
 */
export const getDeliveryDetailsForCustomer = async (orderId, client = pool) => {
  const result = await client.query(
    `SELECT d.otp_code, d.status,
            CONCAT(u.first_name, ' ', u.last_name) as agent_name, 
            u.phone as agent_phone
     FROM deliveries d
     LEFT JOIN deliveryagent da ON d.delivery_agent_id = da.id
     LEFT JOIN users u ON da.user_id = u.id
     WHERE d.order_id = $1`,
    [orderId]
  );
  return result.rows[0];
};