import pool from "../config/db.js";

export const getAllMenus = async (id) => {
  try {
    const result = await pool.query(
        `SELECT * FROM menu_items
        WHERE restaurant_id = $1
        ORDER BY id`,
        [id]
    );
    return result.rows; // return the data

  } catch (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }

};