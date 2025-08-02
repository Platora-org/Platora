import pool from "../config/db.js";

export const findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
};

export const getAllUsers = async (email) => {
  const result = await pool.query('SELECT * FROM users', [email]);
  return result.rows[0];
};

export const createUser = async ({ firstName, lastName, email, password, phone, provider, role }) => {
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, phone, provider, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [firstName, lastName, email, password, phone, provider, role]
  );
  return result.rows[0];
};

export const createCustomerProfile = async (user_id) => {
  await pool.query(
    "INSERT INTO customer_profiles (user_id) VALUES ($1)",
    [user_id]
  );
};

export const createRestaurantProfile = async (user_id, restaurant_name) => {
  await pool.query(
    "INSERT INTO restaurant_profiles (user_id, restaurant_name) VALUES ($1, $2)",
    [user_id, restaurant_name]
  );
};
