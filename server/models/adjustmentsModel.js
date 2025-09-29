// models/adjustmentsModel.js
import pool from "../config/db.js";

// Create a new adjustment for a restaurant
async function create({ restaurant_id, item_id, item_name, direction, quantity, reason = null }) {
  const q = `INSERT INTO inventory_adjustments (restaurant_id, item_id, item_name, direction, quantity, reason)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
  return pool.query(q, [restaurant_id, item_id, item_name, direction, quantity, reason]);
}

// List all adjustments for a restaurant (ignoring item_id)
async function listForRestaurant(restaurant_id) {
  const q = `SELECT id, restaurant_id, item_id, item_name, direction, quantity, reason, created_at
             FROM inventory_adjustments
             WHERE restaurant_id = $1
             ORDER BY created_at DESC`;
  return pool.query(q, [restaurant_id]);
}

// List all adjustments for a restaurant (ignoring item_id)
async function listForRestaurantAsc(restaurant_id) {
  const q = `SELECT id, restaurant_id, item_id, item_name, direction, quantity, reason, created_at
             FROM inventory_adjustments
             WHERE restaurant_id = $1
             ORDER BY created_at ASC`;
  return pool.query(q, [restaurant_id]);
}

export default { create, listForRestaurant, listForRestaurantAsc };
