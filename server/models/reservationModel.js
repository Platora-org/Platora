// server/models/reservationModel.js
import pool from "../config/db.js";

/* ------------------------- helpers ------------------------- */




export async function getSlotByLabel(label) {
  const { rows } = await pool.query(
    `SELECT id, label, sort_idx
       FROM reservation_time_slots
      WHERE label = $1`,
    [label]
  );
  return rows[0] || null;
}

export async function getSlotById(slotId) {
  const { rows } = await pool.query(
    `SELECT id, label, sort_idx
       FROM reservation_time_slots
      WHERE id = $1`,
    [slotId]
  );
  return rows[0] || null;
}

export async function isDateFullDayBlackout(dateStr) {
  const { rows } = await pool.query(
    `SELECT 1
       FROM reservation_blackouts
      WHERE date = $1
        AND full_day = TRUE
      LIMIT 1`,
    [dateStr]
  );
  return rows.length > 0;
}

export async function getBlackoutSlotIds(dateStr) {
  const { rows } = await pool.query(
    `SELECT s.slot_id
       FROM reservation_blackouts b
       JOIN reservation_blackout_slots s ON s.blackout_id = b.id
      WHERE b.date = $1`,
    [dateStr]
  );
  return rows.map((r) => r.slot_id);
}

/** True when every table is free (no conflicts) for given date/slot */
export async function areTablesAvailable({
  dateStr,
  slotId,
  tableIds,
  ignoreReservationId = null,
}) {
  if (!tableIds?.length) return true;

  const params = [dateStr, slotId];
  let q = `
    SELECT rt.table_id
      FROM reservation_tables rt
      JOIN reservations r ON r.id = rt.reservation_id
     WHERE rt.reserved_date = $1
       AND rt.slot_id = $2
       AND r.status IN ('booked','completed')
       AND rt.table_id = ANY($3)
  `;
  params.push(tableIds);

  if (ignoreReservationId) {
    q += ` AND rt.reservation_id <> $4`;
    params.push(ignoreReservationId);
  }

  const { rows } = await pool.query(q, params);
  return rows.length === 0; // no conflicts => available
}

/* ----------------------- create / read ---------------------- */

export async function createReservation({
  userId,
  dateStr,
  slotId,
  guests,
  specialRequest,
  tableIds,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");



    // Insert reservation header
    const ins = await client.query(
      `INSERT INTO reservations
        (user_id, reserved_date, slot_id, guests, special_request, status)
       VALUES ($1, $2, $3, $4, $5, 'booked')
       RETURNING id`,
      [userId, dateStr, slotId, guests, specialRequest || null]
    );
    const reservationId = ins.rows[0].id;

    // Insert booked tables
    if (Array.isArray(tableIds) && tableIds.length) {
      const values = [];
      const params = [];
      let p = 1;
      for (const tid of tableIds) {
        values.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
        params.push(reservationId, tid, dateStr, slotId);
      }
      await client.query(
        `INSERT INTO reservation_tables (reservation_id, table_id, reserved_date, slot_id)
         VALUES ${values.join(", ")}`,
        params
      );
    }

    await client.query("COMMIT");
    return { id: reservationId };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listReservationsByUser(userId) {
  const { rows } = await pool.query(
    `SELECT r.id,
            r.reservation_uid,
            r.reserved_date,
            ts.label AS time_label,
            r.guests,
            r.status,
            COALESCE(
              ARRAY_AGG(rt.table_id ORDER BY rt.table_id)
              FILTER (WHERE rt.table_id IS NOT NULL),
              '{}'
            ) AS table_ids
       FROM reservations r
  LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
  JOIN reservation_time_slots ts ON ts.id = r.slot_id
      WHERE r.user_id = $1
      GROUP BY r.id, ts.label
      ORDER BY r.reserved_date DESC, ts.sort_idx DESC, r.id DESC`,
    [userId]
  );
  return rows;
}

export async function listReservationsByUserForListPage(userId) {
  const { rows } = await pool.query(
    `SELECT
       r.id,
       r.reserved_date,
       r.guests,
       r.status,
       ts.label AS slot_label,
       ts.sort_idx,
       COALESCE(
         JSON_AGG(JSON_BUILD_OBJECT('table_code', t.table_code))
           FILTER (WHERE t.id IS NOT NULL),
         '[]'
       ) AS tables
     FROM reservations r
     JOIN reservation_time_slots ts  ON ts.id = r.slot_id
     LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
     LEFT JOIN food_court_table t    ON t.id = rt.table_id
     WHERE r.user_id = $1
     GROUP BY r.id, ts.label, ts.sort_idx
     ORDER BY r.reserved_date DESC, ts.sort_idx DESC, r.id DESC`,
    [userId]
  );
  return rows;
}

export async function getReservationByIdForUser(id, userId) {
  const { rows } = await pool.query(
    `SELECT r.id,
            r.reserved_date,
            r.slot_id,
            ts.label AS time_label,
            r.guests,
            r.special_request,
            r.status,
            COALESCE(
              ARRAY_AGG(rt.table_id ORDER BY rt.table_id)
              FILTER (WHERE rt.table_id IS NOT NULL),
              '{}'
            ) AS table_ids
       FROM reservations r
  LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
  JOIN reservation_time_slots ts ON ts.id = r.slot_id
      WHERE r.id = $1 AND r.user_id = $2
      GROUP BY r.id, ts.label`,
    [id, userId]
  );
  return rows[0] || null;
}

/* ----------------------- update / cancel -------------------- */

export async function updateReservation({
  id,
  userId,
  dateStr,
  slotId,
  guests,
  specialRequest,
  tableIds,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ensure ownership + editable status
    const { rows: owns } = await client.query(
      `SELECT status FROM reservations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (!owns.length) {
      throw Object.assign(new Error("Not found"), { statusCode: 404 });
    }
    if (owns[0].status === "cancelled") {
      throw Object.assign(new Error("Reservation is cancelled"), { statusCode: 409 });
    }

    await client.query(
      `UPDATE reservations
          SET reserved_date = $1,
              slot_id       = $2,
              guests        = $3,
              special_request = $4,
              updated_at    = now()
        WHERE id = $5`,
      [dateStr, slotId, guests, specialRequest || null, id]
    );

    // Replace booked tables
    await client.query(`DELETE FROM reservation_tables WHERE reservation_id = $1`, [id]);

    if (Array.isArray(tableIds) && tableIds.length) {
      const values = [];
      const params = [];
      let p = 1;
      for (const tid of tableIds) {
        values.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
        params.push(id, tid, dateStr, slotId);
      }
      await client.query(
        `INSERT INTO reservation_tables (reservation_id, table_id, reserved_date, slot_id)
         VALUES ${values.join(", ")}`,
        params
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelReservation(id, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rowCount } = await client.query(
      `UPDATE reservations
          SET status = 'cancelled',
              cancelled_at = NOW(),
              updated_at = now()
        WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (!rowCount) {
      throw Object.assign(new Error("Not found"), { statusCode: 404 });
    }

    // free tables
    await client.query(`DELETE FROM reservation_tables WHERE reservation_id = $1`, [id]);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/* ------------------- extra helpers for UI ------------------- */

// fuzzy slot finder (accepts labels with -, –, different spaces/cases)
export async function findSlotByLabelFuzzy(label) {
  const { rows } = await pool.query(
    `
    SELECT id, label, sort_idx
      FROM reservation_time_slots
     WHERE lower(replace(replace(label, '–','-'),' ','')) =
           lower(replace(replace($1,    '–','-'),' ','')) 
     LIMIT 1
    `,
    [label]
  );
  return rows[0] || null;
}

/** Return the set of table IDs already booked for date/slot */
export async function getOccupiedTableIds({ dateStr, slotId }) {
  const { rows } = await pool.query(
    `
    SELECT DISTINCT rt.table_id
      FROM reservation_tables rt
      JOIN reservations r ON r.id = rt.reservation_id
     WHERE rt.reserved_date = $1
       AND rt.slot_id       = $2
       AND r.status IN ('booked','completed')
    `,
    [dateStr, slotId]
  );
  return rows.map((r) => r.table_id);
}

/**  Move a booked reservation into "cancel requested" state  */
export async function setCancelRequested({ id, userId, reason = "" }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ensure the reservation exists and is owned by user
    const { rows } = await client.query(
      `SELECT id, user_id, status, cancel_status
         FROM reservations
        WHERE id = $1 AND user_id = $2
        FOR UPDATE`,
      [id, userId]
    );
    if (!rows.length) {
      const e = new Error("Reservation not found");
      e.statusCode = 404;
      throw e;
    }
    const r = rows[0];
    if (r.status !== "booked") {
      const e = new Error("Only booked reservations can be cancelled");
      e.statusCode = 400;
      throw e;
    }
    if (r.cancel_status === "requested") {
      const e = new Error("Cancellation already requested");
      e.statusCode = 400;
      throw e;
    }

    // Flip to cancelled immediately; mark as pending admin decision for refund.
    await client.query(
      `UPDATE reservations
          SET status              = 'cancelled',
              cancel_status       = 'requested',
              cancel_requested_at = NOW(),
              cancel_reason       = NULLIF($1,''),
              cancelled_at        = NOW(),
              updated_at          = NOW()
        WHERE id = $2`,
      [reason, id]
    );

    // Free tables so others can book this slot
    await client.query(`DELETE FROM reservation_tables WHERE reservation_id = $1`, [id]);

    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Get reserved_date (cast to DATE), start_time, status, user_id for a reservation. */
export async function getReservationStartInfo(id) {
  const { rows } = await pool.query(
    `
    SELECT r.id,
           r.user_id,
           r.reserved_date::date AS reserved_date,
           r.status,
           ts.start_time
      FROM reservations r
      JOIN reservation_time_slots ts ON ts.id = r.slot_id
     WHERE r.id = $1
     LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

/** Cancel if ≥ 24h before the reservation start. Frees tables when cancelled. */
export async function cancelIfEligible24h({ id, userId }) {
  const info = await getReservationStartInfo(id);
  if (!info) {
    const e = new Error("Reservation not found");
    e.statusCode = 404;
    throw e;
  }
  if (info.user_id !== userId) {
    const e = new Error("Not allowed");
    e.statusCode = 403;
    throw e;
  }
  if (info.status === "cancelled") {
    const e = new Error("Already cancelled");
    e.statusCode = 400;
    throw e;
  }
  if (!info.start_time) {
    const e = new Error("Start time not configured for this slot");
    e.statusCode = 500;
    throw e;
  }

  // Build JS Date from reserved_date + start_time
  const [h, m] = String(info.start_time).split(":").map(Number);
  const start = new Date(`${info.reserved_date}T00:00:00`);
  start.setHours(h || 0, m || 0, 0, 0);

  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  if (diffMs < twentyFourHoursMs) {
    const e = new Error("Too late to cancel (less than 24 hours before start).");
    e.statusCode = 409;
    throw e;
  }

  // Perform the cancellation and free tables
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE reservations
          SET status = 'cancelled',
              cancelled_at = NOW(),
              updated_at = NOW()
        WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    await client.query(`DELETE FROM reservation_tables WHERE reservation_id = $1`, [id]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return { cancelled: true, eligible: true };
}
