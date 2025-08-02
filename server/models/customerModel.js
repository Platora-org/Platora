import pool from "../config/db.js";

export const getCustomerById = async (userId) => {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.first_name AS "firstName",
      u.last_name AS "lastName",
      u.email,
      u.phone,
      u.role,
      c.date_of_birth AS "dateOfBirth",
      c.gender
    FROM users u
    LEFT JOIN customer_profiles c ON u.id = c.user_id
    WHERE u.id = $1
  `, [userId]);
  return result.rows[0];
};
