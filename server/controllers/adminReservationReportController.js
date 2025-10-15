import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { getAdminReservationsReportData } from "../models/adminReservationsModel.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const adminReservationReportController = {
  async generateAdminReservationReport(req, res) {
    try {
      const startDate = req.query.startDate || req.query.start || req.query.from;
      const endDate = req.query.endDate || req.query.end || req.query.to;
      const status = req.query.status || "all";
      const q = req.query.q || "";

      if (!startDate || !endDate)
        return res.status(400).json({ success: false, message: "Start and end dates are required" });

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end)
        return res.status(400).json({ success: false, message: "Start date must be before end date" });

      const reservations = await getAdminReservationsReportData({ from: startDate, to: endDate, status, q });
      if (!reservations.length)
        return res.status(404).json({ success: false, message: "No reservations found for the selected range" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="admin-reservation-report-${startDate}-to-${endDate}.pdf"`
      );

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      doc.pipe(res);

      // --- Theme colors ---
      const primary = "#065f46";
      const accent = "#10b981";
      const lightBg = "#f0fdf4";
      const red = "#dc2626";
      const textDark = "#111827";
      const textGray = "#4b5563";

      // === HEADER ===
      const pageWidth = doc.page.width;
      doc.rect(0, 0, pageWidth, 80).fill(primary);

      doc.fillColor("white").font("Times-Bold").fontSize(26).text("PLATORA", 50, 25);
      doc.fontSize(11).font("Times-Roman").text("Digital Wallet & Payment Solutions", 50, 55);
      doc.font("Times-Bold").fontSize(20).text("ADMIN REPORT", pageWidth - 210, 30);
      doc.font("Times-Roman").fontSize(10).text("Reservation Analysis", pageWidth - 180, 55);

      // === REPORT INFO ===
      const now = dayjs().tz("Asia/Colombo");
      const reportId = `AR-${now.format("YYYYMMDD-HHmmss")}`;

      doc.moveDown(3);
      doc.fillColor(textDark).font("Times-Bold").fontSize(15).text("Report Information", 50);
      doc.moveDown(0.5);
      doc.font("Times-Roman").fontSize(10).fillColor(textGray);

      const infoLeft = 60;
      const infoRight = 240;
      const lineGap = 16;

      let y = doc.y + 10;

      doc.fillColor(textGray).text("Report Period:", infoLeft, y);
      doc.fillColor(textDark).text(`${startDate} - ${endDate}`, infoRight,y);
      y += lineGap;

      doc.fillColor(textGray).text("Generated:", infoLeft, y );
      doc.fillColor(textDark).text(now.format("MMMM DD, YYYY [at] hh:mm A"), infoRight,y);
      y += lineGap;

      // === SUMMARY ===
      doc.moveDown(2);
      const total = reservations.length;
      const booked = reservations.filter((r) => r.status === "booked").length;
      const completed = reservations.filter((r) => r.status === "completed").length;
      const cancelled = reservations.filter((r) => r.status === "cancelled").length;
      const totalGuests = reservations.reduce((a, r) => a + (r.guests || 0), 0);

      doc.fillColor(textDark).font("Times-Bold").fontSize(15).text("Summary Analytics", 50);
      doc.moveDown(0.5);

      const sLeft = 60;
      const sRight = 240;
      

      doc.font("Times-Roman").fontSize(10);
      doc.fillColor(textGray).text("Total Reservations:", sLeft, doc.y);
      doc.fillColor(accent).text(total, sRight, doc.y);
      doc.fillColor(textGray).text("Booked:", sLeft, doc.y );
      doc.fillColor(accent).text(booked, sRight, doc.y );
      doc.fillColor(textGray).text("Completed:", sLeft, doc.y );
      doc.fillColor(accent).text(completed, sRight, doc.y );
      doc.fillColor(textGray).text("Cancelled:", sLeft, doc.y );
      doc.fillColor(red).text(cancelled, sRight, doc.y );
      doc.fillColor(textGray).text("Total Guests:", sLeft, doc.y);
      doc.fillColor(accent).text(totalGuests, sRight, doc.y );

      // === TABLE HEADER ===
      doc.moveDown(3);
      doc.fillColor(textDark).font("Times-Bold").fontSize(15).text("Reservation Details", 50);
      doc.moveDown(0.8);

      // Column positions
      const cols = {
        uid: 50,
        customer: 100,
        date: 210,
        time: 290,
        tables: 380,
        guests: 450,
        status: 510,
      };
      const rowHeight = 18;
      const bottomMargin = doc.page.height - 50;

      // Header background
      const headerY = doc.y;
      doc.save().rect(45, headerY - 4, 515, 20).fill(lightBg).restore();

      doc.font("Helvetica-Bold").fontSize(10).fillColor(primary);
      doc.text("UID", cols.uid, headerY);
      doc.text("Customer", cols.customer, headerY);
      doc.text("Date", cols.date, headerY);
      doc.text("Time", cols.time, headerY);
      doc.text("Tables", cols.tables, headerY);
      doc.text("Guests", cols.guests, headerY);
      doc.text("Status", cols.status, headerY);
      doc.moveDown(0.5);
      doc.strokeColor(accent).moveTo(50, doc.y).lineTo(560, doc.y).stroke();

      // === TABLE BODY ===
      doc.font("Helvetica").fontSize(9).fillColor(textDark);
      doc.moveDown(0.5);

      reservations.forEach((r, i) => {

        const rowHeight = 18; // fixed height for each row
       
 const y = doc.y;
        if (y + rowHeight > doc.page.height - 60) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(primary);
    doc.text("UID", cols.uid, 50);
    doc.text("Customer", cols.customer, 50);
    doc.text("Date", cols.date, 50);
    doc.text("Time", cols.time, 50);
    doc.text("Tables", cols.tables, 50);
    doc.text("Guests", cols.guests, 50);
    doc.text("Status", cols.status, 50);
    doc.moveTo(50, 65).lineTo(560, 65).strokeColor(accent).stroke();
    doc.moveDown(1);
  }

       
        if (i % 2 === 1) {
          doc.save().rect(45, y - 2, 515, rowHeight).fillOpacity(0.05).fill(accent).restore();
        }

        const dateStr = dayjs.utc(r.reserved_date).tz("Asia/Colombo").format("YYYY-MM-DD");
        const timeStr = r.slot_label || "—";
        const tableList = (r.tables || []).map((t) => t.table_code).join(", ") || "—";

        const cols = {
        uid: 50,
        customer: 100,
        date: 200,
        time: 270,    // widened
        tables: 390,
        guests: 450,
        status: 500,
};
  
        const statusShort =
            r.status === "cancelled" ? "C" :
            r.status === "booked" ? "B" :
            r.status === "completed" ? "D" :
            "-";

        const statusColor =
          r.status === "cancelled" ? red :
          r.status === "booked" ? accent :
          textDark;

        // Fixed X alignment
        doc.fillColor(textDark);
        doc.text(String(r.id), cols.uid, y);
        doc.text(r.customer_name || "—", cols.customer, y, { width: 90 });
        doc.text(dateStr, cols.date, y);
        doc.text(timeStr, cols.time, y, { width: 120 }); // ✅ more space for time
        doc.text(tableList, cols.tables, y, { width: 80 });
        doc.text(String(r.guests), cols.guests, y, { width: 40, align: "center" });
        doc.fillColor(statusColor)
            .font("Helvetica-Bold")
            .text(statusShort, cols.status, y, { width: 40, align: "center" });

  // ✅ Move down by fixed row height
        doc.y = y + rowHeight;
});

      doc.end();
    } catch (err) {
      console.error("Report generation error:", err);
      if (!res.headersSent)
        res.status(500).json({ success: false, message: "Report generation failed" });
    }
  },
};

export default adminReservationReportController;
