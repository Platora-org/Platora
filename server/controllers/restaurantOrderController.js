import * as restaurantOrderModel from "../models/restaurantOrderModel.js";
import { getOrderItemsWithMenu } from "../models/orderItemModel.js";
import { getRecipesWithInventoryForMenuItems } from "../models/recipeModel.js";
import inventoryModel from "../models/inventoryModel.js";
import { updateRestaurantOrderStatus } from "../models/restaurantOrderModel.js";
import { assignDeliveryAgent } from "../controllers/deliveryController.js";
import pool from "../config/db.js";

const ALLOWED_STATUSES = [
  "pending",
  "accepted",
  "denied",
  "rejected",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivering",
  "delivered",
  "completed",
];

async function getOrders(req, res) {
  try {
    const { id } = req.user;
    const restaurantId = await restaurantOrderModel.getRestaurantId(id);
    const orders = await restaurantOrderModel.getRestaurantOrdersByRestaurant(
      restaurantId.restaurant_id
    );
    
    console.log(`📋 Fetching delivery details for ${orders.length} orders`);
    
    // For each order, fetch delivery details if it exists
    const ordersWithDelivery = await Promise.all(
      orders.map(async (order) => {
        try {
          // Get the main order_id from restaurant_orders
          const orderIdResult = await pool.query(
            'SELECT order_id FROM restaurant_orders WHERE id = $1',
            [order.id]
          );
          
          if (orderIdResult.rows.length > 0) {
            const mainOrderId = orderIdResult.rows[0].order_id;
            
            // Get delivery info with proper join through deliveryagent table
            const deliveryResult = await pool.query(`
              SELECT 
                d.id as delivery_id,
                d.delivery_agent_id,
                d.status as delivery_status,
                da.user_id,
                u.first_name,
                u.last_name,
                u.phone
              FROM deliveries d
              JOIN deliveryagent da ON d.delivery_agent_id = da.id
              JOIN users u ON da.user_id = u.id
              WHERE d.order_id = $1
              ORDER BY d.created_at DESC
              LIMIT 1
            `, [mainOrderId]);
            
            if (deliveryResult.rows.length > 0) {
              const delivery = deliveryResult.rows[0];
              console.log(`✅ Delivery agent found: ${delivery.first_name} ${delivery.last_name} (deliveryagent.id: ${delivery.delivery_agent_id}, user.id: ${delivery.user_id})`);
              
              return {
                ...order,
                delivery: {
                  agentName: `${delivery.first_name} ${delivery.last_name}`,
                  agentPhone: delivery.phone,
                  deliveryStatus: delivery.delivery_status
                }
              };
            }
          }
        } catch (err) {
          console.error(`❌ Error fetching delivery for order ${order.id}:`, err.message);
        }
        
        return order;
      })
    );
    
    console.log(`📤 Returning ${ordersWithDelivery.length} orders`);
    res.json(ordersWithDelivery);
  } catch (err) {
    console.error('❌ Error in getOrders:', err);
    res.status(500).json({ error: "Server error" });
  }
}

async function setStatus(req, res) {
  try {
    const { restaurantOrderId } = req.params;
    const { status } = req.body;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid or missing status" });
    }
    const updated = await restaurantOrderModel.updateRestaurantOrderStatus(
      restaurantOrderId,
      status
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

async function advanceStatus(req, res) {
  try {
    const { restaurantOrderId } = req.params;
    const updated = await restaurantOrderModel.advanceRestaurantOrderStatus(
      restaurantOrderId
    );
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
    console.log("=".repeat(80));
    console.log("📝 UPDATE ORDER STATUS CALLED");
    console.log("Restaurant Order ID:", restaurantOrderId);
    console.log("Requested Status:", req.body.status);
    console.log("=".repeat(80));
    
    const { status } = req.body;
    const restaurantId = req.user.restaurantId;

    await client.query("BEGIN");

    // If accepting, deduct inventory
    if (status === "accepted") {
      console.log("🔍 Processing inventory deduction for accepted order...");
      const orderItems = await getOrderItemsWithMenu(restaurantOrderId);
      console.log("orderItems:", orderItems);
      const menuItemIds = orderItems.map((oi) => oi.menu_item_id);

      const recipes = await getRecipesWithInventoryForMenuItems(menuItemIds);
      console.log("recipes:", recipes);

      // map recipes { menu_item_id, inventory_item_id, quantity_required }
      for (const orderItem of orderItems) {
        const itemRecipes = recipes.filter(
          (r) => r.menu_item_id === orderItem.menu_item_id
        );

        for (const r of itemRecipes) {
          const totalRequired = r.quantity_required * orderItem.quantity;

          await inventoryModel.deductInventory(
            restaurantId,
            r.inventory_item_id,
            totalRequired,
            client
          );

          const itemName = await inventoryModel.getItemNameFromInventoryId(
            r.inventory_item_id,
            client
          );

          await inventoryModel.logInventoryAdjustment(
            restaurantId,
            r.inventory_item_id,
            itemName,
            totalRequired,
            `Order ${restaurantOrderId} accepted`,
            client
          );
        }
      }
    }

    // Update restaurant_order status
    console.log("💾 Updating order status in database...");
    const updatedOrder = await updateRestaurantOrderStatus(
      restaurantOrderId,
      status,
      client
    );
    console.log("✅ Order status updated:", updatedOrder);

    // 🚚 AUTO-ASSIGN DELIVERY AGENT when status becomes "ready" for delivery orders
    let deliveryInfo = null;
    if (status === "ready") {
      console.log("🚚 Status is READY - checking if delivery order...");
      
      // ✅ FIXED: Get the main order using the restaurant_order_id from restaurant_orders table
      const restaurantOrderResult = await client.query(
        "SELECT order_id FROM restaurant_orders WHERE id = $1",
        [restaurantOrderId]
      );
      
      console.log("📦 Restaurant order result:", restaurantOrderResult.rows);

      if (restaurantOrderResult.rows.length > 0) {
        const mainOrderId = restaurantOrderResult.rows[0].order_id;
        console.log("🔗 Main order ID:", mainOrderId);
        
        // Now get the order details from the orders table
        const orderResult = await client.query(
          "SELECT type FROM orders WHERE id = $1",
          [mainOrderId]
        );
        
        console.log("📦 Order details:", orderResult.rows);

        if (orderResult.rows.length > 0) {
          const orderType = orderResult.rows[0].type;
          console.log("📦 Order type:", orderType);
          
          if (orderType === "delivery") {
            try {
              console.log(`🚚 Order ${mainOrderId} is DELIVERY type - attempting to assign delivery agent...`);
              deliveryInfo = await assignDeliveryAgent(mainOrderId, client);
              console.log(`✅ ✅ ✅ Delivery agent assigned successfully:`, deliveryInfo);
            } catch (err) {
              console.error(`❌ ❌ ❌ Failed to assign delivery agent for order ${mainOrderId}:`, err.message);
              console.error("Full error:", err);
              // Don't fail the entire transaction if delivery assignment fails
              // Just log the error and continue
            }
          } else {
            console.log(`📦 Order ${mainOrderId} is ${orderType} type - skipping delivery assignment`);
          }
        } else {
          console.log(`⚠️ No order found with ID ${mainOrderId}`);
        }
      } else {
        console.log(`⚠️ No restaurant order found with ID ${restaurantOrderId}`);
      }
    } else {
      console.log(`⏭️ Status is ${status} (not ready) - skipping delivery assignment`);
    }

    await client.query("COMMIT");
    console.log("✅ Transaction committed successfully");

    const response = {
      status: updatedOrder.status
    };

    // Include delivery info if assigned (without OTP for restaurant)
    if (deliveryInfo) {
      console.log("📤 Including delivery info in response:", deliveryInfo);
      response.delivery = {
        agentName: deliveryInfo.agent.name,
        agentPhone: deliveryInfo.agent.phone
        // OTP removed - not needed for restaurant
      };
    }

    console.log("📤 Sending response:", response);
    console.log("=".repeat(80));
    res.json(response);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating order:", err);
    console.error("Error stack:", err.stack);
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