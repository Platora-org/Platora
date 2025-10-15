import pool from "../config/db.js";

export const getRestaurantOrdersByRestaurant = async (restaurantId) => {
  
  const q = `
    SELECT
      ro.id AS restaurant_order_id,
      ro.order_id,
      ro.status AS restaurant_status,
      ro.subtotal,
      ro.created_at AS restaurant_created_at,
      o.type AS type,            -- <-- added
      o.status AS parent_order_status, -- optional: if you want it
      oi.id AS order_item_id,
      oi.menu_item_id,
      oi.quantity,
      oi.price AS item_price,
      mi.name AS item_name
    FROM restaurant_orders ro
    JOIN orders o ON o.id = ro.order_id           
    JOIN order_items oi ON oi.restaurant_order_id = ro.id
    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE ro.restaurant_id = $1
    ORDER BY ro.created_at DESC, ro.id, oi.id;
  `;
  const res = await pool.query(q, [restaurantId]);

  const map = new Map();
  for (const row of res.rows) {
    const rid = row.restaurant_order_id;
    if (!map.has(rid)) {
      map.set(rid, {
        id: rid,
        order_id: row.order_id,
        status: row.restaurant_status,
        subtotal: Number(row.subtotal),
        created_at: row.restaurant_created_at,
        type: row.type || 'pickup', // <-- include type here
        items: [],
      });
    }
    map.get(rid).items.push({
      id: row.order_item_id,
      menu_item_id: row.menu_item_id,
      name: row.item_name || "Unknown Item",
      quantity: row.quantity,
      price: Number(row.item_price),
    });
  }

  return Array.from(map.values());
};


export async function updateRestaurantOrderStatus(restaurantOrderId, newStatus, client = pool) {
  const q = `
    UPDATE restaurant_orders
    SET status = $1
    WHERE id = $2
    RETURNING id, status, subtotal, order_id, created_at
  `;
  const res = await client.query(q, [newStatus, restaurantOrderId]);
  return res.rows[0];
}

const nextStatusMap = {
  accepted: "preparing",
  preparing: "ready",
  ready: "delivered", // delivered is the final expected status in your schema
};

export const advanceRestaurantOrderStatus = async (restaurantOrderId) => {
  const cur = await pool.query(
    `SELECT status FROM restaurant_orders WHERE id = $1`,
    [restaurantOrderId]
  );
  if (!cur.rows[0]) throw new Error("Restaurant order not found");
  const current = cur.rows[0].status;
  const next = nextStatusMap[current];
  if (!next) throw new Error(`No next status for "${current}"`);
  return await updateRestaurantOrderStatus(restaurantOrderId, next);
};

//get restaurantId using the userId
export const getRestaurantId = async (id) => {
  const result = await pool.query(
    `SELECT id AS restaurant_id
     FROM restaurant_profiles
     WHERE user_id = $1;`,
    [id]
  );
  return await result.rows[0];
};


export async function cancelRestaurantOrderByCustomer(restaurantOrderId, customerId, client = pool) {
  const db = client;
  // Lock the restaurant_order + parent order row to avoid races
  const q = `
    SELECT ro.id AS restaurant_order_id,
           ro.order_id,
           ro.status AS restaurant_status,
           ro.subtotal,
           o.customer_id,
           o.total_amount
    FROM restaurant_orders ro
    JOIN orders o ON ro.order_id = o.id
    WHERE ro.id = $1
    FOR UPDATE
  `;
  const res = await db.query(q, [restaurantOrderId]);
  if (res.rowCount === 0) return { ok: false, reason: "not_found" };

  const row = res.rows[0];
  // Ensure the customer owns this order
  if (Number(row.customer_id) !== Number(customerId)) {
    return { ok: false, reason: "not_owner" };
  }

  // Only pending restaurant_orders can be cancelled by customer
  if (row.restaurant_status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }

  // Mark the restaurant_order cancelled
  await db.query(`UPDATE restaurant_orders SET status = 'cancelled' WHERE id = $1`, [restaurantOrderId]);

  // Subtract subtotal from orders.total_amount (never go negative)
  await db.query(
    `UPDATE orders SET total_amount = GREATEST(total_amount - $1, 0) WHERE id = $2`,
    [row.subtotal, row.order_id]
  );

  // If *all* restaurant_orders for this order are cancelled, set orders.status = 'cancelled'
  const remaining = await db.query(
    `SELECT COUNT(*)::int AS not_cancelled
     FROM restaurant_orders
     WHERE order_id = $1 AND status != 'cancelled'`,
    [row.order_id]
  );
  const notCancelledCount = Number(remaining.rows[0].not_cancelled || 0);
  if (notCancelledCount === 0) {
    await db.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [row.order_id]);
  }

  // Return updated rows for response
  const updatedRO = await db.query(`SELECT * FROM restaurant_orders WHERE id = $1`, [restaurantOrderId]);
  const updatedOrder = await db.query(`SELECT * FROM orders WHERE id = $1`, [row.order_id]);

  return { ok: true, restaurantOrder: updatedRO.rows[0], order: updatedOrder.rows[0] };
}

