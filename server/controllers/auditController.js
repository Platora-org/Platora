import {
  getAuditLogsByKYC,
  getAllAuditLogs,
  getAuditLogsByAdmin,
  getAuditStatistics
} from "../models/auditModel.js";

// Get audit logs for specific KYC
export const fetchKYCAuditLogs = async (req, res) => {
  try {
    const { kycId } = req.params;
    const logs = await getAuditLogsByKYC(kycId);
    res.json({
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error("Fetch KYC Audit Logs Error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

// Get all audit logs
export const fetchAllAuditLogs = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = await getAllAuditLogs(parseInt(limit), parseInt(offset));
    res.json({
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error("Fetch All Audit Logs Error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

// Get admin's audit logs
export const fetchAdminAuditLogs = async (req, res) => {
  try {
    const adminId = req.user.id;
    const logs = await getAuditLogsByAdmin(adminId);
    res.json({
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error("Fetch Admin Audit Logs Error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

// Get audit statistics
export const fetchAuditStatistics = async (req, res) => {
  try {
    const stats = await getAuditStatistics();
    res.json(stats);
  } catch (err) {
    console.error("Fetch Audit Statistics Error:", err);
    res.status(500).json({ error: "Failed to fetch audit statistics" });
  }
};