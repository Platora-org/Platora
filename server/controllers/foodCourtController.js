import {
  getAllTables,
  updateTablePosition,
  bulkUpdatePositions,
  createTables,
} from "../models/foodCourtModel.js";

/** GET /api/food-court/tables */
export async function listTables(_req, res) {
  try {
    const tables = await getAllTables();
    res.json({ tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load tables" });
  }
}

/** PATCH /api/food-court/tables/:id/position */
export async function patchTablePosition(req, res) {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
      return res.status(400).json({ message: "x and y must be numbers" });
    }
    const ok = await updateTablePosition(id, x, y);
    if (!ok) return res.status(404).json({ message: "Table not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update position" });
  }
}

/** PATCH /api/food-court/tables/positions */
export async function patchBulkPositions(req, res) {
  try {
    const { positions } = req.body;
    if (!Array.isArray(positions) || positions.length === 0) {
      return res.status(400).json({ message: "positions must be a non-empty array" });
    }
    await bulkUpdatePositions(positions);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save positions" });
  }
}

/** POST /api/food-court/tables */
export async function postCreateTables(req, res) {
  try {
    const count = Math.max(1, Math.min(50, Number(req.body?.count ?? 1)));
    const capacity = Math.max(1, Math.min(20, Number(req.body?.capacity ?? 4)));
    const price = Number(req.body?.price ?? 0);

    const tables = await createTables({ count, capacity, price });
    res.status(201).json({ tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create tables" });
  }
}
