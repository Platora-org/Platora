import pool from "../config/db.js";

// Get no of items in the cart
export async function getCount(cartId) {
  const result = await pool.query(
    'SELECT COUNT(*) AS totalitems FROM cart_items WHERE cart_id = $1',
    [cartId]
  );
  console.log("this is the total no of item::--:: --",result.rows[0]);
  return Number(result.rows[0].totalitems); // note: lowercase returned column
}

//to get the cartId
export async function getCartId(userId) {
  const result = await pool.query(
    'SELECT c.id AS cart_id FROM users u LEFT JOIN customer_profiles cp ON cp.user_id = u.id LEFT JOIN carts c ON c.customer_id = cp.id WHERE u.id = $1',
    [userId]
  );
  return Number(result.rows[0].cart_id); // note: lowercase returned column
}

