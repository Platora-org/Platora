// controllers/inventoryController.js
import Inventory from "../models/inventoryModel.js";
import Adjustments from "../models/adjustmentsModel.js";

const NAME_REGEX = /^[A-Za-z0-9 ]+$/;

const inventoryController = {
    // GET /api/v1/inventory
    async list(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            
            const result = await Inventory.getAll(restaurantId);
            return res.json(result.rows);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to list inventory' });
        }
    },

    // GET /api/v1/inventory/:id
    async getOne(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { id } = req.params;
            const result = await Inventory.getById(id, restaurantId);
            if (result.rowCount === 0) return res.status(404).json({ message: 'Not found' });
            return res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to fetch item' });
        }
    },

    // POST /api/v1/inventory
    async create(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
        
            const { name, unit, quantity = 0, reorder_level = 0 } = req.body;

            if (!name || !NAME_REGEX.test(name)) {
                return res.status(400).json({ message: 'Invalid name' });
            }
            if (!unit) {
                return res.status(400).json({ message: 'Unit is required' });
            }

            // 🔎 Check for duplicates
            const existing = await Inventory.findByName(name.trim(), restaurantId);
            if (existing.rowCount > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Inventory with this name already exists'
                });
            }

            // ✅ Create new record
            const dbRes = await Inventory.create({
                restaurant_id: restaurantId,
                name: name.trim(),
                unit,
                quantity,
                reorder_level
            });

            return res.status(201).json(dbRes.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to create item' });
        }
    },

    // PUT /api/v1/inventory/:id
    async update(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { id } = req.params;
            const { name, unit, quantity = 0, reorder_level = 0 } = req.body;

            if (!name || !NAME_REGEX.test(name)) {
                return res.status(400).json({ message: 'Invalid name' });
            }
            if (!unit) {
                return res.status(400).json({ message: 'Unit is required' });
            }

            // 🔎 Check if another item with this name exists
            const existing = await Inventory.findByNameExcludingId(name.trim(), id, restaurantId);
            if (existing.rowCount > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Inventory with this name already exists'
                });
            }

            // ✅ Update record
            const dbRes = await Inventory.update(id, restaurantId, {
                name: name.trim(),
                unit,
                quantity,
                reorder_level
            });

            if (dbRes.rowCount === 0) {
                return res.status(404).json({ message: 'Not found' });
            }
            return res.json(dbRes.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to update item' });
        }
    },

    // DELETE /api/v1/inventory/:id
    async remove(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { id } = req.params;
            const dbRes = await Inventory.remove(id, restaurantId);
            if (dbRes.rowCount === 0) return res.status(404).json({ message: 'Not found' });
            return res.json({ message: 'Item deleted' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to delete item' });
        }
    },

    // PATCH /api/v1/inventory/:id/adjust
    async adjust(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { id } = req.params;
            const { direction, quantity, reason = null } = req.body;

            if (!direction || !['in', 'out'].includes(direction)) return res.status(400).json({ message: 'Invalid direction' });
            if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) return res.status(400).json({ message: 'Invalid quantity' });

            const adjustment = direction === 'in' ? Number(quantity) : -Number(quantity);

            // update inventory
            const up = await Inventory.adjustQuantity(id, restaurantId, adjustment);
            if (up.rowCount === 0) return res.status(404).json({ message: 'Item not found' });

            const updatedItem = up.rows[0];

            // log adjustment
            await Adjustments.create({
                restaurant_id: restaurantId,
                item_id: id,
                item_name: updatedItem.name,
                direction,
                quantity: Number(quantity),
                reason
            });

            return res.json(up.rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to adjust quantity' });
        }
    },

    // GET /api/v1/inventory/:id/adjustments
    async listAdjustments(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { id } = req.params;
            const r = await Adjustments.listForItem(id, restaurantId);
            return res.json(r.rows);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to list adjustments' });
        }
    }
};

export default inventoryController;
