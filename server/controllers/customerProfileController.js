import { getCustomerById } from "../models/customerModel.js";

export const fetchCustomerProfile = async (req, res) => {
  try {
    const customerId = req.query.id;
    const customer = await getCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
