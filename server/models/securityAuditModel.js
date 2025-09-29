import pool from "../config/db.js";

// Get all security logs with filtering and pagination
export const getSecurityLogs = async (filters, page = 1, limit = 50) => {
  const { action, userId, startDate, endDate, ipAddress } = filters;

  let query = `
    SELECT 
      sl.*,
      u.first_name as user_first_name,
      u.last_name as user_last_name,
      u.email as user_email,
      u.role as user_role,
      w.wallet_status,
      w.balance_coins
    FROM security_logs sl
    LEFT JOIN users u ON sl.user_id = u.id
    LEFT JOIN wallets w ON sl.user_id = w.user_id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  if (action) {
    paramCount++;
    query += ` AND sl.action = $${paramCount}`;
    params.push(action);
  }

  if (userId) {
    paramCount++;
    query += ` AND sl.user_id = $${paramCount}`;
    params.push(parseInt(userId));
  }

  if (startDate) {
    paramCount++;
    query += ` AND DATE(sl.created_at) >= $${paramCount}`;
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    query += ` AND DATE(sl.created_at) <= $${paramCount}`;
    params.push(endDate);
  }

  if (ipAddress) {
    paramCount++;
    query += ` AND sl.ip_address = $${paramCount}`;
    params.push(ipAddress);
  }

  query += ` ORDER BY sl.created_at DESC`;

  // Add pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(parseInt(limit));

  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await pool.query(query, params);
  return result.rows;
};

// Get total count for pagination
export const getSecurityLogsCount = async (filters) => {
  const { action, userId, startDate, endDate, ipAddress } = filters;

  let countQuery = `
    SELECT COUNT(*) as total
    FROM security_logs sl
    WHERE 1=1
  `;

  let countParams = [];
  let countParamIndex = 0;

  if (action) {
    countParamIndex++;
    countQuery += ` AND sl.action = $${countParamIndex}`;
    countParams.push(action);
  }

  if (userId) {
    countParamIndex++;
    countQuery += ` AND sl.user_id = $${countParamIndex}`;
    countParams.push(parseInt(userId));
  }

  if (startDate) {
    countParamIndex++;
    countQuery += ` AND DATE(sl.created_at) >= $${countParamIndex}`;
    countParams.push(startDate);
  }

  if (endDate) {
    countParamIndex++;
    countQuery += ` AND DATE(sl.created_at) <= $${countParamIndex}`;
    countParams.push(endDate);
  }

  if (ipAddress) {
    countParamIndex++;
    countQuery += ` AND sl.ip_address = $${countParamIndex}`;
    countParams.push(ipAddress);
  }

  const result = await pool.query(countQuery, countParams);
  return parseInt(result.rows[0].total);
};

// Get security statistics overview
export const getSecurityOverviewStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_events,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d_events,
      COUNT(CASE WHEN action LIKE '%FAILED%' OR action LIKE '%SUSPICIOUS%' THEN 1 END) as security_alerts,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT ip_address) as unique_ips
    FROM security_logs
  `;

  const result = await pool.query(query);
  return result.rows[0];
};

// Get action breakdown statistics
export const getActionBreakdown = async () => {
  const query = `
    SELECT 
      action,
      COUNT(*) as count,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_count
    FROM security_logs 
    GROUP BY action 
    ORDER BY count DESC
    LIMIT 10
  `;

  const result = await pool.query(query);
  return result.rows.map(row => ({
    action: row.action,
    count: parseInt(row.count),
    last_24h_count: parseInt(row.last_24h_count)
  }));
};

// Get suspicious IP addresses
export const getSuspiciousIPs = async () => {
  const query = `
    SELECT 
      ip_address,
      COUNT(*) as event_count,
      COUNT(CASE WHEN action LIKE '%FAILED%' THEN 1 END) as failed_events,
      COUNT(DISTINCT user_id) as affected_users,
      MAX(created_at) as last_activity
    FROM security_logs 
    WHERE ip_address IS NOT NULL
      AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY ip_address 
    HAVING COUNT(CASE WHEN action LIKE '%FAILED%' THEN 1 END) > 3
    ORDER BY failed_events DESC, event_count DESC
    LIMIT 10
  `;

  const result = await pool.query(query);
  return result.rows.map(row => ({
    ip_address: row.ip_address,
    event_count: parseInt(row.event_count),
    failed_events: parseInt(row.failed_events),
    affected_users: parseInt(row.affected_users),
    last_activity: row.last_activity
  }));
};

// Get recent high-risk events
export const getHighRiskEvents = async () => {
  const query = `
    SELECT 
      sl.action,
      sl.details,
      sl.created_at,
      sl.ip_address,
      u.email as user_email,
      u.first_name,
      u.last_name
    FROM security_logs sl
    LEFT JOIN users u ON sl.user_id = u.id
    WHERE sl.action IN (
      'PIN_FAILED', 'WALLET_LOCKED', 'SUSPICIOUS_ACTIVITY', 
      'ADMIN_PIN_RESET', 'BULK_OPERATION', 'PAYMENT_FAILED'
    )
      AND sl.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY sl.created_at DESC
    LIMIT 20
  `;

  const result = await pool.query(query);
  return result.rows;
};

// Get wallet status summary
export const getWalletStatusSummary = async () => {
  const query = `
    SELECT 
      wallet_status,
      COUNT(*) as count,
      COUNT(CASE WHEN failed_pin_attempts >= 3 THEN 1 END) as locked_count
    FROM wallets 
    GROUP BY wallet_status
  `;

  const result = await pool.query(query);
  return result.rows.map(row => ({
    status: row.wallet_status,
    count: parseInt(row.count),
    locked_count: parseInt(row.locked_count)
  }));
};

// Get security logs for a specific user
export const getUserSecurityLogs = async (userId, limit = 50) => {
  const query = `
    SELECT 
      sl.*,
      u.first_name,
      u.last_name,
      u.email
    FROM security_logs sl
    LEFT JOIN users u ON sl.user_id = u.id
    WHERE sl.user_id = $1
    ORDER BY sl.created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [parseInt(userId), parseInt(limit)]);
  return result.rows;
};

// Get security logs by IP address
export const getSecurityLogsByIP = async (ipAddress) => {
  const query = `
    SELECT 
      sl.*,
      u.first_name,
      u.last_name,
      u.email,
      u.role as user_role
    FROM security_logs sl
    LEFT JOIN users u ON sl.user_id = u.id
    WHERE sl.ip_address = $1
    ORDER BY sl.created_at DESC
    LIMIT 100
  `;

  const result = await pool.query(query, [ipAddress]);
  return result.rows;
};

// Get IP summary
export const getIPSummary = async (ipAddress) => {
  const query = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(CASE WHEN action LIKE '%FAILED%' THEN 1 END) as failed_events,
      MIN(created_at) as first_seen,
      MAX(created_at) as last_seen
    FROM security_logs 
    WHERE ip_address = $1
  `;

  const result = await pool.query(query, [ipAddress]);
  return result.rows[0];
};

// Delete old security logs
export const deleteOldSecurityLogs = async (days = 365) => {
  const query = `
    DELETE FROM security_logs 
    WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
  `;

  const result = await pool.query(query);
  return result.rowCount;
};

// Get security logs for export
export const getSecurityLogsForExport = async (startDate = null, endDate = null) => {
  let query = `
    SELECT 
      sl.id,
      sl.action,
      sl.details,
      sl.created_at,
      sl.ip_address,
      u.email as user_email,
      u.first_name,
      u.last_name,
      u.role as user_role
    FROM security_logs sl
    LEFT JOIN users u ON sl.user_id = u.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  if (startDate) {
    paramCount++;
    query += ` AND DATE(sl.created_at) >= $${paramCount}`;
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    query += ` AND DATE(sl.created_at) <= $${paramCount}`;
    params.push(endDate);
  }

  query += ` ORDER BY sl.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

// Log security cleanup action
export const logCleanupAction = async (adminId, deletedCount, days, ipAddress) => {
  const query = `
    INSERT INTO security_logs (user_id, action, details, ip_address)
    VALUES ($1, $2, $3, $4)
  `;

  const details = `Cleared security logs older than ${days} days. Deleted ${deletedCount} records.`;
  
  await pool.query(query, [adminId, 'LOGS_CLEANUP', details, ipAddress]);
};