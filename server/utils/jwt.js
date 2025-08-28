import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  console.log("this is the reference :" ,user);

  const firstName = user.restaurantProfile?.firstName || user.first_name || '';
  const lastName = user.restaurantProfile?.lastName || user.last_name || '';
  const email = user.restaurantProfile?.email || user.email || '';
  const role = user.role || (user.restaurantProfile?.role || '');
  const restaurantName = user.restaurantProfile?.restaurantName || '';

  // Add restaurantName only if role === 'restaurant' and it exists
  const payload = {
    id: user.id,
    role,
    firstName,
    lastName,
    email,
    restaurantName
  };

  if (role === 'restaurant' && user.restaurantProfile?.restaurantName) {
    payload.restaurantName = user.restaurantProfile.restaurantName;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
};


export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
