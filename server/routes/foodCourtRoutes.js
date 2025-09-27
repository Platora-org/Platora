import express from "express";
import {
  listTables,
  patchTablePosition,
  patchBulkPositions,
  postCreateTables,
} from "../controllers/foodCourtController.js";

const router = express.Router();

router.get("/tables", listTables);
router.patch("/tables/:id/position", patchTablePosition);
router.patch("/tables/positions", patchBulkPositions);
router.post("/tables", postCreateTables);

export default router;
