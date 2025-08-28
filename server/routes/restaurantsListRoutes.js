import express from 'express';
import { fetchRestaurantList } from '../controllers/restaurantsListController.js';

const router = express.Router();

router.get('/all', fetchRestaurantList);

export default router;