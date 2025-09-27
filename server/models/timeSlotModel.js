import pool  from "../config/db.js";

export async function getAllTimeSlots() {
  const { rows } = await pool.query(
    `SELECT id, label, sort_idx
       FROM reservation_time_slots
      ORDER BY sort_idx ASC`
  );
  return rows;
}
