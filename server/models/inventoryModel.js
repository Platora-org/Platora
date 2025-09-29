// models/inventoryModel.js
import pool from "../config/db.js";

const columns = `id, restaurant_id, name, unit, quantity, reorder_level, created_at, updated_at`;

// Create inventory item for a restaurant
async function create({ restaurant_id, name, unit, quantity = 0, reorder_level = 0 }) {
  const q = `INSERT INTO inventory_items (restaurant_id, name, unit, quantity, reorder_level)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`;
  return pool.query(q, [restaurant_id, name, unit, quantity, reorder_level]);
}

// Get all inventory items for a restaurant
async function getAll(restaurant_id) {
  const q = `SELECT ${columns} FROM inventory_items 
             WHERE restaurant_id = $1
             ORDER BY created_at DESC`;
  return pool.query(q, [restaurant_id]);
}

// Get a single item by id for a restaurant
async function getById(id, restaurant_id) {
  const q = `SELECT ${columns} FROM inventory_items 
             WHERE id = $1 AND restaurant_id = $2`;
  return pool.query(q, [id, restaurant_id]);
}

// Update an item for a restaurant
async function update(id, restaurant_id, { name, unit, quantity, reorder_level }) {
  const q = `UPDATE inventory_items
             SET name = $1, unit = $2, quantity = $3, reorder_level = $4, updated_at = now()
             WHERE id = $5 AND restaurant_id = $6 RETURNING *`;
  return pool.query(q, [name, unit, quantity, reorder_level, id, restaurant_id]);
}

// Delete an item for a restaurant
async function remove(id, restaurant_id) {
  const q = `DELETE FROM inventory_items 
             WHERE id = $1 AND restaurant_id = $2 RETURNING *`;
  return pool.query(q, [id, restaurant_id]);
}

// Find item by name for a restaurant
async function findByName(name, restaurant_id) {
  const q = `SELECT ${columns} FROM inventory_items 
             WHERE LOWER(name) = LOWER($1) AND restaurant_id = $2`;
  return pool.query(q, [name, restaurant_id]);
}

// Find by name excluding id (useful for updates)
async function findByNameExcludingId(name, id, restaurant_id) {
  const q = `SELECT * FROM inventory_items 
             WHERE LOWER(name) = LOWER($1) AND id <> $2 AND restaurant_id = $3`;
  return pool.query(q, [name, id, restaurant_id]);
}

// Adjust quantity for a restaurant item
async function adjustQuantity(id, restaurant_id, adjustment) {
  const q = `UPDATE inventory_items
             SET quantity = GREATEST(0, quantity + $1), updated_at = now()
             WHERE id = $2 AND restaurant_id = $3 RETURNING *`;
  return pool.query(q, [adjustment, id, restaurant_id]);
}


// Deduct from inventory
async function deductInventory(itemId, qty, client) {
  await client.query(
    `UPDATE inventory_items
     SET quantity = quantity - $1, updated_at = NOW()
     WHERE id = $2`,
    [qty, itemId]
  );
}

// Log adjustment
async function logInventoryAdjustment(itemId, qty, reason, client) {
  await client.query(
    `INSERT INTO inventory_adjustments (item_id, direction, quantity, reason)
     VALUES ($1, 'out', $2, $3)`,
    [itemId, qty, reason]
  );
}


export default {
  create,
  getAll,
  getById,
  update,
  remove,
  adjustQuantity,
  findByName,
  findByNameExcludingId,
  deductInventory,
  logInventoryAdjustment,
};

