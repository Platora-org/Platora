// server/controllers/reservationController.js
import {
  getSlotByLabel,
  getSlotById,
  findSlotByLabelFuzzy,
  isDateFullDayBlackout,
  getBlackoutSlotIds,
  areTablesAvailable,
  createReservation,
  listReservationsByUserForListPage,
  getReservationByIdForUser,
  updateReservation,
  cancelReservation,
  setCancelRequested,
  getOccupiedTableIds,
  cancelIfEligible24h,
  
} from "../models/reservationModel.js";

const reservationController = {
  /* GET /api/reservations/time-slots  */
  async listTimeSlots(req, res) {
    try {
      const { rows } = await req.app.get("db").query(
        `SELECT id, label, sort_idx
           FROM reservation_time_slots
          ORDER BY sort_idx ASC, id ASC`
      );
      res.json({ slots: rows });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load time slots" });
    }
  },

  /* POST /api/reservations/check-availability */
  async checkAvailability(req, res) {
    try {
      const { date, slot_id, slot_label, table_ids = [] } = req.body || {};
      if (!date) return res.status(400).json({ message: "date is required" });
      if (!slot_id && !slot_label)
        return res.status(400).json({ message: "slot_id or slot_label is required" });

      let slot = null;
      if (slot_id) slot = await getSlotById(Number(slot_id));
      else {
        slot = await getSlotByLabel(String(slot_label));
        if (!slot) slot = await findSlotByLabelFuzzy(String(slot_label));
      }
      if (!slot) return res.status(400).json({ message: "Invalid time slot" });

      if (await isDateFullDayBlackout(date)) {
        return res.json({ available: false, reason: "full_day_blackout" });
      }
      const blockedSlots = await getBlackoutSlotIds(date);
      if (blockedSlots.includes(slot.id)) {
        return res.json({ available: false, reason: "slot_blackout" });
      }

      const ok = await areTablesAvailable({
        dateStr: date,
        slotId: slot.id,
        tableIds: table_ids.map(Number),
      });

      res.json({ available: ok });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Availability check failed" });
    }
  },

  /* POST /api/reservations */
  async createReservationHandler(req, res) {
    try {
      const userId = req.user.id;

      const { date, slot_id, time_label, guests, table_ids = [], special_request } = req.body || {};
      if (!date) return res.status(400).json({ message: "date is required" });
      if (!slot_id && !time_label)
        return res.status(400).json({ message: "slot_id or time_label is required" });
      if (!guests || guests <= 0) return res.status(400).json({ message: "guests is required" });
      if (!Array.isArray(table_ids) || table_ids.length === 0)
        return res.status(400).json({ message: "table_ids required" });

      // tolerant slot lookup
      let slot = null;
      if (slot_id) slot = await getSlotById(Number(slot_id));
      else {
        slot = await getSlotByLabel(String(time_label));
        if (!slot) slot = await findSlotByLabelFuzzy(String(time_label));
      }
      if (!slot) return res.status(400).json({ message: "Invalid time slot" });

      // blackout checks
      if (await isDateFullDayBlackout(date)) {
        return res.status(409).json({ message: "This date is closed (holiday)" });
      }
      const blockedSlots = await getBlackoutSlotIds(date);
      if (blockedSlots.includes(slot.id)) {
        return res.status(409).json({ message: "This time slot is closed" });
      }

      // conflict checks
      const ok = await areTablesAvailable({
        dateStr: date,
        slotId: slot.id,
        tableIds: table_ids.map(Number),
      });
      if (!ok) {
        return res.status(409).json({ message: "One or more selected tables are not available" });
      }

      const result = await createReservation({
        userId,
        dateStr: date,
        slotId: slot.id,
        guests: Number(guests),
        specialRequest: special_request,
        tableIds: table_ids.map(Number),
      });

      res.status(201).json({ id: result.id, reservation_uid: result.reservation_uid });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  },

  /* GET /api/reservations/mine */
  async listMyReservations(req, res) {
    try {
      const rows = await listReservationsByUserForListPage(req.user.id);
      res.json({ reservations: rows });
    } catch (e) {
      console.error("listMyReservations error:", e);
      res.status(500).json({ message: "Failed to load reservations" });
    }
  },

  /* POST /api/reservations/:id/request-cancel */
  async requestCancel(req, res) {
    try {
      const id = Number(req.params.id);
      const reason = req.body?.reason || "";
      await setCancelRequested({ id, userId: req.user.id, reason });
      res.json({ ok: true, message: "Cancellation request submitted" });
    } catch (e) {
      console.error(e);
      res.status(e.statusCode || 500).json({ message: e.message || "Request failed" });
    }
  },

  /* GET /api/reservations/:id */
  async getReservationHandler(req, res) {
    try {
      const id = Number(req.params.id);
      const row = await getReservationByIdForUser(id, req.user.id);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ reservation: row });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to get reservation" });
    }
  },

  /* PATCH /api/reservations/:id */
  async updateReservationHandler(req, res) {
    try {
      const id = Number(req.params.id);
      const { date, slot_id, time_label, guests, table_ids = [], special_request } = req.body || {};
      if (!date) return res.status(400).json({ message: "date is required" });
      if (!slot_id && !time_label)
        return res.status(400).json({ message: "slot_id or time_label is required" });
      if (!guests || guests <= 0) return res.status(400).json({ message: "guests is required" });
      if (!Array.isArray(table_ids) || table_ids.length === 0)
        return res.status(400).json({ message: "table_ids required" });

      let slot = null;
      if (slot_id) slot = await getSlotById(Number(slot_id));
      else {
        slot = await getSlotByLabel(String(time_label));
        if (!slot) slot = await findSlotByLabelFuzzy(String(time_label));
      }
      if (!slot) return res.status(400).json({ message: "Invalid time slot" });

      if (await isDateFullDayBlackout(date)) {
        return res.status(409).json({ message: "This date is closed (holiday)" });
      }
      const blockedSlots = await getBlackoutSlotIds(date);
      if (blockedSlots.includes(slot.id)) {
        return res.status(409).json({ message: "This time slot is closed" });
      }

      const ok = await areTablesAvailable({
        dateStr: date,
        slotId: slot.id,
        tableIds: table_ids.map(Number),
        ignoreReservationId: id,
      });
      if (!ok) {
        return res.status(409).json({ message: "One or more selected tables are not available" });
      }

      await updateReservation({
        id,
        userId: req.user.id,
        dateStr: date,
        slotId: slot.id,
        guests: Number(guests),
        specialRequest: special_request,
        tableIds: table_ids.map(Number),
      });

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      const code = e.statusCode || 500;
      res.status(code).json({ message: e.message || "Failed to update reservation" });
    }
  },

  /* DELETE /api/reservations/:id (cancel) */
  async cancelReservationHandler(req, res) {
    try {
      const id = Number(req.params.id);
      await cancelReservation(id, req.user.id);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      const code = e.statusCode || 500;
      res.status(code).json({ message: e.message || "Failed to cancel reservation" });
    }
  },

  /* POST /api/reservations/:id/cancel-now (24h rule) */
  async cancelNow(req, res) {
    try {
      const id = Number(req.params.id);
      const userId = req.user.id;
      const result = await cancelIfEligible24h({ id, userId });
      res.json({ ok: true, message: "Reservation cancelled", ...result });
    } catch (e) {
      console.error("cancelNow error:", e);
      res.status(e.statusCode || 500).json({ message: e.message || "Cancel failed" });
    }
  },

  /* GET /api/reservations/occupied?date=YYYY-MM-DD&slot_id=12 OR &time_label=... */
  async occupiedTables(req, res) {
    try {
      const { date, slot_id, time_label } = req.query || {};
      if (!date) return res.status(400).json({ message: "date is required" });
      if (!slot_id && !time_label)
        return res.status(400).json({ message: "slot_id or time_label is required" });

      let slot = null;
      if (slot_id) slot = await getSlotById(Number(slot_id));
      else {
        slot = await getSlotByLabel(String(time_label));
        if (!slot) slot = await findSlotByLabelFuzzy(String(time_label));
      }
      if (!slot) return res.status(400).json({ message: "Invalid time slot" });

      const ids = await getOccupiedTableIds({ dateStr: date, slotId: slot.id });
      res.json({ occupied: ids });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load occupied tables" });
    }
  },
};

export default reservationController;
