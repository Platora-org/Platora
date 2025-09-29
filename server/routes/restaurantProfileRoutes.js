import express from 'express';
import * as controller from '../controllers/restaurantProfileController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';
import upload from "../middleware/uploadRestaurant.js";

const router = express.Router();

// GET /api/restaurant/profile/data - Fetch profile data
router.get('/data',verifyJWT, checkRole('restaurant'), controller.getRestaurantProfile);

// PUT /api/restaurant/profile/data - Update profile data
router.put('/data',verifyJWT, checkRole('restaurant'), controller.updateRestaurantProfile);

router.post('/image',verifyJWT, checkRole('restaurant'), upload.single('profileImage'), controller.uploadProfileImage);

export default router;