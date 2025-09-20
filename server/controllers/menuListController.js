import { getAllMenus } from "../models/menuListModel.js";

export const fetchMenuList = async (req, res) => {
  try {
    const id = req.params.id;
    const menu = await getAllMenus(id);

     if (!menu || menu.length === 0) {
      return res.status(404).json({ message: "No menu items found for this restaurant" });
    }

    res.json(menu);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } 
};