// models/adjustmentsModel.js
import pool from "../config/db.js";

// in models/adjustmentsModel.js
async function create({ item_id, item_name, direction, quantity, reason = null }) {
  const q = `INSERT INTO inventory_adjustments (item_id, item_name, direction, quantity, reason)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`;
  return pool.query(q, [item_id, item_name, direction, quantity, reason]);
}

async function listForItem(item_id) {
  return pool.query(
    'SELECT id, item_id, item_name,direction, quantity, reason, created_at FROM inventory_adjustments WHERE item_id = $1 ORDER BY created_at DESC',
    [item_id]
  );
}

export default { create, listForItem };
