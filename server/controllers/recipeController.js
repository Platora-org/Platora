import { recipeModel } from '../models/recipeModel.js';

export const recipeController = {
  async listRecipe(req, res) {
    try {
      const { menuItemId } = req.params;
      const recipe = await recipeModel.listByMenuItem(menuItemId);
      res.json(recipe);
    } catch (err) {
      console.error('Failed to list recipe:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async saveRecipe(req, res) {
    try {
      const { menuItemId } = req.params;
      const { ingredients } = req.body; // [{ inventory_id, quantity }]
      if (!ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'Ingredients required' });
      }

      await recipeModel.upsertRecipe(menuItemId, ingredients);
      res.json({ message: 'Recipe saved successfully' });
    } catch (err) {
      console.error('Failed to save recipe:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
