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
      r.cuisine_type AS "cuisineType",
      r.profile_image_url AS "profileImageUrl"
    FROM users u
    LEFT JOIN restaurant_profiles r ON u.id = r.user_id
    WHERE u.id = $1
  `, [userId]);

  return result.rows[0];
};


export const updateRestaurantProfile = async (userId, data) => {
  const { firstName, lastName, phone, restaurantName, cuisineType } = data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update the users table
    const userUpdateQuery = `
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3 
      WHERE id = $4
    `;
    await client.query(userUpdateQuery, [firstName, lastName, phone, userId]);

    // Update the restaurant_profiles table
    const profileUpdateQuery = `
      UPDATE restaurant_profiles 
      SET restaurant_name = $1, cuisine_type = $2 
      WHERE user_id = $3
    `;
    await client.query(profileUpdateQuery, [restaurantName, cuisineType, userId]);

    await client.query("COMMIT");

    // After a successful update, fetch and return the latest profile data
    return await getRestaurantById(userId);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in updateRestaurantProfile transaction:", err);
    throw err;
  } finally {
    client.release();
  }
};
export const updateProfileImageUrl = async (userId, imageUrl) => {
  const result = await pool.query(
    `
    UPDATE restaurant_profiles
    SET profile_image_url = $1
    WHERE user_id = $2
    RETURNING profile_image_url
    `,
    [imageUrl, userId]
  );
  return result.rows[0];
};