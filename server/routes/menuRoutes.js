// routes/menuRoutes.js
import express from "express";
import * as menuController from "../controllers/menuController.js";
import upload from "../middleware/uploadMiddleware.js";
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

// Menu Items
router.get("/",verifyJWT, checkRole('restaurant') , menuController.getMenuItems);

router.get("/:id",verifyJWT, checkRole('restaurant') , menuController.getMenuItemById);

router.post("/",verifyJWT, checkRole('restaurant') , upload.single("image"), menuController.createMenuItem);

router.put("/:id",verifyJWT, checkRole('restaurant') , upload.single("image"), menuController.updateMenuItem);

router.delete("/:id",verifyJWT, checkRole('restaurant') , menuController.deleteMenuItem);

export default router;