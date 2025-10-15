import PDFDocument from "pdfkit";
import pool from "../config/db.js"; // Adjust path to your PostgreSQL connection

async function exportRestaurantOrders(req, res) {
    try {

        //fetching the restaurant_profile table
        const userId = req.user.id;

        const profileQuery = 'SELECT id, restaurant_name FROM restaurant_profiles WHERE user_id = $1';
        const profileResult = await pool.query(profileQuery, [userId]);

        // Check if a restaurant profile was found
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ message: "No restaurant profile found for this user." });
        }

        const restaurantProfile = profileResult.rows[0];
        const restaurantId = restaurantProfile.id; // Use the ID from the profile table
        const restaurantName = restaurantProfile.restaurant_name || 'Restaurant';

        // Fetch restaurant orders with items
        const query = `
      SELECT 
        ro.id,
        ro.order_id,
        ro.status,
        ro.subtotal,
        ro.created_at,
        o.type,
        oi.id as item_id,
        mi.name as item_name,
        oi.quantity,
        oi.price
      FROM restaurant_orders ro
      INNER JOIN orders o ON o.id = ro.order_id
      LEFT JOIN order_items oi ON oi.restaurant_order_id = ro.id
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE ro.restaurant_id = $1
      ORDER BY ro.created_at DESC, oi.id ASC
    `;

        const result = await pool.query(query, [restaurantId]);
        const rows = result.rows;
        console.log("rowwwsssssssssssss", rows)

        // Group items by order
        const ordersMap = {};
        rows.forEach(row => {
            if (!ordersMap[row.id]) {
                ordersMap[row.id] = {
                    id: row.id,
                    order_id: row.order_id,
                    status: row.status,
                    subtotal: row.subtotal,
                    created_at: row.created_at,
                    type: row.type,
                    items: []
                };
            }

            if (row.item_id) {
                ordersMap[row.id].items.push({
                    id: row.item_id,
                    name: row.item_name,
                    quantity: row.quantity,
                    price: row.price
                });
            }
        });

        const orders = Object.values(ordersMap);

        // Create PDF
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 60, bottom: 60, left: 60, right: 60 }
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=restaurant-orders-report-${restaurantId}.pdf`
        );

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

        // Colors
        const primaryColor = '#065f46';
        const secondaryColor = '#f0fdf4';
        const textDark = '#111827';
        const textMedium = '#4b5563';
        const textLight = '#6b7280';
        const successColor = '#059669';
        const dangerColor = '#dc2626';
        const warningColor = '#f59e0b';

        // Page dimensions
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const leftMargin = 60;
        const rightMargin = pageWidth - 60;
        const contentWidth = rightMargin - leftMargin;

        // Generate report info
        const now = new Date();
        const timestamp = now.getTime().toString().slice(-6);
        const reportId = `RO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${timestamp}`;
        const generationTime = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Header
        doc.rect(0, 0, pageWidth, 100).fill(primaryColor);

        doc.fillColor('white')
            .fontSize(28)
            .font('Helvetica-Bold')
            .text(restaurantName.toUpperCase(), leftMargin, 25);

        doc.fontSize(12)
            .font('Helvetica')
            .text('Order Management System', leftMargin, 58);

        doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('ORDERS REPORT', rightMargin - 190, 32);

        doc.fontSize(8)
            .font('Helvetica')
            .text('Restaurant Orders Summary', rightMargin - 190, 54);

        let currentY = 130;

        // Report Information
        doc.fillColor(textDark)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('Report Information', leftMargin, currentY);

        currentY += 25;

        const labelWidth = 120;
        const valueStartX = leftMargin + labelWidth;

        // Restaurant ID
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(textMedium)
            .text('Restaurant ID:', leftMargin, currentY);

        doc.font('Helvetica')
            .fillColor(textDark)
            .text(restaurantId, valueStartX, currentY);

        currentY += 18;

        // Generated Time
        doc.font('Helvetica-Bold')
            .fillColor(textMedium)
            .text('Generated:', leftMargin, currentY);

        doc.font('Helvetica')
            .fillColor(textDark)
            .text(generationTime, valueStartX, currentY);

        currentY += 18;

        // Total Orders
        doc.font('Helvetica-Bold')
            .fillColor(textMedium)
            .text('Total Orders:', leftMargin, currentY);

        doc.font('Helvetica')
            .fillColor(textDark)
            .text(orders.length.toString(), valueStartX, currentY);

        currentY += 18;

        // Total Revenue
        const totalRevenue = orders
            .filter(o => !['cancelled', 'denied', 'pending'].includes(o.status))
            .reduce((sum, o) => sum + Number(o.subtotal), 0);


        doc.font('Helvetica-Bold')
            .fillColor(textMedium)
            .text('Total Revenue:', leftMargin, currentY);

        doc.font('Helvetica')
            .fillColor(textDark)
            .text(`Rs. ${totalRevenue.toFixed(2)}`, valueStartX, currentY);

        currentY += 35;

        // Orders section
        const colItem = leftMargin + 10;
        const colQty = leftMargin + 250;
        const colPrice = leftMargin + 320;
        const colSubtotal = leftMargin + 400;

        const rowHeight = 20;
        const headerHeight = 30;

        for (const order of orders) {
            // Check if we need a new page
            if (currentY + headerHeight + (order.items.length + 4) * rowHeight > pageHeight - 60) {
                doc.addPage();
                currentY = 60;
            }

            // Order header
            doc.rect(leftMargin, currentY, contentWidth, 40)
                .fill(secondaryColor);

            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor(primaryColor)
                .text(`Order #${order.id}`, leftMargin + 10, currentY + 10);

            // Order date
            doc.fontSize(9)
                .font('Helvetica')
                .fillColor(textMedium)
                .text(new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }), leftMargin + 150, currentY + 13);

            // Order type
            doc.fontSize(9)
                .font('Helvetica-Bold')
                .fillColor(textDark)
                .text(order.type.toUpperCase(), rightMargin - 140, currentY + 13);

            // Status
            const statusColor = order.status === 'completed' ? successColor :
                order.status === 'denied' ? dangerColor : warningColor;
            console.log("order status ====", order)
            doc.fillColor(statusColor)
                .text(order.status.toUpperCase(), rightMargin - 80, currentY + 13);

            currentY += 45;

            // Table header
            doc.rect(leftMargin, currentY, contentWidth, headerHeight)
                .fill('#f3f4f6')
                .stroke('#9ca3af');

            doc.fillColor(textDark)
                .fontSize(10)
                .font('Helvetica-Bold')
                .text("Item", colItem, currentY + 10)
                .text("Qty", colQty, currentY + 10)
                .text("Price", colPrice, currentY + 10)
                .text("Subtotal", colSubtotal, currentY + 10);

            currentY += headerHeight;

            // Items
            let itemIndex = 0;
            for (const item of order.items) {
                if (currentY + rowHeight > pageHeight - 60) {
                    doc.addPage();
                    currentY = 60;
                }

                const rowBg = itemIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
                doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill(rowBg);

                const itemSubtotal = Number(item.quantity) * Number(item.price);

                doc.fontSize(9)
                    .font('Helvetica')
                    .fillColor(textDark)
                    .text(item.name, colItem, currentY + 6, {
                        width: 260,
                        ellipsis: true
                    })
                    .text(item.quantity.toString(), colQty, currentY + 6)
                    .text(`Rs. ${Number(item.price).toFixed(2)}`, colPrice, currentY + 6)
                    .font('Helvetica-Bold')
                    .text(`Rs. ${itemSubtotal.toFixed(2)}`, colSubtotal, currentY + 6);

                currentY += rowHeight;
                itemIndex++;
            }

            // Order subtotal
            doc.rect(leftMargin, currentY, contentWidth, 25)
                .fill(secondaryColor);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(textMedium)
                .text('Order Subtotal:', colPrice - 80, currentY + 8);

            doc.fillColor(primaryColor)
                .text(`Rs. ${Number(order.subtotal).toFixed(2)}`, colSubtotal, currentY + 8);

            currentY += 35;
        }

        // Summary section
        if (currentY + 120 > pageHeight - 60) {
            doc.addPage();
            currentY = 60;
        }

        doc.rect(leftMargin, currentY, contentWidth, 100)
            .fill('#f0fdf4');

        currentY += 20;

        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor(primaryColor)
            .text('Report Summary', leftMargin + 10, currentY);

        currentY += 25;

        // Total orders
        doc.fontSize(11)
            .font('Helvetica-Bold')
            .fillColor(textMedium)
            .text('Total Orders:', leftMargin + 20, currentY);

        doc.fillColor(textDark)
            .text(orders.length.toString(), leftMargin + 200, currentY);

        currentY += 20;

        // Completed orders
        const completedCount = orders.filter(o => o.status === 'completed').length;
        doc.fillColor(textMedium)
            .text('Completed Orders:', leftMargin + 20, currentY);

        doc.fillColor(successColor)
            .text(completedCount.toString(), leftMargin + 200, currentY);

        currentY += 20;

        // Total revenue
        doc.fillColor(textMedium)
            .text('Total Revenue:', leftMargin + 20, currentY);

        doc.fillColor(primaryColor)
            .fontSize(12)
            .text(`Rs. ${totalRevenue.toFixed(2)}`, leftMargin + 200, currentY);



        doc.end();
    } catch (err) {
        console.error('Error exporting restaurant orders PDF:', err);
        if (!res.headersSent) {
            return res.status(500).json({
                message: "Failed to export restaurant orders PDF",
                error: err.message
            });
        }
    }
}

export default {
    exportRestaurantOrders
};