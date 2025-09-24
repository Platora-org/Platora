import {
  checkExistingKYC,
  createOrUpdateKYC,
  getKYCStatusWithUser,
  getPendingKYCRequests,
  getKYCById,
  approveKYC,
  rejectKYC,
  getAllKYCRequestsWithFilter, // Use the correct import name
  getKYCStatistics as getKYCStatisticsFromDB // Rename to avoid conflict
} from "../models/kycModel.js";
import { createWallet, getWalletByUserId } from "../models/walletModel.js";
import { validateKYCData } from "../utils/validators.js";
import { createAuditLog } from "../models/auditModel.js";
import { 
  sendKYCSubmittedEmail, 
  sendKYCApprovedEmail, 
  sendKYCRejectedEmail 
} from "../services/emailService.js"; 
import path from 'path';
import fs from 'fs';

// Helper function to get IP address
const getClientIp = (req) => {
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         'Unknown';
};

// Get KYC status and user info
export const getKYCStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = await getKYCStatusWithUser(userId);
    
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare response based on KYC status
    const response = {
      user: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        restaurant_name: userData.restaurant_name,
        email: userData.email
      },
      kycStatus: userData.status || 'NOT_SUBMITTED'
    };

    // Include KYC data if exists
    if (userData.status) {
      response.kycData = {
        status: userData.status,
        tin_number: userData.tin_number,
        bank_account_number: userData.bank_account_number,
        bank_name: userData.bank_name,
        branch: userData.branch,
        rejection_reason: userData.rejection_reason,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };
    }

    res.json(response);
  } catch (err) {
    console.error("Get KYC Status Error:", err);
    res.status(500).json({ error: "Failed to fetch KYC status" });
  }
};

// Upload/Update KYC with Email Notification
export const uploadKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tin_number, bank_account_number, bank_name, branch } = req.body;

    // Server-side validation
    const validation = validateKYCData({
      tin_number,
      bank_account_number,
      bank_name,
      branch
    });

    if (!validation.isValid) {
      return res.status(400).json({ 
        error: "Validation failed",
        errors: validation.errors 
      });
    }

    // Check files
    const nicDoc = req.files?.nic_doc?.[0]?.path;
    const businessRegDoc = req.files?.business_reg_doc?.[0]?.path;

    if (!nicDoc || !businessRegDoc) {
      return res.status(400).json({ 
        error: "Both NIC and Business Registration documents are required" 
      });
    }

    // Check existing KYC
    const existingKYC = await checkExistingKYC(userId);
    
    if (existingKYC?.status === 'APPROVED') {
      return res.status(400).json({ 
        error: "KYC already approved. Contact support for changes." 
      });
    }

    if (existingKYC?.status === 'PENDING') {
      return res.status(400).json({ 
        error: "KYC application already submitted and under review." 
      });
    }

    // Create or update KYC (allows resubmission if rejected)
    const kyc = await createOrUpdateKYC({
      userId,
      nicDoc,
      businessRegDoc,
      tinNumber: tin_number,
      bankAccountNumber: bank_account_number,
      bankName: bank_name,
      branch
    });

    // 📧 SEND KYC SUBMISSION EMAIL
    try {
      // Get user data for email
      const userData = await getKYCStatusWithUser(userId);
      if (userData) {
        await sendKYCSubmittedEmail(
          userData.email,
          userData.first_name,
          userData.restaurant_name
        );
        console.log('KYC submission email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send KYC submission email:', emailError);
      // Don't fail the main operation if email fails
    }

    res.status(201).json({ 
      message: existingKYC?.status === 'REJECTED' 
        ? "KYC resubmitted successfully" 
        : "KYC submitted successfully",
      kycData: {
        status: kyc.status,
        created_at: kyc.created_at
      }
    });
  } catch (err) {
    console.error("KYC Upload Error:", err);
    res.status(500).json({ error: "Failed to submit KYC" });
  }
};

// Fetch pending KYC requests (admin)
export const fetchPendingKYCRequests = async (req, res) => {
  try {
    const kycRequests = await getPendingKYCRequests();
    res.json({
      count: kycRequests.length,
      requests: kycRequests
    });
  } catch (err) {
    console.error("Fetch KYC Requests Error:", err);
    res.status(500).json({ error: "Failed to fetch KYC requests" });
  }
};

// Approve KYC request with Email Notification
export const approveKYCRequest = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { kycId } = req.params;
    const ipAddress = getClientIp(req);
    const userAgent = req.get('user-agent') || 'Unknown';

    // Validate KYC exists
    const kycRequest = await getKYCById(kycId);
    if (!kycRequest) {
      return res.status(404).json({ error: "KYC request not found" });
    }

    if (kycRequest.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `KYC already ${kycRequest.status.toLowerCase()}` 
      });
    }

    // Approve KYC
    const approvedKYC = await approveKYC(kycId, adminId);

    // Create wallet if doesn't exist
    const existingWallet = await getWalletByUserId(approvedKYC.restaurant_id);
    if (!existingWallet) {
      await createWallet({ 
        userId: approvedKYC.restaurant_id,
        userType: 'RESTAURANT'
      });
    }

    // Create audit log
    await createAuditLog({
      kycId: parseInt(kycId),
      adminId,
      action: 'APPROVED',
      details: `KYC approved and wallet ${existingWallet ? 'already existed' : 'created'}`,
      ipAddress,
      userAgent
    });

    // 📧 SEND KYC APPROVAL EMAIL
    try {
      // Get updated KYC data with user info
      const updatedKYC = await getKYCById(kycId);
      if (updatedKYC) {
        await sendKYCApprovedEmail(
          updatedKYC.email,
          updatedKYC.first_name,
          updatedKYC.restaurant_name
        );
        console.log('KYC approval email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send KYC approval email:', emailError);
      // Don't fail the main operation if email fails
    }

    res.json({ 
      message: "KYC approved and wallet created successfully",
      kycId: approvedKYC.id
    });
  } catch (err) {
    console.error("Approve KYC Error:", err);
    res.status(500).json({ error: "Failed to approve KYC" });
  }
};

// Reject KYC request with Email Notification
export const rejectKYCRequest = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { kycId } = req.params;
    const { reason } = req.body;
    const ipAddress = getClientIp(req);
    const userAgent = req.get('user-agent') || 'Unknown';

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        error: "Please provide a detailed rejection reason (min 10 characters)" 
      });
    }

    // Validate KYC exists
    const kycRequest = await getKYCById(kycId);
    if (!kycRequest) {
      return res.status(404).json({ error: "KYC request not found" });
    }

    if (kycRequest.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Cannot reject KYC with status: ${kycRequest.status}` 
      });
    }

    // Reject KYC
    const rejectedKYC = await rejectKYC(kycId, adminId, reason);

    // Create audit log
    await createAuditLog({
      kycId: parseInt(kycId),
      adminId,
      action: 'REJECTED',
      details: `Rejection reason: ${reason}`,
      ipAddress,
      userAgent
    });

    // 📧 SEND KYC REJECTION EMAIL
    try {
      // Get KYC data with user info
      const kycData = await getKYCById(kycId);
      if (kycData) {
        await sendKYCRejectedEmail(
          kycData.email,
          kycData.first_name,
          reason,
          kycData.restaurant_name
        );
        console.log('KYC rejection email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send KYC rejection email:', emailError);
      // Don't fail the main operation if email fails
    }

    res.json({ 
      message: "KYC rejected successfully",
      kycId: rejectedKYC.id
    });
  } catch (err) {
    console.error("Reject KYC Error:", err);
    res.status(500).json({ error: "Failed to reject KYC" });
  }
};

// Get all KYC requests with optional status filter
export const getAllKYCRequests = async (req, res) => {
  try {
    const { status } = req.query;
    console.log("Fetching KYC requests with status:", status);
    
    const kycRequests = await getAllKYCRequestsWithFilter(status); 
    
    console.log(`Found ${kycRequests.length} KYC requests`);
    
    res.json({
      count: kycRequests.length,
      requests: kycRequests
    });
  } catch (err) {
    console.error("Get All KYC Requests Error:", err);
    res.status(500).json({ error: "Failed to fetch KYC requests" });
  }
};

// Get KYC statistics
export const getKYCStats = async (req, res) => {
  try {
    console.log("Fetching KYC statistics...");
    
    const stats = await getKYCStatisticsFromDB(); 
    
    console.log("Statistics fetched:", stats);
    res.json(stats);
  } catch (err) {
    console.error("Get KYC Statistics Error:", err);
    res.status(500).json({ error: "Failed to fetch KYC statistics" });
  }
};

// View document with audit
export const viewDocument = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { path: docPath, kycId } = req.query;
    const ipAddress = getClientIp(req);
    const userAgent = req.get('user-agent') || 'Unknown';
    
    if (!docPath) {
      return res.status(400).json({ error: "Document path required" });
    }

    if (kycId && !isNaN(parseInt(kycId))) {
      await createAuditLog({
        kycId: parseInt(kycId),
        adminId,
        action: 'VIEWED',
        details: `Viewed document: ${path.basename(docPath)}`,
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent') || 'Unknown'
      });
    }
    
    // Security check
    const safePath = path.normalize(docPath);
    if (safePath.includes('..')) {
      return res.status(403).json({ error: "Invalid path" });
    }
    
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Create audit log for document view
    if (kycId) {
      await createAuditLog({
        kycId: parseInt(kycId),
        adminId,
        action: 'VIEWED',
        details: `Viewed document: ${path.basename(safePath)}`,
        ipAddress,
        userAgent
      });
    }
    
    res.sendFile(path.resolve(safePath));
  } catch (err) {
    console.error("View Document Error:", err);
    res.status(500).json({ error: "Failed to retrieve document" });
  }
};