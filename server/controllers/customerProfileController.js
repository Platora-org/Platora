import { getCustomerById, updateCustomerById } from "../models/customerModel.js";

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

export const updateCustomerProfile = async (req, res) => {
  try {
    const customerId = req.user.id; // ✅ safer to use authenticated user, not client-supplied
    const { firstName, lastName, phone, dateOfBirth, gender } = req.body;

    const updatedCustomer = await updateCustomerById(customerId, {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
    });

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(updatedCustomer);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};
