import * as cartCountModel from "../models/cartCountModel.js";

export const getCartCount = async (req, res) => {
  try {
    const id = req.user.id; 
    console.log("here is the userId:::::",id);
    const cartId = await cartCountModel.getCartId(id);
    console.log("here is the cartId:::::---------",cartId);
    const totalItems = await cartCountModel.getCount(cartId);
    console.log("here is no of items:::::",totalItems)
    res.json({ totalItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get cart count" });
  }
};
