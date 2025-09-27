// controllers/inventoryController.js
import Inventory from "../models/inventoryModel.js";
import Adjustments from "../models/adjustmentsModel.js";
import PDFDocument from "pdfkit";

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
            const direction = 'in'

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


            await Adjustments.create({
                restaurant_id: restaurantId,
                item_id: dbRes.rows[0].id,
                item_name: dbRes.rows[0].name,
                direction,
                quantity: Number(quantity),
                reason : 'b/b/f'
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

    // GET /api/v1/inventory/adjustments
async listAdjustments(req, res) {
    try {
        const restaurantId = req.user.restaurantId;
        const r = await Adjustments.listForRestaurant(restaurantId);
        return res.json(r.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to list adjustments' });
    }
},

async exportAdjustments(req, res) {
    try {
        const restaurantId = req.user.restaurantId;
        const r = await Adjustments.listForRestaurantAsc(restaurantId);
        const adjustments = r.rows;

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=inventory-account-${restaurantId}.pdf`
        );
        doc.pipe(res);

        // Main title
        doc.fontSize(20).font('Helvetica-Bold').text("Inventory Accounts", { align: "center" });
        doc.moveDown(2);

        // Group adjustments by item
        const itemsMap = {};
        adjustments.forEach(a => {
            if (!itemsMap[a.item_name]) itemsMap[a.item_name] = [];
            itemsMap[a.item_name].push(a);
        });

        // Column positions
        const colDate = 50;
        const colDescription = 160;
        const colDirection = 330;
        const colQuantity = 400;
        const colBalance = 470;

        for (const itemName of Object.keys(itemsMap)) {
            const itemAdjustments = itemsMap[itemName];

            if (doc.y + (itemAdjustments.length + 5) * 20 > 750) {
                doc.addPage();
            }

            // Item header
            doc.fontSize(14).font('Helvetica-Bold').text(itemName, colDate, doc.y);
            doc.moveDown(0.5);

            // Table header
            const tableTop = doc.y;
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text("Date", colDate, tableTop)
                .text("Description", colDescription, tableTop)
                .text("Direction", colDirection, tableTop)
                .text("Quantity", colQuantity, tableTop)
                .text("Balance", colBalance, tableTop);

            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            let y = doc.y + 5;

            // Start with first record as b/b/f
            const bbf = itemAdjustments[0];
            let runningBalance = Number(bbf.quantity);

            // Print the B/B/F row
            doc
                .fontSize(10)
                .font('Helvetica')
                .text(new Date(bbf.created_at).toLocaleDateString(), colDate, y)
                .text(bbf.reason || "B/B/F", colDescription, y)
                .text("-", colDirection, y)
                .text(bbf.quantity, colQuantity, y)
                .text(runningBalance, colBalance, y);

            y += 20;

            // Remaining adjustments
            for (let i = 1; i < itemAdjustments.length; i++) {
                const a = itemAdjustments[i];
                const direction = a.direction.toUpperCase();
                const qty = Number(a.quantity);

                runningBalance += direction === 'IN' ? qty : -qty;

                if (y > 750) {
                    doc.addPage();
                    y = 50;
                }

                doc
                    .fontSize(10)
                    .font('Helvetica')
                    .text(new Date(a.created_at).toLocaleDateString(), colDate, y)
                    .text(a.reason || "-", colDescription, y)
                    .fillColor(direction === 'IN' ? 'green' : 'red')
                    .text(direction, colDirection, y)
                    .fillColor('black')
                    .text(qty, colQuantity, y)
                    .text(runningBalance, colBalance, y);

                y += 20;
            }

            // Divider and totals
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 5;

            const totalIn = itemAdjustments
                .slice(1) // exclude first record
                .filter(a => a.direction === 'in')
                .reduce((sum, a) => sum + Number(a.quantity), 0);

            const totalOut = itemAdjustments
                .slice(1)
                .filter(a => a.direction === 'out')
                .reduce((sum, a) => sum + Number(a.quantity), 0);

            // Show B/B/F separately + totals
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text("B/B/F:", colDirection, y)
                .text(Number(bbf.quantity).toFixed(2), colBalance, y);

            y += 20;
            doc
                .fillColor('green') // Set color for IN
                .text("Total IN:", colDirection, y)
                .text(`+${totalIn.toFixed(2)}`, colBalance, y); // Add '+' sign

            y += 20;
            doc
                .fillColor('red') // Set color for OUT
                .text("Total OUT:", colDirection, y)
                .text(`(${totalOut.toFixed(2)})`, colBalance, y); // Add '-' sign

            y += 20;
            doc
                .fillColor('black') // IMPORTANT: Reset color to black
                .text("Net Quantity:", colDirection, y)
                .text((Number(bbf.quantity) + totalIn - totalOut).toFixed(2), colBalance, y);

            doc.moveDown(2);
        }

        doc.end();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to export adjustments PDF" });
    }
}

};






export default inventoryController;
