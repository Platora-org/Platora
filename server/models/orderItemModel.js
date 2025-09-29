import pool from "../config/db.js";

export async function getRecipesForMenuItems(menuItemIds) {
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
 
export async function getOrderItemsWithMenu(restaurantOrderId) {
  const { rows } = await pool.query(
    `SELECT oi.id AS order_item_id,
            oi.restaurant_order_id,
            oi.quantity,
            m.id AS menu_item_id,
            m.name AS menu_item_name,
            m.price
     FROM order_items oi
     JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE oi.restaurant_order_id = $1`,
    [restaurantOrderId]
  );
  return rows;
}

