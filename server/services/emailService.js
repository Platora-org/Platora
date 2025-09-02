import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service error:', error);
  } else {
    console.log('Email service ready');
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
    // Don't throw - this is not critical
  }
};