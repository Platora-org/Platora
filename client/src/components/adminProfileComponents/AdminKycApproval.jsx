import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminKYCApproval = () => {
  const [kycRequests, setKycRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reject popup state
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch KYC requests from backend
  useEffect(() => {
    const fetchKYCRequests = async () => {
      try {
        const res = await axios.get("/api/admin/kyc");
        if (Array.isArray(res.data)) {
          setKycRequests(res.data);
        } else if (res.data && res.data.requests) {
          setKycRequests(res.data.requests);
        } else {
          setKycRequests([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load KYC requests.");
      } finally {
        setLoading(false);
      }
    };
    fetchKYCRequests();
  }, []);

  // Approve KYC request
  const handleApprove = async (id) => {
    try {
      await axios.post(`/api/admin/kyc/${id}/approve`);
      setKycRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: "APPROVED" } : req
        )
      );
    } catch (err) {
      console.error("Approve error:", err);
      alert("Failed to approve request.");
    }
  };

  // Reject KYC request with reason
  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return; // Validation
    try {
      await axios.post(`/api/admin/kyc/${rejectingId}/reject`, {
        reason: rejectReason,
      });
      setKycRequests((prev) =>
        prev.map((req) =>
          req.id === rejectingId
            ? { ...req, status: "REJECTED", reject_reason: rejectReason }
            : req
        )
      );
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      console.error("Reject error:", err);
      alert("Failed to reject request.");
    }
  };

  if (loading) {
    return (
      <p className="text-gray-800 dark:text-white p-6">
        Loading KYC requests...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-red-600 dark:text-red-400 p-6">{error}</p>
    );
  }

  return (
    <div className="p-6 bg-emerald-50/50 dark:bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        KYC Approval Requests
      </h2>

      {kycRequests.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          There is no KYC Requests.
        </p>
      ) : (
        <div className="relative">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow">
            <thead className="bg-emerald-500 text-white">
              <tr>
                <th className="px-4 py-2 border">Restaurant ID</th>
                <th className="px-4 py-2 border">Business Reg</th>
                <th className="px-4 py-2 border">NIC</th>
                <th className="px-4 py-2 border">Bank</th>
                <th className="px-4 py-2 border">TIN</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {kycRequests.map((req) => (
                <tr
                  key={req.id}
                  className="text-center text-gray-800 dark:text-white"
                >
                  <td className="px-4 py-2 border">{req.restaurant_id}</td>
                  <td className="px-4 py-2 border">
                    <a
                      href={req.business_reg_doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:text-emerald-600 underline"
                    >
                      {req.business_reg_doc}
                    </a>
                  </td>
                  <td className="px-4 py-2 border">
                    <a
                      href={req.nic_doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:text-emerald-600 underline"
                    >
                      {req.nic_doc}
                    </a>
                  </td>
                  <td className="px-4 py-2 border text-gray-600 dark:text-gray-400">
                    {req.bank_name} - {req.branch}
                    <br />
                    {req.bank_account_number}
                  </td>
                  <td className="px-4 py-2 border text-gray-600 dark:text-gray-400">
                    {req.tin_number}
                  </td>
                  <td className="px-4 py-2 border font-semibold">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        req.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600 dark:text-white"
                          : req.status === "REJECTED"
                          ? "bg-red-100 text-red-700 dark:bg-red-600 dark:text-white"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {req.status}
                    </span>
                    {req.status === "REJECTED" && req.reject_reason && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Reason: {req.reject_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 border space-x-2">
                    {req.status === "PENDING" ? (
                      <>
                        <button
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg shadow"
                          onClick={() => handleApprove(req.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg shadow"
                          onClick={() => setRejectingId(req.id)}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        ✔ Processed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Inline Reject Popup */}
          {rejectingId && (
            <div className="absolute top-10 left-1/4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 z-10 w-[28rem]">
              <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">
                Reason for Rejection
              </h3>
              <textarea
                className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:text-white"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <button
                  className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 ${
                    !rejectReason.trim() ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={handleRejectConfirm}
                  disabled={!rejectReason.trim()}
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminKYCApproval;
