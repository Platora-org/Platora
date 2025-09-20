// models/walletModel.js
import pool from "../config/db.js";

// Create wallet for a user
export const createWallet = async ({ userId, userType = "RESTAURANT", currency = "LKR" }) => {
  const result = await pool.query(
    `INSERT INTO wallets (user_id, user_type, currency, balance_coins, balance_money)
     VALUES ($1, $2, $3, 0, 0)
     RETURNING *`,
    [userId, userType, currency]
  );
  return result.rows[0];
};

// Get wallet by user ID
export const getWalletByUserId = async (userId) => {
  const result = await pool.query(`SELECT * FROM wallets WHERE user_id=$1`, [userId]);
  return result.rows[0];
};
