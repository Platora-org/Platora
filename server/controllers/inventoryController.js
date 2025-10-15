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
                reason: 'b/b/f'
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
        const restaurantName = req.user.restaurantName;
        const r = await Adjustments.listForRestaurantAsc(restaurantId);
        const adjustments = r.rows;

        const doc = new PDFDocument({ 
            size: 'A4',
            margins: { top: 60, bottom: 60, left: 60, right: 60 }
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=inventory-account-${restaurantId}.pdf`
        );

        // Handle PDF errors
        doc.on('error', (err) => {
            console.error('PDF generation error:', err);
            if (!res.headersSent) {
                res.status(500).json({ 
                    success: false, 
                    message: 'PDF generation failed',
                    error: err.message 
                });
            }
        });

        doc.pipe(res);

        // Professional emerald theme colors
        const primaryColor = '#065f46';    // Emerald dark
        const secondaryColor = '#f0fdf4';  // Emerald light background
        const accentColor = '#10b981';     // Emerald accent
        const textDark = '#111827';        // Nearly black
        const textMedium = '#4b5563';      // Medium gray
        const textLight = '#6b7280';       // Light gray
        const successColor = '#059669';    // Emerald green
        const dangerColor = '#dc2626';     // Red

        // Page dimensions
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const leftMargin = 60;
        const rightMargin = pageWidth - 60;
        const contentWidth = rightMargin - leftMargin;

        // Generate unique report ID
        const now = new Date();
        const timestamp = now.getTime().toString().slice(-6);
        const reportId = `IA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${timestamp}`;
        const generationTime = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Professional header with emerald theme
        doc.rect(0, 0, pageWidth, 100).fill(primaryColor);

        // Company/Restaurant name
        doc.fillColor('white')
           .fontSize(28)
           .font('Times-Bold')
           .text(restaurantName || 'RESTAURANT', leftMargin, 25);

        doc.fontSize(12)
           .font('Times-Roman')
           .text('Inventory Management System', leftMargin, 58);

        // Report title - right aligned
        doc.fontSize(16)
           .font('Times-Bold')
           .text('INVENTORY ACCOUNTS', rightMargin - 190, 32);

        doc.fontSize(8)
           .font('Times-Roman')
           .text('Stock Movement Report', rightMargin - 190, 54);

        let currentY = 130;

        // Report information header
        doc.fillColor(textDark)
           .fontSize(16)
           .font('Times-Bold')
           .text('Report Information', leftMargin, currentY);

        currentY += 25;

        // Report information layout
        const labelWidth = 120;
        const valueStartX = leftMargin + labelWidth;

        // Restaurant ID
        doc.fontSize(10)
           .font('Times-Bold')
           .fillColor(textMedium)
           .text('Restaurant ID:', leftMargin, currentY);

        doc.font('Times-Roman')
           .fillColor(textDark)
           .text(restaurantId, valueStartX, currentY);

        currentY += 18;

        // Generated Time
        doc.font('Times-Bold')
           .fillColor(textMedium)
           .text('Generated:', leftMargin, currentY);

        doc.font('Times-Roman')
           .fillColor(textDark)
           .text(generationTime, valueStartX, currentY);

        currentY += 18;

        // Total Items
        doc.font('Times-Bold')
           .fillColor(textMedium)
           .text('Total Items:', leftMargin, currentY);

        doc.font('Times-Roman')
           .fillColor(textDark)
           .text(Object.keys(adjustments.reduce((acc, a) => { acc[a.item_name] = true; return acc; }, {})).length, valueStartX, currentY);

        currentY += 35;

        // Group adjustments by item
        const itemsMap = {};
        adjustments.forEach(a => {
            if (!itemsMap[a.item_name]) itemsMap[a.item_name] = [];
            itemsMap[a.item_name].push(a);
        });

        // Column positions and widths
        const colDate = leftMargin + 10;
        const colDescription = leftMargin + 90;
        const colDirection = leftMargin + 240;
        const colQuantity = leftMargin + 330;
        const colBalance = leftMargin + 420;

        const rowHeight = 20;
        const headerHeight = 30;

        for (const itemName of Object.keys(itemsMap)) {
            const itemAdjustments = itemsMap[itemName];

            // Check if we need a new page for this item
            if (currentY + headerHeight + (itemAdjustments.length + 6) * rowHeight > pageHeight - 60) {
                doc.addPage();
                currentY = 60;
            }

            // Item header with background
            doc.rect(leftMargin, currentY, contentWidth, 35)
               .fill(secondaryColor);

            doc.fontSize(14)
               .font('Times-Bold')
               .fillColor(primaryColor)
               .text(itemName, leftMargin + 10, currentY + 12);

            currentY += 40;

            // Table header background
            doc.rect(leftMargin, currentY, contentWidth, headerHeight)
               .fill('#f3f4f6')
               .stroke('#9ca3af');

            // Table headers
            doc.fillColor(textDark)
               .fontSize(10)
               .font('Times-Bold')
               .text("Date", colDate, currentY + 10)
               .text("Description", colDescription, currentY + 10)
               .text("Direction", colDirection, currentY + 10)
               .text("Quantity", colQuantity, currentY + 10)
               .text("Balance", colBalance, currentY + 10);

            currentY += headerHeight;

            // Start with first record as B/B/F
            const bbf = itemAdjustments[0];
            let runningBalance = Number(bbf.quantity);

            // Print the B/B/F row
            const rowColor = '#ffffff';
            doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill(rowColor);

            doc.fontSize(9)
               .font('Times-Roman')
               .fillColor(textDark)
               .text(new Date(bbf.created_at).toLocaleDateString('en-US', {
                   month: 'short',
                   day: 'numeric',
                   year: '2-digit'
               }), colDate, currentY + 6)
               .text(bbf.reason || "B/B/F", colDescription, currentY + 6, { 
                   width: 140, 
                   ellipsis: true 
               })
               .fillColor(textMedium)
               .text("-", colDirection, currentY + 6)
               .fillColor(textDark)
               .font('Times-Bold')
               .text(bbf.quantity, colQuantity, currentY + 6)
               .text(runningBalance.toFixed(2), colBalance, currentY + 6);

            currentY += rowHeight;

            // Remaining adjustments
            for (let i = 1; i < itemAdjustments.length; i++) {
                const a = itemAdjustments[i];
                const direction = a.direction.toUpperCase();
                const qty = Number(a.quantity);

                runningBalance += direction === 'IN' ? qty : -qty;

                // Check if we need a new page
                if (currentY + rowHeight > pageHeight - 60) {
                    doc.addPage();
                    currentY = 60;
                }

                // Alternating row colors
                const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
                doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill(rowBg);

                const directionColor = direction === 'IN' ? successColor : dangerColor;

                doc.fontSize(9)
                   .font('Times-Roman')
                   .fillColor(textDark)
                   .text(new Date(a.created_at).toLocaleDateString('en-US', {
                       month: 'short',
                       day: 'numeric',
                       year: '2-digit'
                   }), colDate, currentY + 6)
                   .text(a.reason || "-", colDescription, currentY + 6, { 
                       width: 140, 
                       ellipsis: true 
                   })
                   .fillColor(directionColor)
                   .font('Times-Bold')
                   .text(direction, colDirection, currentY + 6)
                   .fillColor(textDark)
                   .font('Times-Roman')
                   .text(qty.toFixed(2), colQuantity, currentY + 6)
                   .font('Times-Bold')
                   .text(runningBalance.toFixed(2), colBalance, currentY + 6);

                currentY += rowHeight;
            }

            // Summary section
            if (currentY + 100 > pageHeight - 60) {
                doc.addPage();
                currentY = 60;
            }

            // Divider line
            doc.strokeColor('#9ca3af')
               .lineWidth(1)
               .moveTo(leftMargin, currentY)
               .lineTo(rightMargin, currentY)
               .stroke();

            currentY += 15;

            // Calculate totals
            const totalIn = itemAdjustments
                .slice(1)
                .filter(a => a.direction === 'in')
                .reduce((sum, a) => sum + Number(a.quantity), 0);

            const totalOut = itemAdjustments
                .slice(1)
                .filter(a => a.direction === 'out')
                .reduce((sum, a) => sum + Number(a.quantity), 0);

            // Summary with professional styling
            doc.rect(leftMargin, currentY, contentWidth, 90)
               .fill(secondaryColor);

            currentY += 15;

            // B/B/F
            doc.fontSize(10)
               .font('Times-Bold')
               .fillColor(textMedium)
               .text("Beginning Balance:", colDirection, currentY);

            doc.fillColor(textDark)
               .text(Number(bbf.quantity).toFixed(2), colBalance, currentY);

            currentY += 20;

            // Total IN
            doc.fillColor(textMedium)
               .text("Total IN:", colDirection, currentY);

            doc.fillColor(successColor)
               .text(`+${totalIn.toFixed(2)}`, colBalance, currentY);

            currentY += 20;

            // Total OUT
            doc.fillColor(textMedium)
               .text("Total OUT:", colDirection, currentY);

            doc.fillColor(dangerColor)
               .text(`(${totalOut.toFixed(2)})`, colBalance, currentY);

            currentY += 20;

            // Net Quantity
            doc.fillColor(textMedium)
               .text("Net Quantity:", colDirection, currentY);

            doc.fillColor(primaryColor)
               .fontSize(11)
               .text((Number(bbf.quantity) + totalIn - totalOut).toFixed(2), colBalance, currentY);

            currentY += 40;
        }

        doc.end();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to export adjustments PDF" });
    }
}
};



export default inventoryController;
