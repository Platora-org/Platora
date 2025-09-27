import { upsertBlackout, listBlackouts } from "../models/blackoutModel.js";

/** POST /api/admin/availability/blackouts */
export async function saveBlackout(req, res) {
  try {
    const { date, full_day, slot_ids = [] } = req.body || {};
    if (!date) return res.status(400).json({ message: "date is required" });

    const id = await upsertBlackout({ date, full_day, slot_ids });
    res.json({ ok: true, blackout_id: id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to save blackout" });
  }
}

/** GET /api/admin/availability/blackouts?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function getBlackouts(req, res) {
  try {
    const from = req.query.from || new Date().toISOString().slice(0,10);
    const to   = req.query.to   || new Date(Date.now() + 14*24*60*60*1000).toISOString().slice(0,10);
    const rows = await listBlackouts(from, to);
    res.json({ blackouts: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to list blackouts" });
  }
}
