import { verifyToken } from '../utils/jwt.js';

export default function verifyJWT(req, res, next) {
  const token = req.cookies.token;
  
  console.log('JWT Verification - Token:', token ? 'Present' : 'Missing');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized - No token provided' 
    });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    console.log('JWT Verification - User:', user);
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err);
    return res.status(403).json({ 
      success: false,
      error: 'Invalid token',
      details: err.message 
    });
  }
}