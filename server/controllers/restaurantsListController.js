import { getAllRestaurants } from "../models/restaurantListModel.js";

export const fetchRestaurantList = async (req, res) => {
  try {
    const restaurantsList = await getAllRestaurants();
    res.status(200).json(restaurantsList);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}; 