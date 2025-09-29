import pool from "../config/db.js";

// Step 1: Move cart → orders + restaurant_orders + order_items
export async function createOrder(customerId, cartId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get cart items
    const cartRes = await client.query(
      `SELECT ci.id, ci.menu_item_id, ci.quantity, m.price, m.restaurant_id
       FROM cart_items ci
       JOIN menu_items m ON ci.menu_item_id = m.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );
    const items = cartRes.rows;
    console.log("cart items:",items);
    if (items.length === 0) throw new Error("Cart is empty");

    // 2. Create master order
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const orderRes = await client.query(
      "INSERT INTO orders (customer_id, total_amount) VALUES ($1,$2) RETURNING *",
      [customerId, total]
    );
    const order = orderRes.rows[0];

    // 3. Group items by restaurant
    const grouped = {};
    items.forEach(i => {
      if (!grouped[i.restaurant_id]) grouped[i.restaurant_id] = [];
      grouped[i.restaurant_id].push(i);
    });

    // 4. Insert restaurant_orders + order_items
    for (const [restaurantId, restItems] of Object.entries(grouped)) {
      const subtotal = restItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const restRes = await client.query(
        `INSERT INTO restaurant_orders (order_id, restaurant_id, subtotal)
         VALUES ($1,$2,$3) RETURNING *`,
        [order.id, restaurantId, subtotal]
      );
      const restOrder = restRes.rows[0];

      for (const item of restItems) {
        await client.query(
          `INSERT INTO order_items (restaurant_order_id, menu_item_id, quantity, price)
           VALUES ($1,$2,$3,$4)`,
          [restOrder.id, item.menu_item_id, item.quantity, item.price]
        );
      }
    }

    // 5. Clear cart (deleting cart will cascade delete cart_items)
    await client.query("DELETE FROM carts WHERE id=$1", [cartId]);

    await client.query("COMMIT");
    return order;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Step 2: Fetch orders grouped by restaurants
export async function fetchCustomerOrders(customerId) {
  const res = await pool.query(
    `SELECT o.id AS order_id, o.created_at, o.status AS order_status,
            ro.id AS rest_order_id, ro.status AS rest_status, r.restaurant_name AS restaurant_name,
            oi.quantity, oi.price, m.name AS menu_name
     FROM orders o
     JOIN restaurant_orders ro ON o.id = ro.order_id
     JOIN restaurant_profiles r ON ro.restaurant_id = r.id
     JOIN order_items oi ON ro.id = oi.restaurant_order_id
     JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE o.customer_id=$1
     ORDER BY o.created_at DESC`,
    [customerId]
  );

  // Group into structure like your FAKE_ORDERS
  const grouped = {};
  res.rows.forEach(row => {
    if (!grouped[row.order_id]) {
      grouped[row.order_id] = {
        orderId: row.order_id,
        createdAt: row.created_at,
        status: row.order_status,
        restaurants: []
      };
    }
    let rest = grouped[row.order_id].restaurants.find(r => r.restaurantName === row.restaurant_name);
    if (!rest) {
      rest = {
        restaurantOrderId: row.rest_order_id,
        restaurantName: row.restaurant_name,
        status: row.rest_status,
        items: []
      };
      grouped[row.order_id].restaurants.push(rest);
    }
    rest.items.push({
      name: row.menu_name,
      qty: row.quantity,
      price: row.price
    });
  });

  return Object.values(grouped);
}


