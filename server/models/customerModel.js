import pool from "../config/db.js";

export const getCustomerById = async (userId) => {
  const result = await pool.query(
    `
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
  `,
    [userId]
  );
  return result.rows[0];
};

export const updateCustomerById = async (userId, data) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update users table
    await client.query(
      `
      UPDATE users
      SET first_name = $1,
          last_name = $2,
          phone = $3
      WHERE id = $4
    `,
      [data.firstName, data.lastName, data.phone, userId]
    );

    // Ensure customer_profiles row exists (in case it wasn't created yet)
    await client.query(
      `
      INSERT INTO customer_profiles (user_id, date_of_birth, gender)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET date_of_birth = EXCLUDED.date_of_birth,
                    gender = EXCLUDED.gender
    `,
      [userId, data.dateOfBirth || null, data.gender || null]
    );

    await client.query("COMMIT");

    // Return the updated customer profile
    return await getCustomerById(userId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
