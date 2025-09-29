import { getCustomerById, updateCustomerById } from "../models/customerModel.js";
import { generateToken } from "../utils/jwt.js";

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
    const customerId = req.user.id; 
    const { firstName, lastName, phone, dateOfBirth, gender } = req.body;

    // 1. Update DB
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

    // 2. Generate fresh JWT with updated claims
    const newToken = generateToken(updatedCustomer);

    // 3. Reset cookie (overwrite old token)
    res.cookie("token", newToken, {
      httpOnly: true,
      secure: false,       // 🔒 set to true in production with HTTPS
      sameSite: "Lax",
      maxAge: 3 * 60 * 60 * 1000, // 3 hours
    });

    // 4. Send back updated user & message
    res.json({
      message: "Profile updated successfully",
      user: updatedCustomer,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

