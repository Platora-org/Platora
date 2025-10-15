import { computeProductionPlan } from "../services/productionService.js";
import * as PlateModel from "../models/plateModel.js";
import { createOrder, fetchCustomerOrders, createOrderDeliveryDetails, updateOrderTypeToDelivery } from "../models/orderModel.js";
import * as restaurantOrderModel from "../models/restaurantOrderModel.js";
import pool from "../config/db.js";

export async function checkProductionController(req, res) {
  try {
    // ensure your auth middleware sets req.user.customer_profile_id
    const userId = req.user.id;
    console.log("did i get it right?", userId);
    const customerProfileId = await PlateModel.getCustomerId(userId);
    console.log("did i get it finally??????", customerProfileId);
    if (!customerProfileId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing customer profile id" });
    }
    const result = await computeProductionPlan(customerProfileId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function checkoutOrder(req, res) {
  try {
    const userId = req.user?.id || null;
    console.log("Users id ------------------", req.user);
    const customerId = await PlateModel.getCustomerId(userId);
    const cartId = await PlateModel.getOrCreateCartId(customerId);

    //  Create the main order (always)
    const order = await createOrder(customerId, cartId);
    const orderId = order.id;

    //  Get delivery info from frontend
    const { orderType, phoneNumber, address } = req.body;

    //  If delivery type, update order + add delivery details
    if (orderType === "delivery") {
      if (!phoneNumber || !address) {
        return res.status(400).json({
          success: false,
          message: "Phone number and address required for delivery orders",
        });
      }

      // Update order type and insert delivery info
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await updateOrderTypeToDelivery(client, orderId);
        await createOrderDeliveryDetails(client, orderId, address, phoneNumber);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Delivery insert error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to add delivery details",
        });
      } finally {
        client.release();
      }
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ success: false, message: "Checkout failed" });
  }
}


export async function getCustomerOrders(req, res) {
  try {
    const userId = req.user?.id || null;
    const customerId = await PlateModel.getCustomerId(userId); 
    const orders = await fetchCustomerOrders(customerId);
    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
}

export async function cancelRestaurantSuborderController(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    // get customer_profile id (your existing helper)
    const customerId = await PlateModel.getCustomerId(userId);
    if (!customerId) {
      return res.status(400).json({ success: false, message: "Missing customer profile" });
    }

    const { restaurantOrderId } = req.params;
    if (!restaurantOrderId) return res.status(400).json({ success: false, message: "Missing restaurantOrderId" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await restaurantOrderModel.cancelRestaurantOrderByCustomer(restaurantOrderId, customerId, client);

      if (!result.ok) {
        await client.query("ROLLBACK");
        const map = {
          not_found: "Restaurant order not found",
          not_owner: "You are not the owner of this order",
          not_pending: "Cannot cancel — order already being processed by restaurant"
        };
        return res.status(400).json({ success: false, message: map[result.reason] || "Unable to cancel" });
      }

      await client.query("COMMIT");
      return res.json({ success: true, restaurantOrder: result.restaurantOrder, order: result.order });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("cancelRestaurantSuborderController txn error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("cancelRestaurantSuborderController error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
