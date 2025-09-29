
import pool  from "../config/db.js";

/** Get set of YYYY-MM-DD strings for full-day blackouts >= today */
export async function getUpcomingFullDayBlackouts() {
  const { rows } = await pool.query(
    `SELECT date::text AS date
       FROM reservation_blackouts
      WHERE full_day = true
        AND date >= CURRENT_DATE`
  );
  return new Set(rows.map(r => r.date));
}

/** Get blackout row for a specific date */
export async function getBlackoutByDate(date) {
  const { rows } = await pool.query(
    `SELECT id, full_day
       FROM reservation_blackouts
      WHERE date = $1
      LIMIT 1`,
    [date]
  );
  return rows[0] || null;
}

/** Get slot_ids for a blackout id (partial day) */
export async function getBlackoutSlotIds(blackoutId) {
  const { rows } = await pool.query(
    `SELECT slot_id
       FROM reservation_blackout_slots
      WHERE blackout_id = $1`,
    [blackoutId]
  );
  return rows.map(r => r.slot_id);
}

/** Upsert blackout for date and set slot_ids if partial-day */
export async function upsertBlackout({ date, full_day, slot_ids = [] }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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

    if (!full_day && slot_ids.length) {
      // Build VALUES list ($1,$2),($3,$4)...
      const params = [];
      const values = [];
      let idx = 1;
      for (const sid of slot_ids) {
        params.push(`($${idx++}, $${idx++})`);
        values.push(blackoutId, sid);
      }
      await client.query(
        `INSERT INTO reservation_blackout_slots (blackout_id, slot_id)
         VALUES ${params.join(",")}
         ON CONFLICT (blackout_id, slot_id) DO NOTHING`,
        values
      );
    }

    await client.query("COMMIT");
    return blackoutId;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** List blackouts within range (inclusive) with collected slot_ids */
export async function listBlackouts(from, to) {
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
  return [...map.values()];
}

export async function deleteBlackout(id) {
  await pool.query(`DELETE FROM reservation_blackouts WHERE id = $1`, [id]);
}
