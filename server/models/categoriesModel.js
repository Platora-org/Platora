import pool from "../config/db.js";

// Get all categories for a restaurant
export async function getAll(restaurantId) {
  return pool.query(
    'SELECT id, name, created_at FROM menu_categories WHERE restaurant_id = $1 ORDER BY created_at DESC',
    [restaurantId]
  );
}

export async function findByName(restaurantId, name) {
  return pool.query(
    'SELECT id FROM menu_categories WHERE restaurant_id = $1 AND LOWER(name) = LOWER($2)',
    [restaurantId, name.trim()]
  );
}

export async function create(restaurantId, name) {
  return pool.query(
    'INSERT INTO menu_categories (restaurant_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
    [restaurantId, name.trim()]
  );
}

export async function findById(id, restaurantId) {
  return pool.query(
    'SELECT id FROM menu_categories WHERE id = $1 AND restaurant_id = $2',
    [id, restaurantId]
  );
}

export async function checkDuplicate(restaurantId, name, excludeId) {
  return pool.query(
    'SELECT id FROM menu_categories WHERE restaurant_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
    [restaurantId, name.trim(), excludeId]
  );
}

export async function update(id, restaurantId, name) {
  return pool.query(
    'UPDATE menu_categories SET name = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING id, name, created_at',
    [name.trim(), id, restaurantId]
  );
}

export async function remove(id, restaurantId) {
  return pool.query(
    'DELETE FROM menu_categories WHERE id = $1 AND restaurant_id = $2',
    [id, restaurantId]
  );
}
