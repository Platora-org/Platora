import pool from "../config/db.js";

// Create audit log entry
export const createAuditLog = async ({
  kycId,
  adminId,
  action,
  details,
  ipAddress,
  userAgent
}) => {
  try {
    const result = await pool.query(
      `INSERT INTO kyc_audit_logs 
       (kyc_id, admin_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [kycId, adminId, action, details, ipAddress, userAgent]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating audit log:", error);
    throw error;
  }
};

// Get audit logs for a specific KYC
export const getAuditLogsByKYC = async (kycId) => {
  try {
    const result = await pool.query(
      `SELECT 
         al.*,
         u.first_name,
         u.last_name,
         u.email as admin_email
       FROM kyc_audit_logs al
       JOIN users u ON al.admin_id = u.id
       WHERE al.kyc_id = $1
       ORDER BY al.created_at DESC`,
      [kycId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
};

// Get all audit logs (for admin dashboard)
export const getAllAuditLogs = async (limit = 100, offset = 0) => {
  try {
    const result = await pool.query(
      `SELECT 
         al.*,
         admin.first_name as admin_first_name,
         admin.last_name as admin_last_name,
         admin.email as admin_email,
         restaurant.first_name as restaurant_first_name,
         restaurant.last_name as restaurant_last_name,
         restaurant.email as restaurant_email
       FROM kyc_audit_logs al
       JOIN users admin ON al.admin_id = admin.id
       JOIN kyc_requests kyc ON al.kyc_id = kyc.id
       JOIN users restaurant ON kyc.restaurant_id = restaurant.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching all audit logs:", error);
    throw error;
  }
};

// Get audit logs by admin
export const getAuditLogsByAdmin = async (adminId) => {
  try {
    const result = await pool.query(
      `SELECT 
         al.*,
         restaurant.first_name as restaurant_first_name,
         restaurant.last_name as restaurant_last_name,
         restaurant.email as restaurant_email
       FROM kyc_audit_logs al
       JOIN kyc_requests kyc ON al.kyc_id = kyc.id
       JOIN users restaurant ON kyc.restaurant_id = restaurant.id
       WHERE al.admin_id = $1
       ORDER BY al.created_at DESC`,
      [adminId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching admin audit logs:", error);
    throw error;
  }
};

// Get audit statistics
export const getAuditStatistics = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT admin_id) as unique_admins,
        COUNT(DISTINCT kyc_id) as unique_kyc_processed,
        SUM(CASE WHEN action = 'APPROVED' THEN 1 ELSE 0 END)::INTEGER as total_approvals,
        SUM(CASE WHEN action = 'REJECTED' THEN 1 ELSE 0 END)::INTEGER as total_rejections,
        SUM(CASE WHEN action = 'VIEWED' THEN 1 ELSE 0 END)::INTEGER as total_views,
        SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END)::INTEGER as last_24h_actions,
        SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::INTEGER as last_7d_actions
      FROM kyc_audit_logs
    `);
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching audit statistics:", error);
    throw error;
  }
};