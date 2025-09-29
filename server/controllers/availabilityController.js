import { getAllTimeSlots } from "../models/timeSlotModel.js";
import {
  getUpcomingFullDayBlackouts,
  getBlackoutByDate,
  getBlackoutSlotIds
} from "../models/blackoutModel.js";

/** GET /api/reservations/availability/dates?days=4 */
export async function getAvailableDates(req, res) {
  try {
    const days = Math.min(14, Math.max(1, Number(req.query.days || 4)));
    const today = new Date();
    today.setHours(0,0,0,0);

    const fullDaySet = await getUpcomingFullDayBlackouts();

    const out = [];
    for (let i=0; i<days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0,10);
      if (!fullDaySet.has(iso)) out.push({ date: iso, label: d.toDateString() });
    }
    res.json({ dates: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load dates" });
  }
}

/** GET /api/reservations/availability/time-slots?date=YYYY-MM-DD */
export async function getTimeSlotsForDate(req, res) {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });

    const slots = await getAllTimeSlots();

    const blackout = await getBlackoutByDate(date);
    let fullDay = false;
    let blackoutSlotIds = new Set();

    if (blackout) {
      fullDay = !!blackout.full_day;
      if (!fullDay) {
        const ids = await getBlackoutSlotIds(blackout.id);
        blackoutSlotIds = new Set(ids);
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
        const [start] = s.label.split(" - ");
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
}
