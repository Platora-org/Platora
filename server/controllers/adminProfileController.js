import { getDeliveryAgents } from "../models/deliveryAgentModel.js";

export const fetchDeliveryAgents = async (req, res) => {
  try {
    const deliveryAgent = await getDeliveryAgents();

    if (!deliveryAgent) {
      return res.status(404).json({ message: "Failed to return Delivery Agents" });
    }

    res.json(deliveryAgent);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};