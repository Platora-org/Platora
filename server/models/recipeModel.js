import pool from '../config/db.js';

export const recipeModel = {
  async listByMenuItem(menuItemId) {
    const res = await pool.query(
      `SELECT r.id, r.inventory_item_id, r.quantity_required, i.name, i.unit
       FROM recipes r
       JOIN inventory_items i ON i.id = r.inventory_item_id
       WHERE r.menu_item_id = $1
       ORDER BY r.id`,
      [menuItemId]
    );
    return res.rows;
  },

  async upsertRecipe(menuItemId, ingredients) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing ingredients for menu item
      await client.query('DELETE FROM recipes WHERE menu_item_id = $1', [menuItemId]);

      // Insert new ingredients
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO recipes (menu_item_id, inventory_item_id, quantity_required)
           VALUES ($1, $2, $3)`,
          [menuItemId, ing.inventory_id, ing.quantity]
        );
      }

      await client.query('COMMIT');
      return { message: 'Recipe saved successfully' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
