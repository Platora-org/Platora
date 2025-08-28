import {
  checkExistingKYC,
  createOrUpdateKYC,
  getKYCStatusWithUser,
  getPendingKYCRequests,
  getKYCById,
  approveKYC,
  rejectKYC
} from "../models/kycModel.js";
import { createWallet, getWalletByUserId } from "../models/walletModel.js";
import { validateKYCData } from "../utils/validators.js";

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

// Upload/Update KYC
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

// Approve KYC request (admin)
export const approveKYCRequest = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { kycId } = req.params;

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

    // Check if wallet already exists
    const existingWallet = await getWalletByUserId(approvedKYC.restaurant_id);
    
    if (!existingWallet) {
      // Create wallet for restaurant
      await createWallet({ 
        userId: approvedKYC.restaurant_id,
        userType: 'RESTAURANT'
      });
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

// Reject KYC request (admin)
export const rejectKYCRequest = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { kycId } = req.params;
    const { reason } = req.body;

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

    const rejectedKYC = await rejectKYC(kycId, adminId, reason);

    res.json({ 
      message: "KYC rejected successfully",
      kycId: rejectedKYC.id
    });
  } catch (err) {
    console.error("Reject KYC Error:", err);
    res.status(500).json({ error: "Failed to reject KYC" });
  }
};