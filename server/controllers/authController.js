import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';
import { findUserByEmail, createUser, createCustomerProfile, createRestaurantProfile } from '../models/userModel.js';

export const register = async (req, res) => {
    const { firstName, lastName, email, phone, password, role, restaurantName } = req.body;
    try {
        const existing = await findUserByEmail(email);
        if (existing) return res.status(400).json({ error: "Email already in use" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            provider: "local",
            role
        });

        if (role === "customer") {
            await createCustomerProfile(user.id);
            
        } else if (role === "restaurant") {
            await createRestaurantProfile(user.id, restaurantName || "");
        }

        const token = generateToken(user); // 3 hours
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 3 * 60 * 60 * 1000
        }).json({ message: "User registered", user: { id: user.id, email: user.email, role: user.role } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

export const login = (req, res, redirect = false) => {
  const token = generateToken(req.user);

  res.cookie('token', token, {
    httpOnly: true,
    secure: false, 
    sameSite: 'Lax',
    maxAge: 3 * 60 * 60 * 1000
  });

  // If query contains ?redirect=true, send redirect instead of JSON
  if (redirect) {
    return res.redirect('http://localhost:5173/');
  }

  // Default: JSON (local login flow)
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    }
  });
};




export const logout = (req, res) => {
    res.clearCookie('token').json({ message: 'Logged out' });
};

export const me = (req, res) => {
    res.json({ user: req.user });
};
