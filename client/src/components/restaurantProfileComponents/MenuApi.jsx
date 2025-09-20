export const api = {
  async listCategories() {
    return [
      { id: "cat-1", name: "Mains" },
      { id: "cat-2", name: "Drinks" },
      { id: "cat-3", name: "Desserts" },
    ];
  },
  async createCategory(payload) {
    return { id: uuid(), ...payload };
  },
  async updateCategory(id, payload) {
    return { id, ...payload };
  },
  async deleteCategory(id) {
    return { ok: true, id };
  },
  async listMenu() {
    return [
      { id: "m-1", name: "Chicken Curry", description: "Spicy and creamy", price: 950, image_url: "", is_active: true, category_id: "cat-1" },
      { id: "m-2", name: "Iced Tea", description: "Refreshing", price: 350, image_url: "", is_active: true, category_id: "cat-2" },
    ];
  },
  async createMenuItem(payload) { return { id: uuid(), ...payload }; },
  async updateMenuItem(id, payload) { return { id, ...payload }; },
  async deleteMenuItem(id) { return { ok: true, id }; },
  async listInventory() {
    return [
      { id: "i-1", name: "Chicken", unit: "g", quantity: 1800, reorder_level: 2000 },
      { id: "i-2", name: "Rice", unit: "g", quantity: 10000, reorder_level: 5000 },
      { id: "i-3", name: "Curry Paste", unit: "g", quantity: 800, reorder_level: 1000 },
      { id: "i-4", name: "Tea Leaves", unit: "g", quantity: 300, reorder_level: 400 },
    ];
  },
  async createInventoryItem(payload) { return { id: uuid(), ...payload }; },
  async updateInventoryItem(id, payload) { return { id, ...payload }; },
  async deleteInventoryItem(id) { return { ok: true, id }; },
  async adjustInventory(id, { direction, quantity, reason }) { return { id, direction, quantity, reason }; },
  async listRecipe(menuItemId) {
    if (menuItemId === "m-1") {
      return [
        { inventory_id: "i-1", quantity: 250, unit: "g" },
        { inventory_id: "i-3", quantity: 50, unit: "g" },
        { inventory_id: "i-2", quantity: 200, unit: "g" },
      ];
    }
    return [];
  },
  async saveRecipe(menuItemId, ingredients) { return { menu_item_id: menuItemId, ingredients }; },
};