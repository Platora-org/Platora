import React, { useState, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../../utils/AuthContext";

const KYC_STATUS = {
  NOT_SUBMITTED: "Not Submitted",
  PENDING: "Pending",
  REJECTED: "Rejected",
  APPROVED: "Approved",
};

const RestaurantWallet = () => {
  const [loggedUser, setLoggedUser] = useState({
    email: "restaurant@test.com",
    role: "restaurant",
    kycStatus: KYC_STATUS.NOT_SUBMITTED,
  });

  // KYC form state
  const [nic, setNIC] = useState(null);
  const [businessReg, setBusinessReg] = useState(null);
  const [tin, setTIN] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [loading, setLoading] = useState(false);

  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (setter, label) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type for ${label}. Allowed: JPG, PNG, PDF.`);
      e.target.value = "";
      return;
    }
    if (file.size > maxSize) {
      alert(`${label} file is too large. Max size 5MB.`);
      e.target.value = "";
      return;
    }
    setter(file);
  };

  const sanitizeInput = (input) => input.replace(/[^\w\s-]/gi, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("nic_doc", nic);
      formData.append("business_reg_doc", businessReg);
      formData.append("tin_number", sanitizeInput(tin));
      formData.append("bank_account_number", sanitizeInput(bankAccount));
      formData.append("bank_name", sanitizeInput(bankName));
      formData.append("branch", sanitizeInput(branchName));

      const res = await axios.post("/api/restaurant/kyc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setLoggedUser({ ...loggedUser, kycStatus: res.data.kycStatus });
      alert("KYC submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit KYC.");
    } finally {
      setLoading(false);
    }
  };

  if (!loggedUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-500 dark:text-gray-400">Loading user information...</span>
      </div>
    );
  }

  const kycStatus = loggedUser.kycStatus || KYC_STATUS.NOT_SUBMITTED;

  const content = useMemo(() => {
    switch (kycStatus) {
      case KYC_STATUS.NOT_SUBMITTED:
      case KYC_STATUS.REJECTED:
        return (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg"
          >
            <p className="text-center text-red-600 font-semibold">
              {kycStatus === KYC_STATUS.NOT_SUBMITTED
                ? "Please complete your KYC to access the wallet."
                : "KYC rejected. Please upload again."}
            </p>

            <div>
              <label className="block font-medium text-gray-800 dark:text-white">
                NIC Upload:
              </label>
              <input type="file" onChange={handleFileChange(setNIC, "NIC")} required />
            </div>

            <div>
              <label className="block font-medium text-gray-800 dark:text-white">
                Business Reg Upload:
              </label>
              <input type="file" onChange={handleFileChange(setBusinessReg, "Business Reg")} required />
            </div>

            <div>
              <label className="block font-medium text-gray-800 dark:text-white">
                TIN Number:
              </label>
              <input
                type="text"
                value={tin}
                onChange={(e) => setTIN(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-gray-800 dark:text-white">
                Bank Account Number:
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-gray-800 dark:text-white">
                Bank Name:
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-gray-800 dark:text-white">
                Branch Name:
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center justify-center ${
                loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Submitting..." : "Submit KYC"}
            </button>
          </form>
        );

      case KYC_STATUS.PENDING:
        return (
          <div className="text-center text-yellow-600 font-semibold mt-10">
            KYC under verification...
          </div>
        );

      case KYC_STATUS.APPROVED:
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Wallet Dashboard</h2>
            <p className="mb-2 text-gray-800 dark:text-gray-200">Balance: $1000</p>
            <p className="mb-2 font-semibold text-gray-600 dark:text-gray-400">Recent Transactions:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
              <li>
                <span className="text-emerald-500 font-semibold">+ $200</span> — Deposit
              </li>
              <li>
                <span className="text-red-500 font-semibold">- $50</span> — Food Order
              </li>
              <li>
                <span className="text-emerald-500 font-semibold">+ $100</span> — Refund
              </li>
            </ul>
          </div>
        );

      default:
        return null;
    }
  }, [kycStatus, nic, businessReg, tin, bankAccount, bankName, branchName, loading]);

  return (
    <div className="p-6 bg-emerald-50/50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Restaurant Wallet</h1>
      {content}
    </div>
  );
};

export default RestaurantWallet;
