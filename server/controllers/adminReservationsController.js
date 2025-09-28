// server/controllers/adminReservations.controller.js
import {
  fetchAdminReservations,
  approveCancelAndRefund,
  declineCancelRequest,
  markRefundedOnly,
} from "../models/adminReservationsModel.js";

const adminReservationsController = {
/** GET /api/admin/reservations */
 async  listAllReservations(req, res) {
  try {
    const { q, status, from, to } = req.query || {};
    const rows = await fetchAdminReservations({ q, status, from, to });
    res.json({ reservations: rows });
  } catch (e) {
    console.error("listAllReservations error:", e);
    res.status(500).json({ message: "Failed to load reservations" });
  }
},

/** POST /api/admin/reservations/:id/cancel/approve */
 async  approveCancellation(req, res) {
  try {
    const id = Number(req.params.id);
    const adminId = req.user?.id;

    const row = await approveCancelAndRefund({ id, adminId });
    res.json({ ok: true, reservation: row, message: "Cancellation approved & refunded" });
  } catch (e) {
    console.error("approveCancellation error:", e);
    res.status(e.statusCode || 500).json({ message: e.message || "Approve failed" });
  }
},

/** POST /api/admin/reservations/:id/cancel/decline */
 async  declineCancellation(req, res) {
  try {
    const id = Number(req.params.id);
    const adminId = req.user?.id;
    const { reason } = req.body || {};

    const row = await declineCancelRequest({ id, adminId, reason });
    res.json({ ok: true, reservation: row, message: "Cancellation declined" });
  } catch (e) {
    console.error("declineCancellation error:", e);
    res.status(e.statusCode || 500).json({ message: e.message || "Decline failed" });
  }
},

/** POST /api/admin/reservations/:id/refund (legacy button) */
 async  markRefunded(req, res) {
  try {
    const id = Number(req.params.id);
    const adminId = req.user?.id;

    const row = await markRefundedOnly({ id, adminId });
    res.json({ ok: true, reservation: row, message: "Marked refunded" });
  } catch (e) {
    console.error("markRefunded error:", e);
    res.status(e.statusCode || 500).json({ message: e.message || "Refund failed" });
  }
}};

export default adminReservationsController;