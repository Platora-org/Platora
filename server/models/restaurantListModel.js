import pool from "../config/db.js";

export const getAllRestaurants = async () => {
  try {
    const result = await pool.query(`SELECT * FROM restaurant_profiles`);
    return result.rows; // return the data
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    throw error;
  }

};
