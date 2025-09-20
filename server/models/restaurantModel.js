import pool from "../config/db.js";

export const getRestaurantById = async (userId) => {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.first_name AS "firstName",
      u.last_name AS "lastName",
      u.email,
      u.phone,
      u.role,
      r.restaurant_name AS "restaurantName",
      r.id AS "restaurantId",
      r.cuisine_type AS "cuisineType"
    FROM users u
    LEFT JOIN restaurant_profiles r ON u.id = r.user_id
    WHERE u.id = $1
  `, [userId]);

  return result.rows[0];
};
