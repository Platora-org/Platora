import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../utils/AuthContext"; 
import AdminKYCStatistics from "./AdminKYCStatistics";
import KYCDetailModal from './KYCDetailModal';

const AdminKYCDashboard = () => {
  const [kycRequests, setKycRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedKycIdForHistory, setSelectedKycIdForHistory] = useState(null);

  const tabs = [
    { id: "pending", label: "Pending", status: "PENDING", color: "yellow" },
    { id: "approved", label: "Approved", status: "APPROVED", color: "emerald" },
    { id: "rejected", label: "Rejected", status: "REJECTED", color: "red" },
    { id: "all", label: "All", status: null, color: "gray" }
  ];

  // Fetch KYC requests
  const fetchKYCRequests = async (status = null) => {
  setLoading(true);
  try {
    const params = status ? `?status=${status}` : '';
    const response = await axios.get(`/api/restaurant/kyc/all${params}`, {
      withCredentials: true,
    });
    
    setKycRequests(response.data.requests || []);
    setError("");
    } catch (error) {
      console.error("Error fetching KYC requests:", error);
      setError("Failed to fetch KYC requests");
      setKycRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tab = tabs.find(t => t.id === activeTab);
    fetchKYCRequests(tab?.status);
  }, [activeTab]);

  // Approve KYC
  const handleApprove = async (kycId) => {
    if (!window.confirm("Are you sure you want to approve this KYC application?")) {
      return;
    }

    setProcessing(true);
    try {
      await axios.post(
        `/api/restaurant/kyc/approve/${kycId}`,
        {},
        { withCredentials: true }
      );
      
      setSuccessMessage("KYC approved successfully!");
      // Remove from pending list
      setKycRequests(prev => prev.filter(kyc => kyc.id !== kycId));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error approving KYC:", error);
      setError(error.response?.data?.error || "Failed to approve KYC");
    } finally {
      setProcessing(false);
    }
  };

  // Reject KYC
  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.length < 10) {
      setError("Please provide a detailed rejection reason (min 10 characters)");
      return;
    }

    setProcessing(true);
    try {
      await axios.post(
        `/api/restaurant/kyc/reject/${selectedKYC.id}`,
        { reason: rejectionReason },
        { withCredentials: true }
      );
      
      setSuccessMessage("KYC rejected successfully!");
      // Remove from pending list
      setKycRequests(prev => prev.filter(kyc => kyc.id !== selectedKYC.id));
      setShowRejectModal(false);
      setSelectedKYC(null);
      setRejectionReason("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      setError(error.response?.data?.error || "Failed to reject KYC");
    } finally {
      setProcessing(false);
    }
  };

  // Filter KYC requests based on search
  const filteredRequests = kycRequests.filter(kyc => {
    const searchLower = searchTerm.toLowerCase();
    return (
      kyc.first_name?.toLowerCase().includes(searchLower) ||
      kyc.last_name?.toLowerCase().includes(searchLower) ||
      kyc.email?.toLowerCase().includes(searchLower) ||
      kyc.tin_number?.includes(searchTerm) ||
      kyc.bank_account_number?.includes(searchTerm)
    );
  });

  // View document
  const viewDocument = (docPath, kycId) => {
    window.open(`/api/restaurant/kyc/document?path=${encodeURIComponent(docPath)}&kycId=${kycId}`, '_blank');
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        {/* Statistics Cards */}
        <AdminKYCStatistics />
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-lg px-6 pt-4">
          <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-50 dark:bg-${tab.color}-900/20 text-${tab.color}-600 dark:text-${tab.color}-400 border-b-2 border-${tab.color}-500`
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                KYC Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Review and manage KYC applications
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Pending: {kycRequests.filter(k => k.status === 'PENDING').length}
                </p>
              </div>
              <button
                onClick={fetchKYCRequests}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-emerald-700 dark:text-emerald-300">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, TIN, or bank account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No KYC applications found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Restaurant
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bank Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      TIN
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions       
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRequests.map((kyc) => (
                    <tr key={kyc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {kyc.first_name} {kyc.last_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {kyc.restaurant_id}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {kyc.email}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {kyc.phone || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white font-medium">
                            {kyc.bank_name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {kyc.branch}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            AC: {kyc.bank_account_number}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {kyc.tin_number}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => viewDocument(kyc.nic_doc, kyc.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View NIC
                          </button>
                          <button
                            onClick={() => viewDocument(kyc.business_reg_doc, kyc.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View Business Reg
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(kyc.created_at)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(kyc.id)}
                            disabled={processing}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedKYC(kyc);
                              setShowRejectModal(true);
                            }}
                            disabled={processing}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setSelectedKycIdForHistory(kyc.id);
                              setShowDetailModal(true);
                            }}
                            className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {showRejectModal && selectedKYC && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Reject KYC Application
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Rejecting KYC for: <span className="font-medium">{selectedKYC.first_name} {selectedKYC.last_name}</span>
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a detailed reason for rejection..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="4"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 10 characters required
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={processing || rejectionReason.length < 10}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {processing ? "Processing..." : "Confirm Rejection"}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                    setSelectedKYC(null);
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showDetailModal && (
          <KYCDetailModal 
            kycId={selectedKycIdForHistory}  // Use different state variable to avoid confusion
            onClose={() => {
              setShowDetailModal(false);
              setSelectedKycIdForHistory(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminKYCDashboard;