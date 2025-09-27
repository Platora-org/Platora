import * as AnalyticsModel from '../models/analyticsModel.js';
import { Parser } from 'json2csv';
import puppeteer from 'puppeteer';

// Get dashboard analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const end = endDate || new Date().toISOString();
    
    const [
      customerAnalytics,
      transactionAnalytics,
      restaurantAnalytics,
      platformRevenue,
      topCustomers
    ] = await Promise.all([
      AnalyticsModel.getCustomerAnalytics(start, end),
      AnalyticsModel.getTransactionAnalytics(start, end),
      AnalyticsModel.getRestaurantPerformanceAnalytics(start, end),
      AnalyticsModel.getPlatformRevenueAnalytics(start, end),
      AnalyticsModel.getTopSpendingCustomers(start, end, 5)
    ]);
    
    res.json({
      success: true,
      period: { start, end },
      analytics: {
        customers: customerAnalytics,
        transactions: transactionAnalytics,
        restaurants: restaurantAnalytics,
        platformRevenue,
        topCustomers
      }
    });
    
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
};

// Get transaction trends
export const getTransactionTrends = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();
    
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

// Export transactions to CSV
export const exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, transactionType, format = 'csv' } = req.query;
    
    const filters = {
      startDate,
      endDate,
      transactionType,
      limit: 10000 // Prevent memory issues
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
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();
    
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

// Generate PDF invoice for transaction
export const generateTransactionInvoice = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    
    // Use model instead of direct query
    const transaction = await AnalyticsModel.getTransactionForInvoice(transactionId, userId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #10b981; }
          .invoice-details { margin-bottom: 30px; }
          .invoice-table { width: 100%; border-collapse: collapse; }
          .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .invoice-table th { background-color: #f8f9fa; }
          .total { font-size: 18px; font-weight: bold; color: #10b981; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Platora Food Court</div>
          <h2>Transaction Invoice</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Invoice #:</strong> INV-${transaction.id}</p>
          <p><strong>Date:</strong> ${new Date(transaction.created_at).toLocaleDateString()}</p>
          <p><strong>Customer:</strong> ${transaction.customer_name}</p>
          <p><strong>Email:</strong> ${transaction.email}</p>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${transaction.description}</td>
              <td>${transaction.transaction_type}</td>
              <td class="total">
                ${Math.abs(transaction.amount_coins)} coins
                ${transaction.amount_money ? `(${transaction.currency} ${transaction.amount_money})` : ''}
              </td>
              <td>${transaction.status}</td>
            </tr>
          </tbody>
        </table>
        
        ${transaction.restaurant_name ? `<p><strong>Restaurant:</strong> ${transaction.restaurant_name}</p>` : ''}
        ${transaction.reference_id ? `<p><strong>Order ID:</strong> ${transaction.reference_id}</p>` : ''}
        
        <div class="footer">
          <p>Thank you for using Platora Food Court Digital Wallet!</p>
          <p>This is an automated invoice. No signature required.</p>
        </div>
      </body>
      </html>
    `;
    
    // Generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });
    
    await browser.close();
    
    // Send PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${transaction.id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

// Generate monthly statement PDF
export const generateMonthlyStatement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();
    
    // Use models instead of direct queries
    const user = await AnalyticsModel.getUserInfo(userId);
    const transactions = await AnalyticsModel.getUserMonthlyTransactions(userId, currentMonth, currentYear);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .statement-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .statement-table th, .statement-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          .statement-table th { background-color: #f8f9fa; }
          .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Platora Wallet - Monthly Statement</h1>
          <h2>${currentMonth}/${currentYear}</h2>
          <p><strong>Customer:</strong> ${user.first_name} ${user.last_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
        </div>
        
        <table class="statement-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Coins</th>
              <th>Money</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
                <td>${t.description}</td>
                <td>${t.transaction_type}</td>
                <td>${t.amount_coins > 0 ? '+' : ''}${t.amount_coins}</td>
                <td>${t.amount_money ? t.currency + ' ' + t.amount_money : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <h3>Summary</h3>
          <p><strong>Total Transactions:</strong> ${transactions.length}</p>
          <p><strong>Coins Purchased:</strong> ${transactions.filter(t => t.transaction_type === 'PURCHASE').reduce((sum, t) => sum + t.amount_coins, 0)}</p>
          <p><strong>Coins Spent:</strong> ${Math.abs(transactions.filter(t => t.transaction_type === 'SPEND').reduce((sum, t) => sum + t.amount_coins, 0))}</p>
        </div>
      </body>
      </html>
    `;
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    
    await browser.close();
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="statement-${currentMonth}-${currentYear}.pdf"`
    });
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate statement',
      error: error.message
    });
  }
};