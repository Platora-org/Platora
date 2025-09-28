import * as AnalyticsModel from '../models/analyticsModel.js';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

// Generate PDF invoice using PDFKit - PROFESSIONAL TEMPLATE WITH FIXED ALIGNMENT
export const generateTransactionInvoice = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`Generating invoice for transaction ${transactionId} by user ${userId} (${userRole})`);
    
    // Use enhanced function that supports admin access
    const transaction = await AnalyticsModel.getTransactionForInvoice(transactionId, userId, userRole);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Set response headers immediately
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${transaction.id}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Create PDF document with proper margins
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 }
    });
    
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

    // Pipe PDF directly to response
    doc.pipe(res);
    
    // Professional emerald theme color scheme
    const primaryColor = '#065f46';    // Emerald dark
    const secondaryColor = '#f0fdf4';  // Emerald light background
    const accentColor = '#10b981';     // Emerald accent
    const textDark = '#111827';        // Nearly black
    const textMedium = '#4b5563';      // Medium gray
    const textLight = '#6b7280';       // Light gray
    const successColor = '#059669';    // Emerald green
    const warningColor = '#d97706';    // Professional amber
    
    // Page dimensions for calculations
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftMargin = 60;
    const rightMargin = pageWidth - 60;
    const contentWidth = rightMargin - leftMargin;
    
    // Professional header with subtle background
    doc.rect(0, 0, pageWidth, 100).fill(primaryColor);
    
    // Company name with professional typography
    doc.fillColor('white')
       .fontSize(28)
       .font('Times-Bold')
       .text('PLATORA', leftMargin, 25);
    
    doc.fontSize(12)
       .font('Times-Roman')
       .text('Digital Wallet & Payment Solutions', leftMargin, 58);
    
    // Invoice title - professionally positioned
    doc.fontSize(24)
       .font('Times-Bold')
       .text('INVOICE', rightMargin - 120, 25, { width: 120, align: 'right' });
    
    doc.fontSize(10)
       .font('Times-Roman')
       .text('Transaction Receipt', rightMargin - 120, 55, { width: 120, align: 'right' });
    
    // Reset position and prepare for content
    let currentY = 130;
    
    // Invoice header section with professional typography
    doc.fillColor(textDark)
       .fontSize(16)
       .font('Times-Bold')
       .text('Invoice Information', leftMargin, currentY);
    
    currentY += 25;
    
    // Create professional two-column layout
    const leftColumnX = leftMargin;
    const rightColumnX = leftMargin + (contentWidth / 2) + 30;
    const labelWidth = 110;
    const valueStartX = leftColumnX + labelWidth;
    
    // Left column - Invoice details with improved typography
    let leftY = currentY;
    
    // Invoice Number
    doc.fontSize(10)
       .font('Times-Bold')
       .fillColor(textMedium)
       .text('Invoice Number:', leftColumnX, leftY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(`INV-${String(transaction.id).padStart(6, '0')}`, valueStartX, leftY);
    
    leftY += 18;
    
    // Issue Date
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Issue Date:', leftColumnX, leftY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(new Date(transaction.created_at).toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
         day: 'numeric'
       }), valueStartX, leftY);
    
    leftY += 18;
    
    // Transaction ID
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Transaction ID:', leftColumnX, leftY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(transaction.id.toString(), valueStartX, leftY);
    
    leftY += 18;
    
    // Transaction Time
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Time:', leftColumnX, leftY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(new Date(transaction.created_at).toLocaleTimeString('en-US', {
         hour: '2-digit',
         minute: '2-digit',
         hour12: true
       }), valueStartX, leftY);
    
    // Right column - Customer information with improved layout
    let rightY = currentY;
    
    doc.fontSize(16)
       .font('Times-Bold')
       .fillColor(textDark)
       .text('Customer Information', rightColumnX, rightY - 25);
    
    // Customer details with professional alignment
    const rightLabelWidth = 90;
    const rightValueStartX = rightColumnX + rightLabelWidth;
    
    // Customer Name
    doc.fontSize(10)
       .font('Times-Bold')
       .fillColor(textMedium)
       .text('Name:', rightColumnX, rightY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(transaction.customer_name || 'N/A', rightValueStartX, rightY, {
         width: rightMargin - rightValueStartX - 10,
         ellipsis: true
       });
    
    rightY += 18;
    
    // Email
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Email:', rightColumnX, rightY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(transaction.email || 'N/A', rightValueStartX, rightY, { 
         width: rightMargin - rightValueStartX - 10,
         ellipsis: true 
       });
    
    rightY += 18;
    
    // Customer ID
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Customer ID:', rightColumnX, rightY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(transaction.user_id.toString(), rightValueStartX, rightY);
    
    // Move to transaction details section with better spacing
    currentY = Math.max(leftY, rightY) + 30;
    
    // Transaction details section header
    doc.fontSize(16)
       .font('Times-Bold')
       .fillColor(textDark)
       .text('Transaction Details', leftMargin, currentY);
    
    currentY += 25;
    
    // Clean professional table design
    const tableStartY = currentY;
    const tableHeight = 70;
    const headerHeight = 25;
    const rowHeight = 45;
    
    // Table background with clean borders
    doc.rect(leftMargin, tableStartY, contentWidth, tableHeight)
       .fill(secondaryColor)
       .stroke('#d1d5db');
    
    // Table header with professional styling
    doc.rect(leftMargin, tableStartY, contentWidth, headerHeight)
       .fill('#f3f4f6')
       .stroke('#9ca3af');
    
    // Clean table headers with equal spacing
    const colWidths = [140, 90, 90, 90, 125];
    let colX = leftMargin + 15;
    
    doc.fillColor(textDark)
       .fontSize(10)
       .font('Times-Bold');
    
    const headers = ['Description', 'Type', 'Amount', 'Value (LKR)', 'Status'];
    
    headers.forEach((header, index) => {
      doc.text(header, colX, tableStartY + 8, { 
        width: colWidths[index] - 10, 
        align: 'left' 
      });
      colX += colWidths[index];
    });
    
    // Clean table content row
    const contentY = tableStartY + headerHeight + 10;
    colX = leftMargin + 15;
    
    // Description - clean formatting
    doc.fillColor(textDark)
       .fontSize(10)
       .font('Times-Roman')
       .text(
         (transaction.description || 'Digital Wallet Transaction').substring(0, 35) + 
         (transaction.description && transaction.description.length > 35 ? '...' : ''), 
         colX, contentY, 
         { width: colWidths[0] - 10 }
       );
    colX += colWidths[0];
    
    // Type with clean badge styling
    const typeColor = transaction.transaction_type === 'PURCHASE' ? successColor : 
                     transaction.transaction_type === 'SPEND' ? '#dc2626' : accentColor;
    
    doc.fillColor(typeColor)
       .fontSize(10)
       .font('Times-Bold')
       .text(transaction.transaction_type || 'N/A', colX, contentY);
    colX += colWidths[1];
    
    // Amount with clean formatting
    const amount = Math.abs(transaction.amount_coins || 0);
    const amountSign = transaction.transaction_type === 'SPEND' ? '-' : '+';
    
    doc.fillColor(typeColor)
       .fontSize(11)
       .font('Times-Bold')
       .text(`${amountSign}${amount.toLocaleString()} coins`, colX, contentY);
    colX += colWidths[2];
    
    // Money value - clean display
    if (transaction.amount_money) {
      doc.fillColor(textDark)
         .fontSize(10)
         .font('Times-Roman')
         .text(`${transaction.currency || 'LKR'} ${parseFloat(transaction.amount_money).toFixed(2)}`, 
                colX, contentY);
    } else {
      doc.fillColor(textLight)
         .text('N/A', colX, contentY);
    }
    colX += colWidths[3];
    
    // Status with clean styling
    const statusColor = transaction.status === 'COMPLETED' ? successColor : 
                       transaction.status === 'PENDING' ? warningColor : '#dc2626';
    
    doc.fillColor(statusColor)
       .fontSize(10)
       .font('Times-Bold')
       .text(transaction.status || 'COMPLETED', colX, contentY);
    
    currentY = tableStartY + tableHeight + 20;
    
    // Additional information section with professional styling
    if (transaction.restaurant_name || transaction.reference_id) {
      // Professional background box
      doc.rect(leftMargin, currentY, contentWidth, 40)
         .fill('#ecfdf5')
         .stroke('#d1fae5');
      
      doc.fillColor(accentColor)
         .fontSize(10)
         .font('Times-Bold')
         .text('Additional Information', leftMargin + 15, currentY + 8);
      
      let additionalY = currentY + 22;
      
      if (transaction.restaurant_name) {
        doc.fillColor(textDark)
           .fontSize(9)
           .font('Times-Bold')
           .text('Restaurant: ', leftMargin + 15, additionalY);
        
        doc.font('Times-Roman')
           .text(transaction.restaurant_name, leftMargin + 70, additionalY);
        
        additionalY += 10;
      }
      
      if (transaction.reference_id) {
        doc.font('Times-Bold')
           .text('Order Reference: ', leftMargin + 15, additionalY);
        
        doc.font('Times-Roman')
           .text(transaction.reference_id, leftMargin + 90, additionalY);
      }
      
      currentY += 50;
    }
    
    // Professional admin notice
    if (userRole === 'admin') {
      doc.rect(leftMargin, currentY, contentWidth, 30)
         .fill('#fffbeb')
         .stroke('#f59e0b');
      
      doc.fillColor(warningColor)
         .fontSize(9)
         .font('Times-Bold')
         .text('Administrative Invoice', leftMargin + 15, currentY + 6);
      
      doc.fontSize(8)
         .font('Times-Roman')
         .text('This invoice was generated by an administrator on behalf of the customer', 
                leftMargin + 15, currentY + 18);
      
      currentY += 40;
    }
    
    // Fixed footer position at bottom of A4 page (A4 height: 841.89 points)
    const footerStartY = pageHeight - 165; // 165px from bottom for proper A4 alignment
    
    // Professional separator line
    doc.strokeColor('#9ca3af')
       .lineWidth(1)
       .moveTo(leftMargin, footerStartY)
       .lineTo(rightMargin, footerStartY)
       .stroke();
    
    // Center-aligned thank you message
    doc.fillColor(accentColor)
       .fontSize(16)
       .font('Times-Bold')
       .text('Thank you for choosing Us', leftMargin, footerStartY + 15, { 
         width: contentWidth, 
         align: 'center' 
       });
    
    // Center-aligned footer text
    doc.fillColor(textMedium)
       .fontSize(10)
       .font('Times-Roman')
       .text('This is an automatically generated invoice from our digital wallet system.', 
              leftMargin, footerStartY + 40, { width: contentWidth, align: 'center' });
    
    doc.text('For support and inquiries, please contact our customer service team.', 
             leftMargin, footerStartY + 55, { width: contentWidth, align: 'center' });
    
    // Center-aligned generation timestamp
    doc.fillColor(textLight)
       .fontSize(9)
       .font('Times-Roman')
       .text(`Generated on ${new Date().toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, leftMargin, footerStartY + 75, { width: contentWidth, align: 'center' });
    
    // Center-aligned invoice details
    doc.text(`Invoice: INV-${String(transaction.id).padStart(6, '0')} | Customer: ${transaction.user_id} | Transaction: ${transaction.id}`, 
             leftMargin, footerStartY + 90, { width: contentWidth, align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Invoice generation error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate invoice',
        error: error.message
      });
    }
  }
};

// Generate monthly statement PDF
// Generate monthly statement PDF - Professional Design
export const generateMonthlyStatement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    // Validate month and year
    if (currentMonth < 1 || currentMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month provided'
      });
    }
    
    if (currentYear < 2020 || currentYear > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year provided'
      });
    }
    
    const user = await AnalyticsModel.getUserInfo(userId);
    const transactions = await AnalyticsModel.getUserMonthlyTransactions(userId, currentMonth, currentYear);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log(`Generating monthly statement for user ${userId}, ${currentMonth}/${currentYear}`);
    
    // Set response headers immediately
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="statement-${currentMonth}-${currentYear}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 }
    });
    
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

    // Pipe PDF directly to response
    doc.pipe(res);
    
    // Professional emerald theme colors
    const primaryColor = '#065f46';    // Emerald dark
    const secondaryColor = '#f0fdf4';  // Emerald light background
    const accentColor = '#10b981';     // Emerald accent
    const textDark = '#111827';        // Nearly black
    const textMedium = '#4b5563';      // Medium gray
    const textLight = '#6b7280';       // Light gray
    const successColor = '#059669';    // Emerald green
    const warningColor = '#d97706';    // Professional amber
    
    // Page dimensions for calculations
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftMargin = 60;
    const rightMargin = pageWidth - 60;
    const contentWidth = rightMargin - leftMargin;
    
    // Professional header with emerald theme
    doc.rect(0, 0, pageWidth, 100).fill(primaryColor);
    
    // Company name
    doc.fillColor('white')
       .fontSize(28)
       .font('Times-Bold')
       .text('PLATORA', leftMargin, 25);
    
    doc.fontSize(12)
       .font('Times-Roman')
       .text('Digital Wallet & Payment Solutions', leftMargin, 58);
    
    // Statement title - right aligned
    doc.fontSize(24)
       .font('Times-Bold')
       .text('STATEMENT', rightMargin - 150, 25, { width: 150, align: 'right' });
    
    doc.fontSize(10)
       .font('Times-Roman')
       .text('Monthly Report', rightMargin - 150, 55, { width: 150, align: 'right' });
    
    let currentY = 130;
    
    // Statement period and account info header
    doc.fillColor(textDark)
       .fontSize(16)
       .font('Times-Bold')
       .text('Statement Information', leftMargin, currentY);
    
    currentY += 25;
    
    // Create two-column layout
    const leftColumnX = leftMargin;
    const rightColumnX = leftMargin + (contentWidth / 2) + 30;
    const labelWidth = 100;
    const valueStartX = leftColumnX + labelWidth;
    
    // Left column - Statement details
    let leftY = currentY;
    
    // Statement Period
    doc.fontSize(10)
       .font('Times-Bold')
       .fillColor(textMedium)
       .text('Statement Period:', leftColumnX, leftY);
    
    const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(monthName, valueStartX, leftY);
    
    leftY += 18;
    
    // Date Range
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Date Range:', leftColumnX, leftY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(`${currentMonth}/01/${currentYear} - ${currentMonth}/${daysInMonth}/${currentYear}`, valueStartX, leftY);
    
    leftY += 18;
    
    // Statement ID
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Statement ID:', leftColumnX, leftY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(`STMT-${userId}-${currentMonth}-${currentYear}`, valueStartX, leftY);
    
    // Right column - Account information
    let rightY = currentY;
    
    doc.fontSize(16)
       .font('Times-Bold')
       .fillColor(textDark)
       .text('Account Information', rightColumnX, rightY - 25);
    
    const rightLabelWidth = 80;
    const rightValueStartX = rightColumnX + rightLabelWidth;
    
    // Account Name
    doc.fontSize(10)
       .font('Times-Bold')
       .fillColor(textMedium)
       .text('Name:', rightColumnX, rightY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A', rightValueStartX, rightY, {
         width: rightMargin - rightValueStartX - 10,
         ellipsis: true
       });
    
    rightY += 18;
    
    // Email
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Email:', rightColumnX, rightY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(user.email || 'N/A', rightValueStartX, rightY, { 
         width: rightMargin - rightValueStartX - 10,
         ellipsis: true 
       });
    
    rightY += 18;
    
    // Account ID
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Account ID:', rightColumnX, rightY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(userId.toString(), rightValueStartX, rightY);
    
    currentY = Math.max(leftY, rightY) + 35;
    
    // Summary statistics calculation
    const totalTransactions = transactions.length;
    const coinsSpent = Math.abs(transactions.filter(t => t.transaction_type === 'SPEND').reduce((sum, t) => sum + (t.amount_coins || 0), 0));
    const coinsPurchased = transactions.filter(t => t.transaction_type === 'PURCHASE').reduce((sum, t) => sum + (t.amount_coins || 0), 0);
    const totalRefunds = transactions.filter(t => t.transaction_type === 'REFUND').reduce((sum, t) => sum + (t.amount_coins || 0), 0);
    const netBalance = coinsPurchased - coinsSpent + totalRefunds;
    
    // Professional summary section
    doc.fontSize(16)
       .font('Times-Bold')
       .fillColor(textDark)
       .text('Monthly Summary', leftMargin, currentY);
    
    currentY += 25;
    
    // Summary boxes with professional styling
    const boxWidth = 120;
    const boxHeight = 45;
    const boxSpacing = 15;
    
    const summaryData = [
      { label: 'Total Transactions', value: totalTransactions, color: accentColor },
      { label: 'Coins Purchased', value: coinsPurchased, color: successColor },
      { label: 'Coins Spent', value: coinsSpent, color: '#dc2626' },
      { label: 'Net Balance', value: netBalance, color: textDark }
    ];
    
    summaryData.forEach((item, index) => {
      const x = leftMargin + index * (boxWidth + boxSpacing);
      
      // Professional box styling
      doc.rect(x, currentY, boxWidth, boxHeight)
         .fill('#f8fafc')
         .stroke('#e2e8f0');
      
      // Value
      doc.fillColor(item.color)
         .fontSize(16)
         .font('Times-Bold')
         .text(item.value.toLocaleString(), x + 10, currentY + 8, { 
           width: boxWidth - 20, 
           align: 'center' 
         });
      
      // Label
      doc.fillColor(textMedium)
         .fontSize(9)
         .font('Times-Roman')
         .text(item.label, x + 10, currentY + 30, { 
           width: boxWidth - 20, 
           align: 'center' 
         });
    });
    
    currentY += boxHeight + 35;
    
    // Transaction history section
    doc.fontSize(16)
       .font('Times-Bold')
       .fillColor(textDark)
       .text('Transaction History', leftMargin, currentY);
    
    currentY += 25;
    
    if (transactions.length > 0) {
      // Professional table design
      const tableStartY = currentY;
      const headerHeight = 25;
      const maxRows = 12; // Limit for A4 compliance
      const rowHeight = 18;
      const totalTableHeight = headerHeight + (Math.min(transactions.length, maxRows) * rowHeight);
      
      // Table background
      doc.rect(leftMargin, tableStartY, contentWidth, totalTableHeight)
         .fill(secondaryColor)
         .stroke('#d1d5db');
      
      // Table header
      doc.rect(leftMargin, tableStartY, contentWidth, headerHeight)
         .fill('#f3f4f6')
         .stroke('#9ca3af');
      
      // Column definitions
      const colWidths = [80, 180, 80, 80, 85, 70];
      let colX = leftMargin + 10;
      
      doc.fillColor(textDark)
         .fontSize(9)
         .font('Times-Bold');
      
      const headers = ['Date', 'Description', 'Type', 'Amount', 'Value (LKR)', 'Status'];
      
      headers.forEach((header, index) => {
        doc.text(header, colX, tableStartY + 8, { 
          width: colWidths[index] - 5, 
          align: 'left' 
        });
        colX += colWidths[index];
      });
      
      // Transaction rows
      let rowY = tableStartY + headerHeight;
      const displayTransactions = transactions.slice(0, maxRows);
      
      displayTransactions.forEach((transaction, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        
        // Row background
        doc.rect(leftMargin, rowY, contentWidth, rowHeight)
           .fill(rowColor);
        
        colX = leftMargin + 10;
        
        // Date
        doc.fillColor(textDark)
           .fontSize(8)
           .font('Times-Roman')
           .text(new Date(transaction.created_at).toLocaleDateString('en-US', {
             month: 'short',
             day: 'numeric'
           }), colX, rowY + 6);
        colX += colWidths[0];
        
        // Description
        const description = (transaction.description || 'Transaction').substring(0, 30) + 
                           ((transaction.description || '').length > 30 ? '...' : '');
        doc.text(description, colX, rowY + 6, { width: colWidths[1] - 5 });
        colX += colWidths[1];
        
        // Type with color
        const typeColor = transaction.transaction_type === 'PURCHASE' ? successColor : 
                         transaction.transaction_type === 'SPEND' ? '#dc2626' : accentColor;
        
        doc.fillColor(typeColor)
           .fontSize(8)
           .font('Times-Bold')
           .text(transaction.transaction_type || 'N/A', colX, rowY + 6);
        colX += colWidths[2];
        
        // Amount with sign and color
        const coins = transaction.amount_coins || 0;
        const coinSign = coins > 0 ? '+' : '';
        
        doc.fillColor(typeColor)
           .fontSize(8)
           .font('Times-Bold')
           .text(`${coinSign}${coins}`, colX, rowY + 6);
        colX += colWidths[3];
        
        // Value
        doc.fillColor(textMedium)
           .fontSize(8)
           .font('Times-Roman')
           .text(transaction.amount_money ? 
                 `${transaction.currency || 'LKR'} ${parseFloat(transaction.amount_money).toFixed(2)}` : 
                 '-', colX, rowY + 6);
        colX += colWidths[4];
        
        // Status
        const statusColor = transaction.status === 'COMPLETED' ? successColor : 
                           transaction.status === 'PENDING' ? warningColor : '#dc2626';
        
        doc.fillColor(statusColor)
           .fontSize(7)
           .font('Times-Bold')
           .text(transaction.status || 'COMPLETED', colX, rowY + 7);
        
        rowY += rowHeight;
      });
      
      currentY = rowY + 15;
      
      // Show remaining transactions count
      if (transactions.length > maxRows) {
        doc.fillColor(textMedium)
           .fontSize(9)
           .font('Times-Italic')
           .text(`... and ${transactions.length - maxRows} more transactions`, leftMargin, currentY);
        currentY += 20;
      }
      
    } else {
      // No transactions message
      doc.rect(leftMargin, currentY, contentWidth, 40)
         .fill('#f9fafb')
         .stroke('#e5e7eb');
      
      doc.fillColor(textMedium)
         .fontSize(12)
         .font('Times-Italic')
         .text('No transactions found for this period.', leftMargin, currentY + 15, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      currentY += 60;
    }
    
    // Fixed footer position for A4 compliance
    const footerStartY = pageHeight - 100;
    
    // Professional separator line
    doc.strokeColor('#9ca3af')
       .lineWidth(1)
       .moveTo(leftMargin, footerStartY)
       .lineTo(rightMargin, footerStartY)
       .stroke();
    
    // Center-aligned thank you message
    doc.fillColor(accentColor)
       .fontSize(14)
       .font('Times-Bold')
       .text('Thank you for choosing Us', leftMargin, footerStartY + 12, { 
         width: contentWidth, 
         align: 'center' 
       });
    
    // Center-aligned footer text
    doc.fillColor(textMedium)
       .fontSize(9)
       .font('Times-Roman')
       .text('This is an automatically generated monthly statement from our digital wallet system.', 
              leftMargin, footerStartY + 32, { width: contentWidth, align: 'center' });
    
    doc.text('For support and inquiries, please contact our customer service team.', 
             leftMargin, footerStartY + 45, { width: contentWidth, align: 'center' });
    
    // Center-aligned generation timestamp
    doc.fillColor(textLight)
       .fontSize(8)
       .font('Times-Roman')
       .text(`Generated on ${new Date().toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, leftMargin, footerStartY + 65, { width: contentWidth, align: 'center' });
    
    // Center-aligned statement details
    doc.text(`Statement: STMT-${userId}-${currentMonth}-${currentYear} | Period: ${monthName}`, 
             leftMargin, footerStartY + 80, { width: contentWidth, align: 'center' });
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Statement generation error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate statement',
        error: error.message
      });
    }
  }
};

// Generate statement for selected date range and filters (Admin version) - Professional Design
export const generateAdminStatement = async (req, res) => {
  try {
    const { startDate, endDate, transactionType, status } = req.query;
    
    // Validate date inputs
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    console.log(`Generating admin statement for ${startDate} to ${endDate}`);
    
    // Get filtered transactions for admin
    const filters = {
      startDate: startDate + 'T00:00:00Z',
      endDate: endDate + 'T23:59:59Z',
      transactionType,
      status,
      limit: 10000 // High limit for admin reports
    };
    
    const transactions = await AnalyticsModel.getTransactionExportData(filters);
    
    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found for the specified criteria'
      });
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="admin-report-${startDate}-to-${endDate}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 }
    });
    
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

    // Pipe PDF directly to response
    doc.pipe(res);
    
    // Professional emerald theme colors
    const primaryColor = '#065f46';    // Emerald dark
    const secondaryColor = '#f0fdf4';  // Emerald light background
    const accentColor = '#10b981';     // Emerald accent
    const textDark = '#111827';        // Nearly black
    const textMedium = '#4b5563';      // Medium gray
    const textLight = '#6b7280';       // Light gray
    const successColor = '#059669';    // Emerald green
    const warningColor = '#d97706';    // Professional amber
    
    // Page dimensions for calculations
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftMargin = 60;
    const rightMargin = pageWidth - 60;
    const contentWidth = rightMargin - leftMargin;
    
    // Professional header with emerald theme
    doc.rect(0, 0, pageWidth, 100).fill(primaryColor);
    
    // Company name
    doc.fillColor('white')
       .fontSize(28)
       .font('Times-Bold')
       .text('PLATORA', leftMargin, 25);
    
    doc.fontSize(12)
       .font('Times-Roman')
       .text('Digital Wallet & Payment Solutions', leftMargin, 58);
    
    // Admin report title - right aligned
    doc.fontSize(22)
       .font('Times-Bold')
       .text('ADMIN REPORT', rightMargin - 160, 25, { width: 160, align: 'right' });
    
    doc.fontSize(10)
       .font('Times-Roman')
       .text('Transaction Analysis', rightMargin - 160, 55, { width: 160, align: 'right' });
    
    let currentY = 130;
    
    // Report information header - single column layout
    doc.fillColor(textDark)
       .fontSize(16)
       .font('Times-Bold')
       .text('Report Information', leftMargin, currentY);
    
    currentY += 25;
    
    // Single column layout for better alignment
    const labelWidth = 120;
    const valueStartX = leftMargin + labelWidth;
    
    // Report Period
    doc.fontSize(10)
       .font('Times-Bold')
       .fillColor(textMedium)
       .text('Report Period:', leftMargin, currentY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(`${start.toLocaleDateString('en-US')} - ${end.toLocaleDateString('en-US')}`, valueStartX, currentY);
    
    currentY += 18;
    
    // Date Range
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Date Range:', leftMargin, currentY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(`${startDate} to ${endDate}`, valueStartX, currentY);
    
    currentY += 18;
    
    // Transaction Type Filter
    if (transactionType) {
      doc.font('Times-Bold')
         .fillColor(textMedium)
         .text('Transaction Type:', leftMargin, currentY);
      
      doc.font('Times-Roman')
         .fillColor(textDark)
         .text(transactionType, valueStartX, currentY);
      
      currentY += 18;
    }
    
    // Status Filter
    if (status) {
      doc.font('Times-Bold')
         .fillColor(textMedium)
         .text('Status Filter:', leftMargin, currentY);
      
      doc.font('Times-Roman')
         .fillColor(textDark)
         .text(status, valueStartX, currentY);
      
      currentY += 18;
    }
    
    // Total Transactions
    doc.font('Times-Bold')
       .fillColor(textMedium)
       .text('Total Transactions:', leftMargin, currentY);
    
    doc.font('Times-Roman')
       .fillColor(textDark)
       .text(transactions.length.toLocaleString(), valueStartX, currentY);
    
    currentY += 35;
    
    // Summary statistics calculation
    const totalCoins = transactions.reduce((sum, t) => sum + Math.abs(t.amount_coins || 0), 0);
    const totalValue = transactions.reduce((sum, t) => sum + (parseFloat(t.amount_money) || 0), 0);
    const purchaseCount = transactions.filter(t => t.transaction_type === 'PURCHASE').length;
    const spendCount = transactions.filter(t => t.transaction_type === 'SPEND').length;
    const refundCount = transactions.filter(t => t.transaction_type === 'REFUND').length;
    const completedCount = transactions.filter(t => t.status === 'COMPLETED').length;
    
    // Professional summary section
    doc.fontSize(16)
       .font('Times-Bold')
       .fillColor(textDark)
       .text('Summary Analytics', leftMargin, currentY);
    
    currentY += 25;
    
    // Summary statistics in professional grid
    const summaryData = [
      { label: 'Total Transactions', value: transactions.length.toLocaleString(), color: accentColor },
      { label: 'Purchase Count', value: purchaseCount.toLocaleString(), color: successColor },
      { label: 'Spend Count', value: spendCount.toLocaleString(), color: '#dc2626' },
      { label: 'Refund Count', value: refundCount.toLocaleString(), color: '#f59e0b' },
      { label: 'Total Coins', value: totalCoins.toLocaleString(), color: textDark },
      { label: 'Total Value (LKR)', value: `Rs. ${totalValue.toLocaleString()}`, color: textDark }
    ];
    
    // Display summary in 2x3 grid with better alignment
    summaryData.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = leftMargin + col * 250;
      const yPos = currentY + row * 22;
      
      doc.fontSize(10)
         .font('Times-Bold')
         .fillColor(textMedium)
         .text(`${item.label}:`, x, yPos);
      
      doc.font('Times-Roman')
         .fillColor(item.color)
         .text(item.value, x + 130, yPos);
    });
    
    currentY += (Math.ceil(summaryData.length / 2) * 22) + 35;
    
    // Transaction details section
    doc.fontSize(16)
       .font('Times-Bold')
       .fillColor(textDark)
       .text('Transaction Details', leftMargin, currentY);
    
    currentY += 25;
    
    // Calculate how many transactions can fit on current page
    const availableSpace = pageHeight - currentY - 120; // Reserve space for footer
    const rowHeight = 16;
    const headerHeight = 25;
    const maxRowsOnFirstPage = Math.floor((availableSpace - headerHeight) / rowHeight);
    const maxRowsOnSubsequentPages = Math.floor((pageHeight - 120 - headerHeight) / rowHeight);
    
    let transactionsProcessed = 0;
    let currentPageRows = 0;
    let isFirstPage = true;
    
    // Function to draw table header (removed restaurant column)
    const drawTableHeader = (y) => {
      // Table header background
      doc.rect(leftMargin, y, contentWidth, headerHeight)
         .fill('#f3f4f6')
         .stroke('#9ca3af');
      
      // Column definitions (removed restaurant column)
      const colWidths = [80, 150, 80, 90, 100, 85];
      let colX = leftMargin + 10;
      
      doc.fillColor(textDark)
         .fontSize(10)
         .font('Times-Bold');
      
      const headers = ['Date', 'Customer', 'Type', 'Amount', 'Value (LKR)', 'Status'];
      
      headers.forEach((header, index) => {
        doc.text(header, colX, y + 8, { 
          width: colWidths[index] - 8, 
          align: 'left' 
        });
        colX += colWidths[index];
      });
      
      return y + headerHeight;
    };
    
    // Draw initial table header
    let tableY = drawTableHeader(currentY);
    currentY = tableY;
    
    // Process transactions (removed restaurant column)
    transactions.forEach((transaction, index) => {
      const maxRows = isFirstPage ? maxRowsOnFirstPage : maxRowsOnSubsequentPages;
      
      // Check if we need a new page
      if (currentPageRows >= maxRows) {
        doc.addPage();
        currentY = 60;
        tableY = drawTableHeader(currentY);
        currentY = tableY;
        currentPageRows = 0;
        isFirstPage = false;
      }
      
      // Row background
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
      doc.rect(leftMargin, currentY, contentWidth, rowHeight)
         .fill(rowColor);
      
      // Column data (removed restaurant column)
      const colWidths = [80, 150, 80, 90, 100, 85];
      let colX = leftMargin + 10;
      
      // Date
      doc.fillColor(textDark)
         .fontSize(9)
         .font('Times-Roman')
         .text(new Date(transaction.created_at).toLocaleDateString('en-US', {
           month: 'short',
           day: 'numeric',
           year: '2-digit'
         }), colX, currentY + 4);
      colX += colWidths[0];
      
      // Customer
      const customerName = (transaction.customer_name || 'Unknown').substring(0, 22) + 
                          ((transaction.customer_name || '').length > 22 ? '...' : '');
      doc.text(customerName, colX, currentY + 4, { width: colWidths[1] - 8 });
      colX += colWidths[1];
      
      // Type with color
      const typeColor = transaction.transaction_type === 'PURCHASE' ? successColor : 
                       transaction.transaction_type === 'SPEND' ? '#dc2626' : accentColor;
      
      doc.fillColor(typeColor)
         .fontSize(9)
         .font('Times-Bold')
         .text(transaction.transaction_type || 'N/A', colX, currentY + 4);
      colX += colWidths[2];
      
      // Amount
      doc.fillColor(typeColor)
         .fontSize(9)
         .font('Times-Bold')
         .text(`${Math.abs(transaction.amount_coins || 0)}`, colX, currentY + 4);
      colX += colWidths[3];
      
      // Value
      doc.fillColor(textDark)
         .fontSize(9)
         .font('Times-Roman')
         .text(transaction.amount_money ? 
               `${transaction.currency || 'LKR'} ${parseFloat(transaction.amount_money).toFixed(2)}` : 
               '-', colX, currentY + 4);
      colX += colWidths[4];
      
      // Status
      const statusColor = transaction.status === 'COMPLETED' ? successColor : 
                         transaction.status === 'PENDING' ? warningColor : '#dc2626';
      
      doc.fillColor(statusColor)
         .fontSize(8)
         .font('Times-Bold')
         .text(transaction.status || 'PENDING', colX, currentY + 5);
      
      currentY += rowHeight;
      currentPageRows++;
      transactionsProcessed++;
    });
    
    // Create short report ID
    const reportId = `AR-${String(Date.now()).slice(-6)}`;
    
    // Fixed footer position for A4 compliance
    const footerStartY = pageHeight - 100;
    
    // Professional separator line
    doc.strokeColor('#9ca3af')
       .lineWidth(1)
       .moveTo(leftMargin, footerStartY)
       .lineTo(rightMargin, footerStartY)
       .stroke();
    
    // Center-aligned thank you message
    doc.fillColor(accentColor)
       .fontSize(14)
       .font('Times-Bold')
       .text('Thank you for choosing Us', leftMargin, footerStartY + 12, { 
         width: contentWidth, 
         align: 'center' 
       });
    
    // Center-aligned footer text
    doc.fillColor(textMedium)
       .fontSize(9)
       .font('Times-Roman')
       .text('This is an automatically generated administrative report from our digital wallet system.', 
              leftMargin, footerStartY + 32, { width: contentWidth, align: 'center' });
    
    doc.text('For support and inquiries, please contact our customer service team.', 
             leftMargin, footerStartY + 45, { width: contentWidth, align: 'center' });
    
    // Center-aligned generation timestamp
    doc.fillColor(textLight)
       .fontSize(8)
       .font('Times-Roman')
       .text(`Generated on ${new Date().toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, leftMargin, footerStartY + 65, { width: contentWidth, align: 'center' });
    
    // Center-aligned report details
    doc.text(`Report: ${reportId} | Period: ${startDate} to ${endDate}`, 
             leftMargin, footerStartY + 80, { width: contentWidth, align: 'center' });
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Admin statement generation error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate admin statement',
        error: error.message
      });
    }
  }
};

// Get all transactions for admin with filters
export const getAdminTransactions = async (req, res) => {
  try {
    const { startDate, endDate, transactionType, status, page = 1, limit = 50 } = req.query;
    
    const filters = {
      startDate: startDate ? startDate + 'T00:00:00Z' : null,
      endDate: endDate ? endDate + 'T23:59:59Z' : null,
      transactionType,
      status,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
    
    const transactions = await AnalyticsModel.getAdminTransactionData(filters);
    const totalCount = await AnalyticsModel.getAdminTransactionCount(filters);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: parseInt(page) * parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error getting admin transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
};

// Get dashboard analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    console.log('Analytics request received:', req.query);
    
    const { startDate, endDate } = req.query;
    
    const start = startDate 
      ? new Date(startDate + 'T00:00:00Z').toISOString() 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate 
      ? new Date(endDate + 'T23:59:59Z').toISOString() 
      : new Date().toISOString();
    
    console.log('Processed date range:', { start, end });
    
    const dbHealth = await AnalyticsModel.checkDatabaseHealth();
    console.log('Database health check:', dbHealth);
    
    const results = await Promise.allSettled([
      AnalyticsModel.getCustomerAnalytics(start, end),
      AnalyticsModel.getTransactionAnalytics(start, end),
      AnalyticsModel.getRestaurantPerformanceAnalytics(start, end),
      AnalyticsModel.getPlatformRevenueAnalytics(start, end),
      AnalyticsModel.getTopSpendingCustomers(start, end, 5)
    ]);
    
    const [
      customerResult,
      transactionResult,
      restaurantResult,
      platformResult,
      customersResult
    ] = results;
    
    const customerAnalytics = customerResult.status === 'fulfilled' 
      ? customerResult.value 
      : {
          total_customers: 0,
          active_customers: 0,
          total_coins_in_circulation: 0,
          avg_balance_per_customer: 0,
          customers_with_transactions: 0
        };
    
    const transactionAnalytics = transactionResult.status === 'fulfilled' 
      ? transactionResult.value 
      : [];
    
    const restaurantAnalytics = restaurantResult.status === 'fulfilled' 
      ? restaurantResult.value 
      : [];
    
    const platformRevenue = platformResult.status === 'fulfilled' 
      ? platformResult.value 
      : [];
    
    const topCustomers = customersResult.status === 'fulfilled' 
      ? customersResult.value 
      : [];
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const queryNames = ['customer', 'transaction', 'restaurant', 'platform', 'customers'];
        console.error(`${queryNames[index]} analytics failed:`, result.reason);
      }
    });
    
    const response = {
      success: true,
      period: { start, end },
      dbHealth,
      analytics: {
        customers: customerAnalytics,
        transactions: transactionAnalytics,
        restaurants: restaurantAnalytics,
        platformRevenue,
        topCustomers
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Critical error in getDashboardAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
};

// Get transaction trends
export const getTransactionTrends = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate 
      ? new Date(startDate + 'T00:00:00Z').toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate 
      ? new Date(endDate + 'T23:59:59Z').toISOString()
      : new Date().toISOString();
    
    const trends = await AnalyticsModel.getDailyTransactionTrends(start, end);
    
    res.json({
      success: true,
      period: { start, end },
      trends
    });
    
  } catch (error) {
    console.error('Error getting transaction trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction trends',
      error: error.message
    });
  }
};

// Export transactions
export const exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, transactionType, format = 'csv' } = req.query;
    
    const filters = {
      startDate: startDate ? new Date(startDate + 'T00:00:00Z').toISOString() : null,
      endDate: endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : null,
      transactionType,
      limit: 10000
    };
    
    const transactions = await AnalyticsModel.getTransactionExportData(filters);
    
    if (format === 'csv') {
      const fields = [
        'id',
        'created_at',
        'customer_name',
        'email',
        'transaction_type',
        'amount_coins',
        'amount_money',
        'currency',
        'description',
        'status',
        'order_id',
        'restaurant_name'
      ];
      
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(transactions);
      
      res.header('Content-Type', 'text/csv');
      res.attachment(`transactions_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: transactions,
        count: transactions.length
      });
    }
    
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: error.message
    });
  }
};

// Get customer spending analytics
export const getCustomerSpendingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    
    const start = startDate 
      ? new Date(startDate + 'T00:00:00Z').toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate 
      ? new Date(endDate + 'T23:59:59Z').toISOString()
      : new Date().toISOString();
    
    const topCustomers = await AnalyticsModel.getTopSpendingCustomers(start, end, limit || 20);
    
    res.json({
      success: true,
      period: { start, end },
      customers: topCustomers
    });
    
  } catch (error) {
    console.error('Error getting customer analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer analytics',
      error: error.message
    });
  }
};