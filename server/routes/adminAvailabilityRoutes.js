import { Router } from "express";

const router = Router();

import {
  listBlackouts,
  createBlackout,
  removeBlackout,
} from "../controllers/blackoutController.js";


router.get("/blackouts", listBlackouts);
router.post("/blackouts", createBlackout);
router.delete("/blackouts/:id", removeBlackout);
/**
 * POST /api/admin/availability/blackouts
 * body: { date: 'YYYY-MM-DD', full_day: boolean, slot_ids?: number[] }
 * Upsert blackout for date; replace its slots when partial-day.
 */
router.post("/blackouts", async (req, res) => {
  const { date, full_day, slot_ids = [] } = req.body || {};
  if (!date) return res.status(400).json({ message: "date is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert blackout row (unique on date)
    const upsert = await client.query(
      `INSERT INTO reservation_blackouts (date, full_day)
       VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET full_day = EXCLUDED.full_day
       RETURNING id`,
      [date, !!full_day]
    );
    const blackoutId = upsert.rows[0].id;

    // Replace slot rows
    await client.query(
      `DELETE FROM reservation_blackout_slots WHERE blackout_id = $1`,
      [blackoutId]
    );

    if (!full_day && Array.isArray(slot_ids) && slot_ids.length) {
      // Build multi-values insert safely
      const values = [];
      const params = [];
      let p = 1;
      for (const sid of slot_ids) {
        params.push(`($${p++}, $${p++})`);
        values.push(blackoutId, sid);
      }
      const sql = `
        INSERT INTO reservation_blackout_slots (blackout_id, slot_id)
        VALUES ${params.join(",")}
        ON CONFLICT (blackout_id, slot_id) DO NOTHING
      `;
      await client.query(sql, values);
    }

    await client.query("COMMIT");
    res.json({ ok: true, blackout_id: blackoutId });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ message: "Failed to save blackout" });
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/availability/blackouts?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get("/blackouts", async (req, res) => {
  const from = req.query.from || new Date().toISOString().slice(0,10);
  const to   = req.query.to   || new Date(Date.now() + 14*24*60*60*1000).toISOString().slice(0,10);

  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.date::text AS date, b.full_day, s.slot_id
         FROM reservation_blackouts b
         LEFT JOIN reservation_blackout_slots s ON s.blackout_id = b.id
        WHERE b.date BETWEEN $1 AND $2
        ORDER BY b.date ASC`,
      [from, to]
    );

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.id)) {
        map.set(r.id, { id: r.id, date: r.date, full_day: r.full_day, slot_ids: [] });
      }
      if (r.slot_id) map.get(r.id).slot_ids.push(r.slot_id);
    }
    res.json({ blackouts: [...map.values()] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to list blackouts" });
  }
});

export default router;
