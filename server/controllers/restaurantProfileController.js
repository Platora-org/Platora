import * as RestaurantModel from "../models/restaurantModel.js";

/**
 * Fetches the profile for the logged-in restaurant user.
 */
export const getRestaurantProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from JWT payload
    const profile = await RestaurantModel.getRestaurantById(userId);

    if (!profile) {
      return res.status(404).json({ message: "Restaurant profile not found" });
    }

    res.status(200).json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching profile" });
  }
};

/**
 * Updates the profile for the logged-in restaurant user.
 */
export const updateRestaurantProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from JWT payload
    const dataToUpdate = req.body;

    const updatedProfile = await RestaurantModel.updateRestaurantProfile(
      userId,
      dataToUpdate
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedProfile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while updating profile" });
  }
};