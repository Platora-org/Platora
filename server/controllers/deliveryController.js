import pool from "../config/db.js";
import * as deliveryModel from "../models/deliveryModel.js";
import PDFDocument from 'pdfkit';

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
    const agentUserId = req.user.id; // From JWT token
    
    console.log(`🔐 Verifying OTP for order ${orderId}`);
    console.log(`Agent User ID: ${agentUserId}`);
    console.log(`Provided OTP: ${otp}`);
    
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: "Valid 6-digit OTP is required" });
    }
    
    await client.query('BEGIN');
    
    // Get the delivery agent's deliveryagent.id from users.id
    const agentResult = await client.query(
      'SELECT id FROM deliveryagent WHERE user_id = $1',
      [agentUserId]
    );
    
    if (agentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Delivery agent not found' });
    }
    
    const deliveryAgentId = agentResult.rows[0].id;
    console.log(`Delivery Agent ID: ${deliveryAgentId}`);
    
    // Get the delivery record with OTP
    const deliveryResult = await client.query(`
      SELECT id, delivery_agent_id, otp_code, status
      FROM deliveries
      WHERE order_id = $1 AND delivery_agent_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [orderId, deliveryAgentId]);
    
    if (deliveryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Delivery not found for this agent' });
    }
    
    const delivery = deliveryResult.rows[0];
    console.log(`Stored OTP: ${delivery.otp_code}`);
    console.log(`Current Status: ${delivery.status}`);
    
    // Verify OTP
    if (delivery.otp_code !== otp) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // Update delivery status to delivered
    await client.query(`
      UPDATE deliveries
      SET status = 'delivered', delivered_at = NOW()
      WHERE id = $1
    `, [delivery.id]);
    
    console.log(`✅ Delivery ${delivery.id} marked as delivered`);
    
    // Update restaurant_order status to completed
    const restaurantOrderResult = await client.query(`
      SELECT ro.id
      FROM restaurant_orders ro
      WHERE ro.order_id = $1
    `, [orderId]);
    
    for (const row of restaurantOrderResult.rows) {
      await client.query(`
        UPDATE restaurant_orders
        SET status = 'completed'
        WHERE id = $1
      `, [row.id]);
      
      console.log(`✅ Restaurant order ${row.id} marked as completed`);
    }
    
    // Update main order status to completed
    await client.query(`
      UPDATE orders
      SET status = 'completed'
      WHERE id = $1
    `, [orderId]);
    
    console.log(`✅ Main order ${orderId} marked as completed`);
    
    // Set delivery agent status back to 'active' (available for new deliveries)
    await client.query(`
      UPDATE deliveryagent
      SET status = 'active'
      WHERE id = $1
    `, [deliveryAgentId]);
    
    console.log(`✅ Agent ${deliveryAgentId} status set to active`);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Delivery completed successfully',
      delivery: {
        id: delivery.id,
        order_id: orderId,
        status: 'delivered'
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ 
      error: 'Failed to verify OTP and complete delivery',
      details: error.message 
    });
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
  const client = await pool.connect();
  
  try {
    const { orderId } = req.params;
    const agentUserId = req.user.id;
    
    console.log(`📦 Marking order ${orderId} as picked up by agent ${agentUserId}`);
    
    await client.query('BEGIN');
    
    // Get delivery agent ID
    const agentResult = await client.query(
      'SELECT id FROM deliveryagent WHERE user_id = $1',
      [agentUserId]
    );
    
    if (agentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Delivery agent not found' });
    }
    
    const deliveryAgentId = agentResult.rows[0].id;
    
    // Update delivery status to picked_up
    const result = await client.query(`
      UPDATE deliveries
      SET status = 'picked_up', picked_up_at = NOW()
      WHERE order_id = $1 AND delivery_agent_id = $2
      RETURNING *
    `, [orderId, deliveryAgentId]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    // Update restaurant_order status to delivering
    await client.query(`
      UPDATE restaurant_orders
      SET status = 'delivering'
      WHERE order_id = $1
    `, [orderId]);
    
    console.log(`✅ Order ${orderId} marked as picked up`);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Order marked as picked up',
      delivery: result.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error marking as picked up:', error);
    res.status(500).json({ 
      error: 'Failed to update pickup status',
      details: error.message 
    });
  } finally {
    client.release();
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



/**
 * Generate delivery agent report
 * @route GET /api/delivery/agent/report
 * @access Delivery agent (own reports)
 */
export const generateAgentReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const agentUserId = req.user.id;
    
    // Validate date inputs
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    console.log(`Generating delivery report for agent ${agentUserId} from ${startDate} to ${endDate}`);
    
    // Get agent info
    const agentResult = await pool.query(
      `SELECT da.id, CONCAT(u.first_name, ' ', u.last_name) as name, u.phone
       FROM deliveryagent da
       JOIN users u ON da.user_id = u.id
       WHERE da.user_id = $1`,
      [agentUserId]
    );
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }
    
    const agent = agentResult.rows[0];
    
    // Get filtered deliveries
    let query = `
      SELECT 
        d.id,
        d.order_id,
        d.status,
        d.created_at,
        d.picked_up_at,
        d.delivered_at,
        o.total_amount,
        odd.delivery_address,
        odd.contact_number,
        CONCAT(cu.first_name, ' ', cu.last_name) as customer_name,
        rp.restaurant_name
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN order_delivery_details odd ON o.id = odd.order_id
      LEFT JOIN customer_profiles cp ON o.customer_id = cp.id
      LEFT JOIN users cu ON cp.user_id = cu.id
      LEFT JOIN restaurant_orders ro ON o.id = ro.order_id
      LEFT JOIN restaurant_profiles rp ON ro.restaurant_id = rp.id
      WHERE d.delivery_agent_id = $1
        AND d.created_at >= $2
        AND d.created_at <= $3
    `;
    
    const params = [agent.id, startDate + 'T00:00:00Z', endDate + 'T23:59:59Z'];
    
    // Add status filter if provided
    if (status) {
      query += ' AND d.status = $4';
      params.push(status);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const deliveriesResult = await pool.query(query, params);
    const deliveries = deliveriesResult.rows;
    
    if (deliveries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No deliveries found for the specified criteria'
      });
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="delivery-report-${startDate}-to-${endDate}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 }
    });
    
    // Handle PDF errors
    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'PDF generation failed',
          error: err.message 
        });
      }
    });

    // Pipe PDF directly to response
    doc.pipe(res);
    
    // Professional emerald theme colors
    const primaryColor = '#065f46';    // Emerald dark
    const secondaryColor = '#f0fdf4';  // Emerald light background
    const accentColor = '#10b981';     // Emerald accent
    const textDark = '#111827';        // Nearly black
    const textMedium = '#4b5563';      // Medium gray
    const textLight = '#6b7280';       // Light gray
    const successColor = '#059669';    // Emerald green
    const warningColor = '#d97706';    // Professional amber
    
    // Page dimensions for calculations
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftMargin = 60;
    const rightMargin = pageWidth - 60;
    const contentWidth = rightMargin - leftMargin;
    
    // Create report ID
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    const reportId = `DR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${timestamp}`; 
    const generationTime = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Professional header with emerald theme
    doc.rect(0, 0, pageWidth, 100).fill(primaryColor);
    
    // Company name
    doc.fillColor('white')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('PLATORA', leftMargin, 25);
    
    doc.fontSize(12)
       .font('Helvetica')
       .text('Digital Wallet & Payment Solutions', leftMargin, 58);
    
    // Delivery report title - right aligned
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('DELIVERY REPORT', rightMargin - 200, 30);
    
    doc.fontSize(10)
       .font('Helvetica')
       .text('Agent Performance', rightMargin - 200, 55);
    
    let currentY = 130;
    
    // Report information header
    doc.fillColor(textDark)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Report Information', leftMargin, currentY);
    
    currentY += 25;
    
    // Report information layout
    const labelWidth = 120;
    const valueStartX = leftMargin + labelWidth;
    
    // Agent Name
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(textMedium)
       .text('Agent Name:', leftMargin, currentY);
    
    doc.font('Helvetica')
       .fillColor(textDark)
       .text(agent.name, valueStartX, currentY);
    
    currentY += 18;
    
    // Agent Phone
    doc.font('Helvetica-Bold')
       .fillColor(textMedium)
       .text('Phone:', leftMargin, currentY);
    
    doc.font('Helvetica')
       .fillColor(textDark)
       .text(agent.phone, valueStartX, currentY);
    
    currentY += 18;
    
    // Report Period
    doc.font('Helvetica-Bold')
       .fillColor(textMedium)
       .text('Report Period:', leftMargin, currentY);
    
    doc.font('Helvetica')
       .fillColor(textDark)
       .text(`${start.toLocaleDateString('en-US')} - ${end.toLocaleDateString('en-US')}`, valueStartX, currentY);
    
    currentY += 18;
    
    // Report ID
    doc.font('Helvetica-Bold')
       .fillColor(textMedium)
       .text('Report ID:', leftMargin, currentY);
    
    doc.font('Helvetica')
       .fillColor(textDark)
       .text(reportId, valueStartX, currentY);
    
    currentY += 18;
    
    // Generated Time
    doc.font('Helvetica-Bold')
       .fillColor(textMedium)
       .text('Generated:', leftMargin, currentY);
    
    doc.font('Helvetica')
       .fillColor(textDark)
       .text(generationTime, valueStartX, currentY);
    
    currentY += 18;
    
    // Status Filter (if applied)
    if (status) {
      doc.font('Helvetica-Bold')
         .fillColor(textMedium)
         .text('Status Filter:', leftMargin, currentY);
      
      doc.font('Helvetica')
         .fillColor(textDark)
         .text(status, valueStartX, currentY);
      
      currentY += 18;
    }
    
    // Total Deliveries
    doc.font('Helvetica-Bold')
       .fillColor(textMedium)
       .text('Total Deliveries:', leftMargin, currentY);
    
    doc.font('Helvetica')
       .fillColor(textDark)
       .text(deliveries.length.toLocaleString(), valueStartX, currentY);
    
    currentY += 35;
    
    // Summary statistics calculation
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const assignedDeliveries = deliveries.filter(d => d.status === 'assigned').length;
    const pickedUpDeliveries = deliveries.filter(d => d.status === 'picked_up').length;
    
    // Calculate total order value
    const totalOrderValue = deliveries.reduce((sum, d) => sum + parseFloat(d.total_amount || 0), 0);
    
    // Calculate average delivery time (for completed deliveries)
    const completedWithTimes = deliveries.filter(d => 
      d.status === 'delivered' && d.created_at && d.delivered_at
    );
    
    let avgDeliveryTime = 0;
    if (completedWithTimes.length > 0) {
      const totalMinutes = completedWithTimes.reduce((sum, d) => {
        const created = new Date(d.created_at);
        const delivered = new Date(d.delivered_at);
        return sum + (delivered - created) / (1000 * 60); // Convert to minutes
      }, 0);
      avgDeliveryTime = Math.round(totalMinutes / completedWithTimes.length);
    }
    
    // Professional summary section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor(textDark)
       .text('Performance Summary', leftMargin, currentY);
    
    currentY += 25;
    
    // Summary statistics in professional grid
    const completionRate = totalDeliveries > 0 
      ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) 
      : 0;
    
    const summaryData = [
      { label: 'Total Deliveries', value: totalDeliveries.toLocaleString(), color: accentColor },
      { label: 'Completed', value: completedDeliveries.toLocaleString(), color: successColor },
      { label: 'In Progress', value: pickedUpDeliveries.toLocaleString(), color: warningColor },
      { label: 'Assigned', value: assignedDeliveries.toLocaleString(), color: textMedium },
      { label: 'Completion Rate', value: `${completionRate}%`, color: textDark },
      { label: 'Avg. Time', value: `${avgDeliveryTime} min`, color: accentColor }
    ];
    
    // Display summary in 2x3 grid
    summaryData.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = leftMargin + col * 250;
      const yPos = currentY + row * 22;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(textMedium)
         .text(`${item.label}:`, x, yPos);
      
      doc.font('Helvetica')
         .fillColor(item.color)
         .text(item.value, x + 130, yPos);
    });
    
    currentY += (Math.ceil(summaryData.length / 2) * 22) + 35;
    
    // Delivery details section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor(textDark)
       .text('Delivery Details', leftMargin, currentY);
    
    currentY += 25;
    
    // Table configuration
    const rowHeight = 20;
    const headerHeight = 30;
    const availableSpace = pageHeight - currentY - 60;
    const maxRowsOnFirstPage = Math.floor((availableSpace - headerHeight) / rowHeight);
    const maxRowsOnSubsequentPages = Math.floor((pageHeight - 90 - headerHeight) / rowHeight);
    
    let currentPageRows = 0;
    let isFirstPage = true;
    
    // Function to draw table header
    const drawTableHeader = (y) => {
      doc.rect(leftMargin, y, contentWidth, headerHeight)
         .fill('#f3f4f6')
         .stroke('#9ca3af');
      
      const colWidths = [70, 110, 100, 80, 115];
      let colX = leftMargin + 10;
      
      doc.fillColor(textDark)
         .fontSize(10)
         .font('Helvetica-Bold');
      
      const headers = ['Date', 'Customer', 'Restaurant', 'Amount', 'Status'];
      
      headers.forEach((header, index) => {
        doc.text(header, colX, y + 10, { 
          width: colWidths[index] - 8, 
          align: 'left' 
        });
        colX += colWidths[index];
      });
      
      return y + headerHeight;
    };
    
    // Draw initial table header
    let tableY = drawTableHeader(currentY);
    currentY = tableY;
    
    // Process deliveries
    deliveries.forEach((delivery, index) => {
      const maxRows = isFirstPage ? maxRowsOnFirstPage : maxRowsOnSubsequentPages;
      
      // Check if we need a new page
      if (currentPageRows >= maxRows) {
        doc.addPage();
        currentY = 60;
        tableY = drawTableHeader(currentY);
        currentY = tableY;
        currentPageRows = 0;
        isFirstPage = false;
      }
      
      // Row background
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
      doc.rect(leftMargin, currentY, contentWidth, rowHeight)
         .fill(rowColor);
      
      const colWidths = [70, 110, 100, 80, 115];
      let colX = leftMargin + 10;
      
      // Date
      doc.fillColor(textDark)
         .fontSize(9)
         .font('Helvetica')
         .text(new Date(delivery.created_at).toLocaleDateString('en-US', {
           month: 'short',
           day: 'numeric',
           year: '2-digit'
         }), colX, currentY + 6);
      colX += colWidths[0];
      
      // Customer
      const customerName = delivery.customer_name || 'Unknown';
      doc.text(customerName, colX, currentY + 6, { 
        width: colWidths[1] - 8,
        ellipsis: true
      });
      colX += colWidths[1];
      
      // Restaurant
      const restaurantName = delivery.restaurant_name || 'N/A';
      doc.text(restaurantName, colX, currentY + 6, { 
        width: colWidths[2] - 8,
        ellipsis: true
      });
      colX += colWidths[2];
      
      // Amount
      const amount = parseFloat(delivery.total_amount || 0);
      doc.text(`Rs. ${amount.toFixed(2)}`, colX, currentY + 6);
      colX += colWidths[3];
      
      // Status
      const statusColor = delivery.status === 'delivered' ? successColor : 
                         delivery.status === 'picked_up' ? warningColor : textMedium;
      
      doc.fillColor(statusColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(delivery.status.toUpperCase(), colX, currentY + 6);
      
      currentY += rowHeight;
      currentPageRows++;
    });
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Delivery report generation error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate delivery report',
        error: error.message
      });
    }
  }
};