import * as CategoriesModel from '../models/categoriesModel.js';


const categoriesController = {
  // GET /api/v1/categories
  async getCategories(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      console.log("These are them" ,req.user)
      const result = await CategoriesModel.getAll(restaurantId);

      res.json({ success: true, categories: result.rows });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
  },

  // POST /api/v1/categories
  async createCategory(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { name } = req.body;

      console.log("name:" + name)

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Category name is required' });
      }

      const existingCategory = await CategoriesModel.findByName(restaurantId, name);
      if (existingCategory.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Category with this name already exists' });
      }

      const result = await CategoriesModel.create(restaurantId, name);
      console.log(result.rows)
      res.status(201).json({ success: true, category: result.rows[0], message: 'Category created successfully' });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ success: false, message: 'Failed to create category' });
    }
  },

  // PUT /api/v1/categories/:id
  async updateCategory(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Category name is required' });
      }

      const existingCategory = await CategoriesModel.findById(id, restaurantId);
      if (existingCategory.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const duplicateCheck = await CategoriesModel.checkDuplicate(restaurantId, name, id);
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Category with this name already exists' });
      }

      const result = await CategoriesModel.update(id, restaurantId, name);
      res.json({ success: true, category: result.rows[0], message: 'Category updated successfully' });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ success: false, message: 'Failed to update category' });
    }
  },

  // DELETE /api/v1/categories/:id
  async deleteCategory(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;

      const existingCategory = await CategoriesModel.findById(id, restaurantId);
      if (existingCategory.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      await CategoriesModel.remove(id, restaurantId);
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
  }
};

export default categoriesController;
