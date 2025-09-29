import * as PlateModel from "../models/plateModel.js";

const plateController = {
  async getCart(req, res) {
    try {

      const userId = req.user?.id || null;
      const customerId = await PlateModel.getCustomerId(userId);

      const cart = await PlateModel.getOrCreateCartId(customerId);
      const items = await PlateModel.getItems(cart);

      console.log(items)
      res.json({ cartId: cart, items });
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ success: false, message: "Failed to fetch item" });
    }
  },

  async addToCart(req, res){
    try {
      const { menuItemId, quantity } = req.body;
      const userId = req.user?.id || null;
      console.log("USER ID OF THE CUSTOMER ======",userId);
      const customerId = await PlateModel.getCustomerId(userId);
      console.log("CUSTOMR ID OF THE CUSTOMER ======",customerId);

      const cart = await PlateModel.getOrCreateCartId(customerId);
      console.log("cart-------------------->",cart)
      const item = await PlateModel.addItems(cart, menuItemId, quantity);

      res.json({ success: true, item });
    } catch (error) {
      console.error("Error adding items: ",error);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  },

  async updateItem(req, res) {
    try {
      const { cartItemId, quantity } = req.body;
      const updated = await PlateModel.updateItem(cartItemId, quantity);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update cart item" });
    }
  },

  async removeItem(req, res) {
    try {
      const { cartItemId } = req.params;
      console.log("PRINTING REQ.PARAM ------",req.params);
      await PlateModel.removeItem(cartItemId);
      res.json({ message: "Item removed" });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove item" });
    }
  }
};

export default plateController;
