import { Router } from "express";

const router = Router();

import {
  getAvailableDates,
  getTimeSlotsForDate
} from "../controllers/availabilityController.js";

/**
 * GET /api/reservations/availability/dates?days=4
 * Returns the next N days (including today) excluding full-day blackouts.
 */

router.get("/dates", getAvailableDates);
router.get("/time-slots", getTimeSlotsForDate);

router.get("/dates", async (req, res) => {
  try {
    const days = Math.min(14, Math.max(1, Number(req.query.days || 4)));
    const today = new Date();
    today.setHours(0,0,0,0);

    const { rows } = await pool.query(
      `SELECT date::text AS date
         FROM reservation_blackouts
        WHERE full_day = true
          AND date >= CURRENT_DATE`
    );
    const fullDaySet = new Set(rows.map(r => r.date)); // already 'YYYY-MM-DD'

    const out = [];
    for (let i=0; i<days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0,10);
      if (!fullDaySet.has(iso)) {
        out.push({ date: iso, label: d.toDateString() });
      }
    }
    res.json({ dates: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load dates" });
  }
});

/**
 * GET /api/reservations/availability/time-slots?date=YYYY-MM-DD
 * Returns all master slots with disabled flags (past + blacked out).
 */
router.get("/time-slots", async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });

    const slotsRes = await pool.query(
      `SELECT id, label, sort_idx
         FROM reservation_time_slots
        ORDER BY sort_idx ASC`
    );
    const slots = slotsRes.rows;

    const blackoutRes = await pool.query(
      `SELECT id, full_day
         FROM reservation_blackouts
        WHERE date = $1
        LIMIT 1`, [date]
    );

    let fullDay = false;
    let blackoutSlotIds = new Set();

    if (blackoutRes.rows.length) {
      fullDay = !!blackoutRes.rows[0].full_day;
      if (!fullDay) {
        const bs = await pool.query(
          `SELECT slot_id
             FROM reservation_blackout_slots
            WHERE blackout_id = $1`,
          [blackoutRes.rows[0].id]
        );
        blackoutSlotIds = new Set(bs.rows.map(r => r.slot_id));
      }
    }

    const now = new Date();
    const isToday = date === now.toISOString().slice(0,10);

    const result = slots.map(s => {
      let disabled = false;

      if (fullDay) {
        disabled = true;
      } else if (blackoutSlotIds.has(s.id)) {
        disabled = true;
      } else if (isToday) {
        // Compare slot start time
        const [start] = s.label.split(" - ");       // "10:00 AM"
        const [t, ampm] = start.split(" ");
        let [hh, mm] = t.split(":").map(n => parseInt(n,10));
        if (ampm === "PM" && hh !== 12) hh += 12;
        if (ampm === "AM" && hh === 12) hh = 0;
        const slotDate = new Date(`${date}T00:00:00`);
        slotDate.setHours(hh, mm || 0, 0, 0);
        if (slotDate <= now) disabled = true;
      }

      return { id: s.id, label: s.label, disabled };
    });

    res.json({ slots: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load time slots" });
  }
});

export default router;
