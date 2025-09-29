// server/models/adminReservationsModel.js
import pool from "../config/db.js";

const ELIGIBLE_SQL = `
  CASE
    WHEN r.status = 'cancelled'
     AND r.cancelled_at IS NOT NULL
     AND (r.reserved_date + COALESCE(ts.start_time, TIME '00:00'))
           - INTERVAL '24 hours' >= r.cancelled_at
    THEN TRUE ELSE FALSE
  END AS eligible_for_refund
`;

function buildWhere({ q, status, from, to }) {
  const where = [];
  const params = [];

  if (status && ["booked", "completed", "cancelled"].includes(status)) {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`r.reserved_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    where.push(`r.reserved_date <= $${params.length}`);
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`
      (
        LOWER(r.reservation_uid) LIKE $${params.length}
        OR LOWER(u.email) LIKE $${params.length}
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE $${params.length}
        OR EXISTS (
            SELECT 1
              FROM reservation_tables rt2
              JOIN food_court_table t2 ON t2.id = rt2.table_id
             WHERE rt2.reservation_id = r.id
               AND LOWER(t2.table_code) LIKE $${params.length}
        )
      )
    `);
  }

  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

export async function fetchAdminReservations(filters = {}) {
  const { sql, params } = buildWhere(filters);

  const q = `
    SELECT
      r.id,
      r.user_id,
      r.reserved_date::date AS reserved_date,
      r.slot_id,
      ts.label AS slot_label,
      ts.start_time,
      r.guests,
      r.special_request,
      r.status,
      r.created_at,
      r.updated_at,
      u.email AS customer_email,
      (u.first_name || ' ' || u.last_name) AS customer_name,

      COALESCE(
  JSON_AGG(JSON_BUILD_OBJECT('table_code', t.table_code))
     FILTER (WHERE t.id IS NOT NULL),
  '[]'::json
) AS tables


    FROM reservations r
    JOIN users u                  ON u.id = r.user_id
    JOIN reservation_time_slots ts ON ts.id = r.slot_id
    LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
    LEFT JOIN food_court_table t    ON t.id = rt.table_id
    ${sql}
    GROUP BY r.id, u.id, ts.id
    ORDER BY r.reserved_date DESC, r.id DESC
  `;

  const { rows } = await pool.query(q, params);
  return rows;
}

/* ---------- helpers for cancel/approve etc. ---------- */

async function getReservationWithEligibility(id) {
  const { rows } = await pool.query(
    `
      SELECT r.*,
             ts.start_time,
             ${ELIGIBLE_SQL}
        FROM reservations r
        JOIN reservation_time_slots ts ON ts.id = r.slot_id
       WHERE r.id = $1
       LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

export async function approveCancelAndRefund({ id, adminId }) {
  const row = await getReservationWithEligibility(id);
  if (!row) throw Object.assign(new Error("Reservation not found"), { statusCode: 404 });
  if (row.status !== "cancelled") throw Object.assign(new Error("Not cancelled"), { statusCode: 400 });
  if (row.cancel_status !== "requested") throw Object.assign(new Error("No pending request"), { statusCode: 400 });
  if (!row.eligible_for_refund) throw Object.assign(new Error("Not eligible for refund"), { statusCode: 400 });

  const { rows: upd } = await pool.query(
    `UPDATE reservations
        SET cancel_status = 'approved',
            cancel_decision_at = NOW(),
            cancel_decision_by = $2,
            refunded_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, adminId || null]
  );
  return upd[0];
}

export async function declineCancelRequest({ id, adminId, reason }) {
  const row = await getReservationWithEligibility(id);
  if (!row) throw Object.assign(new Error("Reservation not found"), { statusCode: 404 });
  if (row.status !== "cancelled") throw Object.assign(new Error("Not cancelled"), { statusCode: 400 });
  if (row.cancel_status !== "requested") throw Object.assign(new Error("No pending request"), { statusCode: 400 });

  const { rows: upd } = await pool.query(
    `UPDATE reservations
        SET cancel_status = 'rejected',
            cancel_reason = COALESCE($2, cancel_reason),
            cancel_decision_at = NOW(),
            cancel_decision_by = $3,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, reason || "Not eligible by policy", adminId || null]
  );
  return upd[0];
}

export async function markRefundedOnly({ id, adminId }) {
  const row = await getReservationWithEligibility(id);
  if (!row) throw Object.assign(new Error("Reservation not found"), { statusCode: 404 });
  if (row.status !== "cancelled") throw Object.assign(new Error("Not cancelled"), { statusCode: 400 });
  if (row.refunded_at) throw Object.assign(new Error("Already refunded"), { statusCode: 400 });

  const { rows: upd } = await pool.query(
    `UPDATE reservations
        SET refunded_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id]
  );
  return upd[0];
}
