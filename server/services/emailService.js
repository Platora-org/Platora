import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service configuration error:', error);
  } else {
    console.log('✅ Email service ready and verified');
  }
});

// KYC Approved Email
export const sendKYCApprovedEmail = async (email, firstName, restaurantName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '✅ KYC Approved - Wallet Activated',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .button { background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>KYC Approved!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Great news! Your KYC application for <strong>${restaurantName}</strong> has been approved.</p>
              
              <h3>✅ What's Now Available:</h3>
              <ul>
                <li>Your wallet has been activated with 0 balance</li>
                <li>You can now receive payments from customers</li>
                <li>Access to transaction history and reports</li>
                <li>Withdrawal functionality to your registered bank account</li>
              </ul>
              
              <p>You can start accepting orders immediately. Customer payments will be credited to your wallet after order completion.</p>
              
              <a href="${process.env.APP_URL}/restaurant/wallet" class="button">Access Your Wallet</a>
              
              <div class="footer">
                <p><strong>Need help?</strong> Contact our support team at support@foodcourt.com</p>
                <p>This is an automated email. Please do not reply directly to this message.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('KYC approval email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send KYC approval email:', error);
    throw error;
  }
};

// KYC Rejected Email
export const sendKYCRejectedEmail = async (email, firstName, reason, restaurantName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '⚠️ KYC Application - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .reason-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>KYC Application Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Your KYC application for <strong>${restaurantName}</strong> requires attention.</p>
              
              <div class="reason-box">
                <h3>📋 Reason for Rejection:</h3>
                <p>${reason}</p>
              </div>
              
              <h3>📝 What to do next:</h3>
              <ol>
                <li>Review the rejection reason above</li>
                <li>Prepare the correct documents/information</li>
                <li>Log in to your account</li>
                <li>Resubmit your KYC application with the required corrections</li>
              </ol>
              
              <p>Once you've addressed the issues, your application will be reviewed again within 1-2 business days.</p>
              
              <a href="${process.env.APP_URL}/restaurant/wallet" class="button">Resubmit KYC Application</a>
              
              <div class="footer">
                <p><strong>Need assistance?</strong> Our support team is here to help at support@foodcourt.com</p>
                <p>This is an automated email. Please do not reply directly to this message.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('KYC rejection email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send KYC rejection email:', error);
    throw error;
  }
};

// KYC Submitted Confirmation Email
export const sendKYCSubmittedEmail = async (email, firstName, restaurantName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '📋 KYC Application Received',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .timeline { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>KYC Application Submitted</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>We've received your KYC application for <strong>${restaurantName}</strong>.</p>
              
              <div class="timeline">
                <h3>⏱️ What happens next:</h3>
                <ul>
                  <li><strong>Review Period:</strong> 1-2 business days</li>
                  <li><strong>Verification:</strong> Our team will verify your documents</li>
                  <li><strong>Notification:</strong> You'll receive an email once reviewed</li>
                  <li><strong>Wallet Activation:</strong> Upon approval, your wallet will be activated</li>
                </ul>
              </div>
              
              <p>No action is required from your side. We'll notify you as soon as the review is complete.</p>
              
              <div class="footer">
                <p><strong>Questions?</strong> Contact support@foodcourt.com</p>
                <p>Reference ID: KYC-${Date.now()}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('KYC submission email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send KYC submission email:', error);
  }
};

// Purchase Confirmation Email
export const sendPurchaseConfirmation = async (userData, transactionData) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userData.email,
      subject: '🪙 Coin Purchase Confirmed - Platora Wallet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .transaction-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .amount { font-size: 32px; font-weight: bold; color: #10b981; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Purchase Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${userData.firstName},</p>
              <p>Your coin purchase was successful!</p>
              
              <div class="transaction-box">
                <p><strong>Transaction Details:</strong></p>
                <p class="amount">${transactionData.coins} Coins</p>
                <p>Amount Paid: ${transactionData.currencySymbol || ''}${transactionData.amount} ${transactionData.currency}</p>
                <p>Transaction ID: ${transactionData.id}</p>
                <p>Date: ${new Date(transactionData.date).toLocaleString()}</p>
              </div>
              
              <p>Your new balance: <strong>${transactionData.newBalance} coins</strong></p>
              <p>Start ordering delicious food now!</p>
            </div>
            <div class="footer">
              <p>Platora Food Court Digital Wallet</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Purchase confirmation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send purchase confirmation email:', error);
    throw error;
  }
};

// Transaction Receipt Email
export const sendTransactionReceipt = async (userData, transactionData) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userData.email,
      subject: '🧾 Transaction Receipt - Platora Wallet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f2937; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .coins { font-size: 28px; font-weight: bold; color: #dc2626; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Transaction Receipt</h1>
            </div>
            <div class="content">
              <p>Hi ${userData.firstName},</p>
              <p>You've successfully completed a purchase!</p>
              
              <div class="receipt-box">
                <p><strong>Transaction Details:</strong></p>
                <p class="coins">-${transactionData.coinsSpent} Coins</p>
                <p>Restaurant: ${transactionData.restaurantName || 'N/A'}</p>
                <p>Order: ${transactionData.orderId || 'N/A'}</p>
                <p>Transaction ID: ${transactionData.id}</p>
                <p>Date: ${new Date(transactionData.date).toLocaleString()}</p>
              </div>
              
              <p>Remaining balance: <strong>${transactionData.remainingBalance} coins</strong></p>
            </div>
            <div class="footer">
              <p>Platora Food Court Digital Wallet</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Transaction receipt email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send transaction receipt email:', error);
    throw error;
  }
};

// Low Balance Alert Email
export const sendLowBalanceAlert = async (userData, balance) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userData.email,
      subject: '⚠️ Low Balance Alert - Platora Wallet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Low Balance Alert</h1>
            </div>
            <div class="content">
              <p>Hi ${userData.firstName},</p>
              <p>Your wallet balance is running low!</p>
              
              <div class="alert-box">
                <p>Current Balance: <strong>${balance} coins</strong></p>
                <p>This may not be enough for your next order.</p>
              </div>
              
              <p>Top up now to keep enjoying delicious food!</p>
              <a href="${process.env.APP_URL}/wallet" class="button">Add Coins Now</a>
            </div>
            <div class="footer">
              <p>Platora Food Court Digital Wallet</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Low balance alert email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send low balance alert email:', error);
    throw error;
  }
};

// Payout Notification Email (for restaurants)
export const sendPayoutNotification = async (restaurantData, payoutData) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: restaurantData.email,
      subject: '💰 Monthly Payout Processed - Platora',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .payout-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .amount { font-size: 32px; font-weight: bold; color: #3b82f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payout Processed</h1>
            </div>
            <div class="content">
              <p>Hi ${restaurantData.name},</p>
              <p>Your monthly payout has been processed!</p>
              
              <div class="payout-box">
                <p><strong>Payout Details:</strong></p>
                <p class="amount">Rs. ${payoutData.amountLKR.toLocaleString()}</p>
                <p>Period: ${payoutData.month}/${payoutData.year}</p>
                <p>Total Transactions: ${payoutData.transactionCount}</p>
                <p>Bank Account: ${payoutData.bankAccount}</p>
              </div>
              
              <p>Funds should arrive in 2-3 business days.</p>
            </div>
            <div class="footer">
              <p>Platora Food Court Admin</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Payout notification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send payout notification email:', error);
    throw error;
  }
};