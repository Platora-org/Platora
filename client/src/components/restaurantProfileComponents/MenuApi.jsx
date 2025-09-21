import axiosInstance from '../../utils/axiosInstance';

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
    const res = await axiosInstance.get('/restaurants/inventory/');
    // returns array of items (as used by StoreOperations)
    return res.data;
  },
  async createInventoryItem(payload) {
    // payload shape from InventoryItemModal: { name, unit, quantity, reorder_level }
    const res = await axiosInstance.post('/restaurants/inventory/', payload);
    return res.data;
  },
  async updateInventoryItem(id, payload) {
    const res = await axiosInstance.put(`/restaurants/inventory/${id}`, payload);
    return res.data;
  },
   async deleteInventoryItem(id) {
    return axiosInstance.delete(`/restaurants/inventory/${id}`);
  },
  async adjustInventory(id, payload) {
    // payload: { direction: 'in'|'out', quantity, reason? }
    return axiosInstance.patch(`/restaurants/inventory/${id}/adjust`, payload);
  },
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