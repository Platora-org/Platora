import pool from "../config/db.js";

export const getDeliveryAgents = async () => {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.first_name AS "firstName",
      u.last_name AS "lastName",
      u.email,
      u.phone,
      u.role,
      u.created_at,
      d.status
    FROM users u
    INNER JOIN deliveryagent d ON u.id = d.user_id
    WHERE u.account_status != 'deleted'
    ORDER BY u.created_at DESC
  `);
  return result.rows;
};
