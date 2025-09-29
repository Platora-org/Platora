import pool from "../config/db.js";

//create a cart
export async function getOrCreateCartId(userId) {
  
    // Find cart for logged-in user
    const result = await pool.query('SELECT id FROM carts WHERE customer_id = $1 LIMIT 1', [userId]);
    if (result.rows.length > 0) {
        return result.rows[0].id;
    } else {
        // Create a new cart for the user
        const newCart = await pool.query('INSERT INTO carts (customer_id) VALUES ($1) RETURNING id', [userId]);
        return newCart.rows[0].id;
    }
}

//to get the customer_id
export async function getCustomerId(id) {
  const query =  await pool.query('SELECT id FROM customer_profiles WHERE user_id = $1',[id]);
    //console.log(query.rows);            
  return query.rows[0].id;
}

export async function getItems(cartId) {
    const query = `
      SELECT ci.id, ci.menu_item_id , ci.quantity, mi.name, mi.price, mi.image_url
      FROM cart_items ci
      JOIN menu_items mi ON ci.menu_item_id = mi.id
      WHERE ci.cart_id = $1;
    `;
    const result = await pool.query(query, [cartId]);
    return result.rows;
  }

//add items to the cart
export async function addItems(cartId, menuItemId, quantity) {
  const query = `
      INSERT INTO cart_items (cart_id, menu_item_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, menu_item_id)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
                    updated_at = NOW()
      RETURNING *;
    `;
    const result = await pool.query(query, [cartId, menuItemId, quantity]);

    return result.rows[0];
}

export async function updateItem(cartItemId, quantity) {
    const query = `
      UPDATE cart_items
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [quantity, cartItemId]);
    return result.rows[0];
}

export async function removeItem(cartItemId) {
    await pool.query(`DELETE FROM cart_items WHERE id = $1`, [cartItemId]);
    return { message: "Item removed" };
  }

export async function getCartItemsByCustomer(customerProfileId) {
  const { rows } = await pool.query(
    `SELECT ci.id AS cart_item_id, ci.quantity AS ordered_qty,
            mi.id AS menu_item_id, mi.name AS menu_name
     FROM carts c
     JOIN cart_items ci ON ci.cart_id = c.id
     JOIN menu_items mi ON mi.id = ci.menu_item_id
     WHERE c.customer_id = $1`,
    [customerProfileId]
  );
  console.log("all the cart items according the customerid====",rows);
  return rows;
}  

