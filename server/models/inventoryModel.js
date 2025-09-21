// models/inventoryModel.js
import pool from "../config/db.js";

const columns = `id, name, unit, quantity, reorder_level, created_at, updated_at`;

async function create({ name, unit, quantity = 0, reorder_level = 0 }) {
  const q = `INSERT INTO inventory_items (name, unit, quantity, reorder_level)
             VALUES ($1,$2,$3,$4) RETURNING *`;
  return pool.query(q, [name, unit, quantity, reorder_level]);
}

async function getAll() {
  const q = `SELECT ${columns} FROM inventory_items ORDER BY created_at DESC`;
  return pool.query(q);
}

async function getById(id) {
  const q = `SELECT ${columns} FROM inventory_items WHERE id = $1`;
  return pool.query(q, [id]);
}

async function update(id, { name, unit, quantity, reorder_level }) {
  const q = `UPDATE inventory_items
             SET name = $1, unit = $2, quantity = $3, reorder_level = $4, updated_at = now()
             WHERE id = $5 RETURNING *`;
  return pool.query(q, [name, unit, quantity, reorder_level, id]);
}

async function remove(id) {
  return pool.query('DELETE FROM inventory_items WHERE id = $1 RETURNING *', [id]);
}

async function findByName(name) {
  const q = `SELECT ${columns} FROM inventory_items WHERE LOWER(name) = LOWER($1)`;
  return pool.query(q, [name]);
}

async function findByNameExcludingId(name, id) {
    return pool.query(
        `SELECT * FROM inventory_items 
         WHERE LOWER(name) = LOWER($1) AND id <> $2`,
        [name, id]
    );
}

async function adjustQuantity(id, adjustment) {
  const q = `UPDATE inventory_items
             SET quantity = GREATEST(0, quantity + $1), updated_at = now()
             WHERE id = $2 RETURNING *`;
  return pool.query(q, [adjustment, id]);
}

export default { create, getAll, getById, update, remove, adjustQuantity, findByName, findByNameExcludingId };
