import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads folder if it doesn't exist
const dir = "uploads/kyc";
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

// File filter to allow only jpg, jpeg, png, pdf
const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.originalname}`));
  }
};

// Maximum file size: 5MB
const limits = { fileSize: 5 * 1024 * 1024 };

// Multer middleware
const kycUpload = multer({ storage, fileFilter, limits }).fields([
  { name: "nic_doc", maxCount: 1 },
  { name: "business_reg_doc", maxCount: 1 }
]);

// Wrap with error handling for Express
export const uploadKYC = (req, res, next) => {
  kycUpload(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File size exceeds 5MB" });
        }
        return res.status(400).json({ error: err.message });
      } else {
        // Unknown errors
        return res.status(400).json({ error: err.message });
      }
    }
    // All good, continue to controller
    next();
  });
};
