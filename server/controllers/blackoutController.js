import {
  listBlackouts as modelListBlackouts,
  upsertBlackout,
  deleteBlackout,

} from "../models/blackoutModel.js";



export async function listBlackouts(req, res) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from and to are required (YYYY-MM-DD)" });
    const blackouts = await modelListBlackouts(from, to);
    res.json({ blackouts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load blackouts" });
  }
}

export async function createBlackout(req, res) {
  try {
    const { date, full_day, slot_ids } = req.body;
    if (!date) return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });
    const id = await upsertBlackout({
      date,
      full_day: !!full_day,
      slot_ids: Array.isArray(slot_ids) ? slot_ids.map(Number).filter(Number.isFinite) : [],
    });
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create/update blackout" });
  }
}

export async function removeBlackout(req, res) {
  try {
    const { id } = req.params;
    await deleteBlackout(Number(id));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete blackout" });
  }
}
