// server/routes/adminReservations.routes.js
import express from "express";
import verifyJWT from "../middleware/verifyToken.js";
import checkRole from "../middleware/requireRole.js";
import adminReservationsController from "../controllers/adminReservationsController.js";



const router = express.Router();

router.get("/", verifyJWT, checkRole("admin"),adminReservationsController.listAllReservations);
router.post("/:id/cancel/approve", verifyJWT, checkRole("admin"), adminReservationsController.approveCancellation);
router.post("/:id/cancel/decline", verifyJWT, checkRole("admin"), adminReservationsController.declineCancellation);
router.post("/:id/refund", verifyJWT, checkRole("admin"), adminReservationsController.markRefunded);

export default router;
