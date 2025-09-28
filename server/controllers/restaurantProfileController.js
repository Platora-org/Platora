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

export const uploadProfileImage = async (req, res) => {
  try {
    // The multer middleware attaches the file object to the request
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please select an image.' });
    }

    const userId = req.user.id;
    // Construct the URL to be saved in the database
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/restaurantprofile/${req.file.filename}`;

    const updatedProfile = await RestaurantModel.updateProfileImageUrl(userId, imageUrl);

    if (!updatedProfile) {
        return res.status(404).json({ message: 'Restaurant profile not found to update image.' });
    }

    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: updatedProfile.profile_image_url,
    });

  } catch (err) {
    console.error(err);
    // This can catch errors from the file filter (e.g., "Images Only!")
    res.status(500).json({ message: err.message || "Server error while uploading image" });
  }
};