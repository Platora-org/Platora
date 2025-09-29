// models/menuModel.js
import pool from "../config/db.js";

// Create menu item
export async function createMenuItem({ restaurant_id, category_id, name, description, price, image_url }) {
  const query = `
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, image_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`;
  const values = [restaurant_id, category_id, name, description, price, image_url];
  const result = await pool.query(query, values);
  console.log(result.rows)
  return result.rows[0];
}

// Get all menu items by restaurant
export async function getMenuItems(restaurant_id) {
     console.log("RESTAURANT IDDDDD=====================" ,restaurant_id)
  const query = `
    SELECT mi.*, mc.name AS category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.restaurant_id = $1
    ORDER BY mi.created_at DESC`;
  const result = await pool.query(query, [restaurant_id]);

  return result.rows;
}

// Get single menu item
export async function getMenuItemById(id, restaurant_id) {
  const result = await pool.query(
    `SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2`,
    [id, restaurant_id]
  );
  return result.rows[0];
}

// Update menu item
export async function updateMenuItem(id, restaurant_id, { category_id, name, description, price, image_url, is_active }) {
  const query = `
    UPDATE menu_items
    SET category_id = $1,
        name = $2,
        description = $3,
        price = $4,
        image_url = $5,
        is_active = $6
    WHERE id = $7 AND restaurant_id = $8
    RETURNING *`;
  const values = [category_id, name, description, price, image_url, is_active, id, restaurant_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Hard delete
export async function deleteMenuItem(id, restaurant_id) {
  const result = await pool.query(
    `DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING *`,
    [id, restaurant_id]
  );
  return result.rows[0];
}

export async function getRestaurantIdFromMenu(menuid) {
  const result = await pool.query(
    `SELECT restaurant_id from menu_items WHERE id = $1`,
    [menuid]
  );
  return result.rows[0];
}



