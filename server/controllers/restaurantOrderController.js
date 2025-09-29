import * as restaurantOrderModel from '../models/restaurantOrderModel.js';
import { getOrderItemsWithMenu } from "../models/orderItemModel.js";
import { getRecipesWithInventoryForMenuItems } from "../models/recipeModel.js";
import inventoryModel  from "../models/inventoryModel.js";
import { updateRestaurantOrderStatus } from "../models/restaurantOrderModel.js";
import pool from "../config/db.js";

const ALLOWED_STATUSES = ['pending','accepted','denied','rejected','preparing','ready','delivered'];

async function getOrders(req, res) {
  try {
    const { id } = req.user;
    const restaurantId = await restaurantOrderModel.getRestaurantId(id);
    const rows = await restaurantOrderModel.getRestaurantOrdersByRestaurant(restaurantId.restaurant_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function setStatus(req, res) {
  try {
    const { restaurantOrderId } = req.params;
    const { status } = req.body;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid or missing status' });
    }
    const updated = await restaurantOrderModel.updateRestaurantOrderStatus(restaurantOrderId, status);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function advanceStatus(req, res) {
  try {
    const { restaurantOrderId } = req.params;
    const updated = await restaurantOrderModel.advanceRestaurantOrderStatus(restaurantOrderId);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

async function updateOrderStatusController(req, res) {
  const client = await pool.connect();
  try {
    const { restaurantOrderId } = req.params;
    const { status } = req.body;

    await client.query("BEGIN");

    // If accepting, deduct inventory
    if (status === "accepted") {
      const orderItems = await getOrderItemsWithMenu(restaurantOrderId);
      console.log("orderItems:",orderItems);
      const menuItemIds = orderItems.map((oi) => oi.menu_item_id);

      const recipes = await getRecipesWithInventoryForMenuItems(menuItemIds);
      console.log("recipes:",recipes)

      // map recipes { menu_item_id, inventory_item_id, quantity_required }
      for (const orderItem of orderItems) {
        const itemRecipes = recipes.filter(
          (r) => r.menu_item_id === orderItem.menu_item_id
        );

        for (const r of itemRecipes) {
          const totalRequired = r.quantity_required * orderItem.quantity;

          // Deduct inventory
          await inventoryModel.deductInventory(r.inventory_item_id, totalRequired, client);

          // Log adjustment
          await inventoryModel.logInventoryAdjustment(
            r.inventory_item_id,
            totalRequired,
            `Order ${restaurantOrderId} accepted, menu item ${orderItem.menu_item_name}`,
            client
          );
        }
      }
    }

    // Update restaurant_order status
    const updatedOrder = await updateRestaurantOrderStatus(restaurantOrderId, status, client);

    await client.query("COMMIT");

    res.json({ status: updatedOrder.status });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating order:", err);
    res.status(500).json({ error: "Failed to update order" });
  } finally {
    client.release();
  }
}

export default {
  getOrders,
  setStatus,
  advanceStatus,
  updateOrderStatusController,
};
