import pool from "../config/db.js";

export async function getRecipesWithInventoryForMenuItems(menuItemIds) {
  if (!menuItemIds || menuItemIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT r.menu_item_id,
            r.inventory_item_id,
            r.quantity_required,
            ii.quantity AS inventory_qty,
            ii.name AS inventory_name
     FROM recipes r
     JOIN inventory_items ii ON r.inventory_item_id = ii.id
     WHERE r.menu_item_id = ANY($1)`,
    [menuItemIds]
  );
  return rows;
}


