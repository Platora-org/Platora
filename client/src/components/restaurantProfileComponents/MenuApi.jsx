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
  listMenu: async () => {
    const res = await axiosInstance.get("/restaurants/menuItems");
    return res.data;
  },

  createMenuItem: async (payload) => {
    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== null && payload[key] !== undefined) {
        formData.append(key, payload[key]);
      }
    });
    const res = await axiosInstance.post("/restaurants/menuItems", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  updateMenuItem: async (id, payload) => {
    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== null && payload[key] !== undefined) {
        formData.append(key, payload[key]);
      }
    });
    const res = await axiosInstance.put(`/restaurants/menuItems/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteMenuItem: async (id) => {
    await axiosInstance.delete(`/restaurants/menuItems/${id}`);
    return true;
  },
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
    const res = await axiosInstance.get(`api/recipes/${menuItemId}`);
    return res.data;
  },

  async saveRecipe(menuItemId, ingredients) {
    const res = await axiosInstance.post(`api/recipes/${menuItemId}`, { ingredients });
    return res.data;
  },
};