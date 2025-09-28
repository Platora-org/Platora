// server/routes/reservations.routes.js
import express from "express";
import verifyJWT from "../middleware/verifyToken.js";
import checkRole from "../middleware/requireRole.js";
import reservationController from "../controllers/reservationController.js";

const router = express.Router();

// ---- public-ish (still needs auth for your app) ----
router.get("/time-slots", verifyJWT, reservationController.listTimeSlots);
router.post("/check-availability", verifyJWT, checkRole("customer"), reservationController.checkAvailability);

// ---- customer actions ----
router.get("/mine", verifyJWT, checkRole("customer"), reservationController.listMyReservations);



// create / read / update / cancel
router.post("/", verifyJWT, checkRole("customer"), reservationController.createReservationHandler);
router.post("/:id/cancel", verifyJWT, checkRole("customer"), reservationController.cancelNow);
router.get("/:id", verifyJWT, checkRole("customer"), reservationController.getReservationHandler);
router.patch("/:id", verifyJWT, checkRole("customer"), reservationController.updateReservationHandler);
router.delete("/:id", verifyJWT, checkRole("customer"), reservationController.cancelReservationHandler);
router.get("/next-id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT nextval('reservations_id_seq') AS id");
    res.json({ id: rows[0].id });
  } catch (err) {
    console.error("next-id error:", err);
    res.status(500).json({ message: "Could not get next id" });
  }
});

export default router;
