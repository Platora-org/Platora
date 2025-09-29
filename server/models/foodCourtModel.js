import  pool  from "../config/db.js";

/** List all active tables */
export async function getAllTables() {
  const { rows } = await pool.query(
    `SELECT id, table_code, capacity, price, pos_x, pos_y, active
       FROM food_court_table
      WHERE active = TRUE
      ORDER BY id ASC`
  );
  return rows;
}

/** Update one table's position */
export async function updateTablePosition(id, x, y) {
  const { rowCount } = await pool.query(
    `UPDATE food_court_table
        SET pos_x = $2, pos_y = $3, updated_at = NOW()
      WHERE id = $1`,
    [id, x, y]
  );
  return rowCount > 0;
}

/** Bulk update positions */
export async function bulkUpdatePositions(positions) {
  if (!Array.isArray(positions) || positions.length === 0) return;

  const ids = positions.map(p => Number(p.id));
  const xs  = positions.map(p => Number(p.x));
  const ys  = positions.map(p => Number(p.y));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      UPDATE food_court_table t
         SET pos_x = u.x, pos_y = u.y, updated_at = NOW()
        FROM (
          SELECT UNNEST($1::int[]) AS id,
                 UNNEST($2::int[]) AS x,
                 UNNEST($3::int[]) AS y
        ) AS u
       WHERE t.id = u.id
      `,
      [ids, xs, ys]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Create multiple tables */
export async function createTables({ count, capacity, price }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: maxRow } = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(table_code FROM '^T-(\\d+)$') AS INT)), 0) AS max_n
         FROM food_court_table`
    );
    let n = Number(maxRow[0].max_n) || 0;

    const params = [];
    const values = [];
    let i = 1;

    for (let k = 0; k < count; k++) {
      n += 1;
      const code = `T-${n}`;
      params.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
      values.push(code, capacity, Number(price), 40 + k * 20, 40 + k * 20);
    }

    const sql = `
      INSERT INTO food_court_table (table_code, capacity, price, pos_x, pos_y)
      VALUES ${params.join(",")}
      RETURNING id, table_code, capacity, price, pos_x, pos_y, active
    `;
    const { rows } = await client.query(sql, values);

    await client.query("COMMIT");
    return rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
