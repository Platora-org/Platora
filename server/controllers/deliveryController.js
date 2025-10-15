import pool from "../config/db.js";
import * as deliveryModel from "../models/deliveryModel.js";

// Helper to generate a 6-digit OTP
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Assign delivery agent to an order (called when order status becomes "ready")
 * This should be called automatically from the order controller
 * @param {number} orderId - The order ID to assign delivery agent
 * @param {Object} client - Database client (for transaction support)
 * @returns {Object} - Delivery assignment details
 */
export const assignDeliveryAgent = async (orderId, client = pool) => {
  try {
    // Get first active agent
    const agents = await deliveryModel.getActiveAgents(client);
    
    if (agents.length === 0) {
      throw new Error("No active delivery agents available");
    }
    
    const agent = agents[0];
    const otp = generateOtp();
    
    // Create delivery record
    const delivery = await deliveryModel.createDelivery(
      orderId,
      agent.id,
      otp,
      client
    );
    
    // Mark agent as busy
    await deliveryModel.updateAgentStatus(agent.id, "busy", client);
    
    // Update order status to out_for_delivery
    await client.query(
      "UPDATE orders SET status = 'out_for_delivery' WHERE id = $1",
      [orderId]
    );
    
    console.log(`✅ Delivery assigned: Order ${orderId} → Agent ${agent.name} (OTP: ${otp})`);
    
    return {
      success: true,
      delivery,
      agent: {
        id: agent.id,
        name: agent.name,
        phone: agent.phone
      },
      otp
    };
  } catch (err) {
    console.error("Error assigning delivery agent:", err);
    throw err;
  }
};

/**
 * Get delivery details for customer
 * Called when customer views their order
 * @route GET /api/delivery/order/:orderId/details
 * @access Customer or Admin
 */
export const getDeliveryDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const delivery = await deliveryModel.getDeliveryDetailsForCustomer(orderId);
    
    if (!delivery) {
      return res.status(404).json({ error: "Delivery information not found" });
    }
    
    res.json({
      agentName: delivery.agent_name,
      agentPhone: delivery.agent_phone,
      otp: delivery.otp_code,
      status: delivery.status
    });
  } catch (err) {
    console.error("Error fetching delivery details:", err);
    res.status(500).json({ error: "Failed to fetch delivery details" });
  }
};

/**
 * Verify OTP and complete delivery
 * Called by delivery agent when they deliver the order
 * @route POST /api/delivery/order/:orderId/verify-otp
 * @access Delivery agent
 */
export const verifyDeliveryOtp = async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const { otp } = req.body;
    
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: "Valid 6-digit OTP is required" });
    }
    
    await client.query("BEGIN");
    
    const result = await deliveryModel.verifyAndCompleteDelivery(
      orderId,
      otp,
      client
    );
    
    await client.query("COMMIT");
    
    console.log(`✅ Delivery completed: Order ${orderId}`);
    
    res.json(result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error verifying OTP:", err);
    
    if (err.message === "Delivery not found") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "Invalid OTP") {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Failed to complete delivery" });
  } finally {
    client.release();
  }
};

/**
 * Update delivery agent status
 * Called by agent to change their availability
 * @route PUT /api/delivery/agent/status
 * @access Delivery agent (own profile) or Admin
 */
export const updateAgentStatus = async (req, res) => {
  try {
    console.log('📥 Update status request received');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    
    const { status } = req.body;
    
    if (!req.user || !req.user.id) {
      console.error('❌ No user or user.id in request');
      return res.status(401).json({ error: "Unauthorized - no user information" });
    }
    
    // Get agent by user_id from logged-in user
    console.log('🔍 Looking for agent with user_id:', req.user.id);
    const agent = await deliveryModel.getAgentByUserId(req.user.id);
    
    if (!agent) {
      console.error('❌ Agent not found for user_id:', req.user.id);
      return res.status(404).json({ error: "Delivery agent profile not found" });
    }
    
    console.log('✅ Found agent:', agent);
    
    const allowedStatuses = ["active", "inactive"];
    if (!allowedStatuses.includes(status)) {
      console.error('❌ Invalid status:', status);
      return res.status(400).json({ 
        error: "Invalid status. Must be 'active' or 'inactive'" 
      });
    }
    
    // Check if agent has active deliveries
    console.log('🔍 Checking for active deliveries...');
    const currentDelivery = await pool.query(
      `SELECT * FROM deliveries 
       WHERE delivery_agent_id = $1 
       AND status IN ('assigned', 'picked_up')`,
      [agent.id]
    );
    
    console.log('Active deliveries:', currentDelivery.rows.length);
    
    if (currentDelivery.rows.length > 0) {
      console.log('❌ Agent has active deliveries, cannot change status');
      return res.status(400).json({ 
        error: "Cannot change status while you have active deliveries. Please complete your current delivery first.",
        currentStatus: "busy"
      });
    }
    
    // Update status in database
    console.log('💾 Updating status to:', status);
    const updatedAgent = await deliveryModel.updateAgentStatus(agent.id, status);
    
    console.log('✅ Status updated successfully:', updatedAgent);
    
    res.json({
      message: `Status updated to ${status}`,
      status: status,
      agent: {
        id: updatedAgent.id,
        status: updatedAgent.status
      }
    });
  } catch (err) {
    console.error("❌ Error updating agent status:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: "Failed to update status",
      details: err.message 
    });
  }
};

/**
 * Get all deliveries for logged-in agent
 * Called by agent to view their delivery history
 * @route GET /api/delivery/agent/deliveries
 * @access Delivery agent (own profile) or Admin
 */
export const getAgentDeliveries = async (req, res) => {
  try {
    // Get agent by user_id from logged-in user
    const agent = await deliveryModel.getAgentByUserId(req.user.id);
    
    if (!agent) {
      return res.status(404).json({ error: "Delivery agent profile not found" });
    }
    
    const deliveries = await deliveryModel.getAgentDeliveries(agent.id);
    
    res.json({ deliveries });
  } catch (err) {
    console.error("Error fetching agent deliveries:", err);
    res.status(500).json({ error: "Failed to fetch deliveries" });
  }
};

/**
 * Get current active delivery for logged-in agent
 * Called by agent dashboard to show current assignment
 * @route GET /api/delivery/agent/current
 * @access Delivery agent (own profile) or Admin
 */
export const getCurrentDelivery = async (req, res) => {
  try {
    // Get agent by user_id from logged-in user
    const agent = await deliveryModel.getAgentByUserId(req.user.id);
    
    if (!agent) {
      return res.status(404).json({ error: "Delivery agent profile not found" });
    }
    
    const result = await pool.query(
      `SELECT d.id, d.order_id, d.otp_code, d.status,
              o.total_amount,
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
       AND d.status IN ('assigned', 'picked_up')
       ORDER BY d.created_at DESC
       LIMIT 1`,
      [agent.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ currentDelivery: null });
    }
    
    res.json({ currentDelivery: result.rows[0] });
  } catch (err) {
    console.error("Error fetching current delivery:", err);
    res.status(500).json({ error: "Failed to fetch current delivery" });
  }
};

/**
 * Get agent profile information
 * @route GET /api/delivery/agent/profile
 * @access Delivery agent (own profile)
 */
export const getAgentProfile = async (req, res) => {
  try {
    console.log('📥 Get profile request');
    console.log('User:', req.user);
    
    const agent = await deliveryModel.getAgentByUserId(req.user.id);
    
    if (!agent) {
      console.error('❌ Agent not found for user_id:', req.user.id);
      return res.status(404).json({ error: "Delivery agent profile not found" });
    }
    
    console.log('✅ Found agent:', agent);
    
    // Check if agent has active deliveries - if yes, status should be "busy"
    const currentDelivery = await pool.query(
      `SELECT * FROM deliveries 
       WHERE delivery_agent_id = $1 
       AND status IN ('assigned', 'picked_up')`,
      [agent.id]
    );
    
    // Sync status with database if there's a mismatch
    let actualStatus = agent.status;
    if (currentDelivery.rows.length > 0 && agent.status !== 'busy') {
      // Has active delivery but status is not busy - fix it
      await deliveryModel.updateAgentStatus(agent.id, 'busy');
      actualStatus = 'busy';
    } else if (currentDelivery.rows.length === 0 && agent.status === 'busy') {
      // No active delivery but status is busy - set to active
      await deliveryModel.updateAgentStatus(agent.id, 'active');
      actualStatus = 'active';
    }
    
    res.json({
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      status: actualStatus
    });
  } catch (err) {
    console.error("Error fetching agent profile:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

/**
 * Mark delivery as picked up
 * @route PUT /api/delivery/order/:orderId/pickup
 * @access Delivery agent
 */
export const markAsPickedUp = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Verify this delivery belongs to the logged-in agent
    const agent = await deliveryModel.getAgentByUserId(req.user.id);
    
    if (!agent) {
      return res.status(404).json({ error: "Delivery agent profile not found" });
    }
    
    const delivery = await deliveryModel.getDeliveryByOrderId(orderId);
    
    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" });
    }
    
    if (delivery.delivery_agent_id !== agent.id) {
      return res.status(403).json({ error: "This delivery is not assigned to you" });
    }
    
    await pool.query(
      `UPDATE deliveries 
       SET status = 'picked_up', picked_up_at = NOW() 
       WHERE order_id = $1`,
      [orderId]
    );
    
    console.log(`📦 Order picked up: ${orderId} by Agent ${agent.name}`);
    
    res.json({ message: "Order marked as picked up" });
  } catch (err) {
    console.error("Error marking as picked up:", err);
    res.status(500).json({ error: "Failed to update delivery status" });
  }
};

/**
 * Get all active delivery agents (Admin only)
 * @route GET /api/delivery/agents/active
 * @access Admin
 */
export const getActiveAgents = async (req, res) => {
  try {
    const agents = await deliveryModel.getActiveAgents();
    res.json({ agents });
  } catch (err) {
    console.error("Error fetching active agents:", err);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
};

/**
 * Get all delivery agents with their status (Admin only)
 * @route GET /api/delivery/agents
 * @access Admin
 */
export const getAllAgents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT da.id, da.user_id, da.status,
              CONCAT(u.first_name, ' ', u.last_name) as name,
              u.phone, u.email,
              COUNT(d.id) as total_deliveries,
              COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as completed_deliveries
       FROM deliveryagent da
       JOIN users u ON da.user_id = u.id
       LEFT JOIN deliveries d ON da.id = d.delivery_agent_id
       GROUP BY da.id, da.user_id, da.status, u.first_name, u.last_name, u.phone, u.email
       ORDER BY da.id`
    );
    
    res.json({ agents: result.rows });
  } catch (err) {
    console.error("Error fetching all agents:", err);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
};