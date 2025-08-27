import pool from "../config/db.js";

// Check if KYC exists for user
export const checkExistingKYC = async (userId) => {
  const result = await pool.query(
    `SELECT status FROM kyc_requests WHERE restaurant_id = $1`,
    [userId]
  );
  return result.rows[0];
};

// Create or update KYC request
export const createOrUpdateKYC = async ({
  userId,
  nicDoc,
  businessRegDoc,
  tinNumber,
  bankAccountNumber,
  bankName,
  branch,
}) => {
  const result = await pool.query(
    `INSERT INTO kyc_requests
      (restaurant_id, nic_doc, business_reg_doc, tin_number, bank_account_number, bank_name, branch, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
     ON CONFLICT (restaurant_id) 
     DO UPDATE SET
       nic_doc = EXCLUDED.nic_doc,
       business_reg_doc = EXCLUDED.business_reg_doc,
       tin_number = EXCLUDED.tin_number,
       bank_account_number = EXCLUDED.bank_account_number,
       bank_name = EXCLUDED.bank_name,
       branch = EXCLUDED.branch,
       status = 'PENDING',
       rejection_reason = NULL,
       updated_at = NOW()
     RETURNING *`,
    [userId, nicDoc, businessRegDoc, tinNumber, bankAccountNumber, bankName, branch]
  );
  return result.rows[0];
};

// Get KYC status with user info
export const getKYCStatusWithUser = async (userId) => {
  const result = await pool.query(
    `SELECT 
       k.*,
       u.first_name,
       u.last_name,
       u.email
     FROM users u
     LEFT JOIN kyc_requests k ON k.restaurant_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
};

// Get all pending KYC requests for admin
export const getPendingKYCRequests = async () => {
  const result = await pool.query(
    `SELECT 
       k.*,
       u.first_name,
       u.last_name,
       u.email,
       u.phone
     FROM kyc_requests k
     JOIN users u ON k.restaurant_id = u.id
     WHERE k.status = 'PENDING'
     ORDER BY k.created_at ASC`
  );
  return result.rows;
};

// Get KYC by ID
export const getKYCById = async (kycId) => {
  const result = await pool.query(
    `SELECT * FROM kyc_requests WHERE id = $1`,
    [kycId]
  );
  return result.rows[0];
};

// Approve KYC
export const approveKYC = async (kycId, adminId) => {
  const result = await pool.query(
    `UPDATE kyc_requests
     SET status = 'APPROVED', 
         reviewed_by = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [adminId, kycId]
  );
  return result.rows[0];
};

// Reject KYC
export const rejectKYC = async (kycId, adminId, reason) => {
  const result = await pool.query(
    `UPDATE kyc_requests
     SET status = 'REJECTED', 
         reviewed_by = $1, 
         rejection_reason = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [adminId, reason, kycId]
  );
  return result.rows[0];
};