// controllers/menuController.js
import * as menuModel from "../models/menuModel.js";

// Menu Items
export async function createMenuItem(req, res) {
  try {
     const  restaurant_id  = req.user.restaurantId
     let { category_id, name, description, price, is_active } = req.body;

    // Normalize category_id (convert "" → null, else parse as int)
    if (category_id === "" || category_id === undefined) {
      category_id = null;
    } else {
      category_id = parseInt(category_id, 10);
    }
    // Note: This assumes you are using middleware like multer for file uploads
    const image_url = req.file ? `/uploads/menu/${req.file.filename}` : null;



    const newItem = await menuModel.createMenuItem({
      restaurant_id,
      category_id,
      name,
      description,
      price,
      image_url,
      is_active: is_active ?? true,
    });

    res.status(201).json(newItem);
  } catch (err) {
    console.error("Error creating menu item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMenuItems(req, res) {
  try {
    
    const  restaurant_id  = req.user.restaurantId
   
    
    if (!restaurant_id) return res.status(400).json({ error: "restaurant_id required" });
   
    const items = await menuModel.getMenuItems(restaurant_id);
     console.log("=====================" ,items)
    res.json(items);
  } catch (err) {
    console.error("Error fetching menu items:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMenuItemById(req, res) {
  try {
    const { id } = req.params;
     const  restaurant_id  = req.user.restaurantId

    const item = await menuModel.getMenuItemById(id, restaurant_id);
    if (!item) return res.status(404).json({ error: "Menu item not found" });

    res.json(item);
  } catch (err) {
    console.error("Error fetching menu item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
     const  restaurant_id  = req.user.restaurantId
    let { category_id, name, description, price, is_active } = req.body;

    // Normalize category_id (convert "" → null, else parse as int)
    if (category_id === "" || category_id === undefined) {
      category_id = null;
    } else {
      category_id = parseInt(category_id, 10);
    }
    const image_url = req.file
  ? `/uploads/menu/${req.file.filename}`
  : req.body.image_url;

    const updatedItem = await menuModel.updateMenuItem(id, restaurant_id, {
      category_id,
      name,
      description,
      price,
      image_url,
      is_active,
    });

    if (!updatedItem) return res.status(404).json({ error: "Menu item not found" });

    res.json(updatedItem);
  } catch (err) {
    console.error("Error updating menu item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params;
     const  restaurant_id  = req.user.restaurantId

    const deletedItem = await menuModel.deleteMenuItem(id, restaurant_id);
    if (!deletedItem) return res.status(404).json({ error: "Menu item not found" });

    res.json({ message: "Menu item deleted successfully", deletedItem });
  } catch (err) {
    console.error("Error deleting menu item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
