import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  User, 
  Store, 
  Clock, 
  Loader2, 
  MapPin, 
  LogOut, 
  XCircle, 
  Phone,
  Package,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  FileText,
  Download
} from "lucide-react";
import { useAuth } from "../utils/AuthContext";
import axiosInstance from "../utils/axiosInstance";

export default function DeliveryAgentDashboard() {
  const { user, logout } = useAuth();

  const [agentProfile, setAgentProfile] = useState(null);
  const [agentStatus, setAgentStatus] = useState("inactive");
  const [currentDelivery, setCurrentDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState(null);

  // Report generation state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);

  // Show notification helper
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch agent profile
  const fetchAgentProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/delivery/agent/profile');
      console.log('Profile response:', response.data);
      setAgentProfile(response.data);
      setAgentStatus(response.data.status);
    } catch (err) {
      console.error("Failed to fetch agent profile:", err);
    }
  };

  // Fetch current delivery
  const fetchCurrentDelivery = async () => {
    try {
      const response = await axiosInstance.get('/api/delivery/agent/current');
      console.log('Current delivery response:', response.data);
      setCurrentDelivery(response.data.currentDelivery);
      
      if (response.data.currentDelivery) {
        setAgentStatus('busy');
      }
    } catch (err) {
      console.error("Failed to fetch current delivery:", err);
    }
  };

  // Fetch delivery history
  const fetchDeliveryHistory = async () => {
    try {
      const response = await axiosInstance.get('/api/delivery/agent/deliveries');
      console.log('Delivery history response:', response.data);
      setDeliveryHistory(response.data.deliveries || []);
      const completed = (response.data.deliveries || []).filter(d => d.status === "delivered").length;
      setCompletedCount(completed);
    } catch (err) {
      console.error("Failed to fetch delivery history:", err);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAgentProfile(),
        fetchCurrentDelivery(),
        fetchDeliveryHistory()
      ]);
      setLoading(false);
    };
    loadData();

    const interval = setInterval(() => {
      fetchAgentProfile();
      fetchCurrentDelivery();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Toggle status (active/inactive)
  const handleToggleStatus = async () => {
    if (currentDelivery) {
      showNotification('error', 'Cannot change status while you have an active delivery.');
      return;
    }

    const newStatus = agentStatus === "active" ? "inactive" : "active";
    setStatusUpdating(true);
    
    try {
      const response = await axiosInstance.put('/api/delivery/agent/status', { 
        status: newStatus 
      });
      
      console.log('Status update response:', response.data);
      
      if (response.data.status) {
        setAgentStatus(response.data.status);
        console.log(`✅ Status updated to: ${response.data.status}`);
      }
      
      await fetchAgentProfile();
    } catch (err) {
      console.error("Failed to update status:", err);
      
      if (err.response?.data?.error?.includes('active deliveries')) {
        showNotification('error', err.response.data.error);
        if (err.response.data.currentStatus) {
          setAgentStatus(err.response.data.currentStatus);
        }
      } else {
        showNotification('error', 'Failed to update status. Please try again.');
      }
      
      await fetchAgentProfile();
    } finally {
      setStatusUpdating(false);
    }
  };

  // Mark order as picked up
  const handleMarkPickedUp = async () => {
    if (!currentDelivery) return;
    
    try {
      await axiosInstance.put(`/api/delivery/order/${currentDelivery.order_id}/pickup`);
      await fetchCurrentDelivery();
      showNotification('success', 'Order marked as picked up!');
    } catch (err) {
      console.error("Failed to mark as picked up:", err);
      showNotification('error', 'Failed to update status. Please try again.');
    }
  };

  // Open OTP modal
  const handleCompleteClick = () => {
    setOtpOpen(true);
    setOtpInput("");
    setOtpError("");
  };

  // Verify OTP and complete delivery
  const verifyOtpAndComplete = async () => {
    if (!otpInput || otpInput.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.post(
        `/api/delivery/order/${currentDelivery.order_id}/verify-otp`, 
        { otp: otpInput }
      );

      console.log('OTP verification response:', response.data);

      setOtpOpen(false);
      setCurrentDelivery(null);
      
      await Promise.all([
        fetchAgentProfile(),
        fetchDeliveryHistory()
      ]);
      
      showNotification('success', 'Delivery completed successfully! 🎉');
    } catch (err) {
      console.error("Failed to verify OTP:", err);
      setOtpError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      showNotification('error', 'Please select both start and end dates');
      return;
    }

    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);

    if (start > end) {
      showNotification('error', 'Start date must be before end date');
      return;
    }

    setGeneratingReport(true);

    try {
      const params = new URLSearchParams({
        startDate: reportStartDate,
        endDate: reportEndDate
      });

      if (reportStatus) {
        params.append('status', reportStatus);
      }

      const response = await axiosInstance.get(`/api/delivery/agent/report?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `delivery-report-${reportStartDate}-to-${reportEndDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('success', 'Report generated successfully!');
      setReportOpen(false);
      setReportStartDate('');
      setReportEndDate('');
      setReportStatus('');
    } catch (err) {
      console.error('Failed to generate report:', err);
      showNotification('error', err.response?.data?.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50/50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-emerald-50/50 dark:bg-gray-900 transition-colors duration-300 min-h-screen">
      <div className="container mx-auto px-6 py-10 md:py-16 max-w-7xl">
        {/* Notification Popup */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-6 right-6 z-50 max-w-md"
            >
              <div className={`rounded-2xl p-4 shadow-2xl backdrop-blur-sm border-2 flex items-start gap-3 ${
                notification.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-100'
                  : 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-100'
              }`}>
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl shadow-emerald-500/30">
              <User className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white leading-tight">
                Delivery Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, <span className="font-semibold text-gray-800 dark:text-white">
                  {agentProfile?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || "Agent"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Generate Report Button */}
            <motion.button
              onClick={() => setReportOpen(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-3 rounded-full font-bold shadow-xl bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">Report</span>
            </motion.button>

            {/* Status Toggle */}
            {!currentDelivery && (
              <motion.button
                onClick={handleToggleStatus}
                disabled={statusUpdating}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`px-6 py-3 rounded-full font-bold shadow-xl shadow-emerald-500/30 border-2 transition relative flex items-center gap-2 ${
                  agentStatus === "active"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {statusUpdating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : agentStatus === "active" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-gray-500" />
                    Inactive
                  </>
                )}
              </motion.button>
            )}
            
            {/* Logout Button */}
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-3 rounded-full font-bold shadow-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Status Card */}
          <div className="rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 shadow-xl border border-white/40 dark:border-gray-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-gray-900 ring-emerald-500/30 ring-2">
                {agentStatus === "busy" ? (
                  <Package className="w-6 h-6 text-emerald-500" />
                ) : agentStatus === "active" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Current Status</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">
                  {agentStatus === "busy" ? "On Delivery" : agentStatus === "active" ? "Available" : "Offline"}
                </p>
              </div>
            </div>
          </div>

          {/* Active Deliveries Card */}
          <div className="rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 shadow-xl border border-white/40 dark:border-gray-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-gray-900 ring-blue-500/30 ring-2">
                <Store className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Active Orders</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{currentDelivery ? 1 : 0}</p>
              </div>
            </div>
          </div>

          {/* Completed Card */}
          <div className="rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 shadow-xl border border-white/40 dark:border-gray-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-gray-900 ring-purple-500/30 ring-2">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Completed</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Delivery Section - keeping unchanged */}
        {currentDelivery ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-500" />
              Current Delivery
            </h2>
            
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 p-8 shadow-2xl text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Order ID</p>
                  <p className="text-3xl font-bold">#{currentDelivery.order_id}</p>
                </div>
                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                  <p className="text-sm font-semibold capitalize">{currentDelivery.status}</p>
                </div>
              </div>

              {/* Restaurant Info */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Store className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Restaurant Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">{currentDelivery.restaurant_name}</p>
                      <p className="text-emerald-100 text-sm">{currentDelivery.restaurant_address || "Address not available"}</p>
                    </div>
                  </div>
                  {currentDelivery.restaurant_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 flex-shrink-0" />
                      <a href={`tel:${currentDelivery.restaurant_phone}`} className="hover:underline">
                        {currentDelivery.restaurant_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Customer Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Delivery Address</p>
                      <p className="text-emerald-100 text-sm">{currentDelivery.delivery_address || "Address not available"}</p>
                    </div>
                  </div>
                  {currentDelivery.contact_number && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 flex-shrink-0" />
                      <a href={`tel:${currentDelivery.contact_number}`} className="hover:underline">
                        {currentDelivery.contact_number}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                {currentDelivery.status === "assigned" && (
                  <motion.button
                    onClick={handleMarkPickedUp}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-white text-emerald-600 font-bold py-4 px-6 rounded-xl hover:bg-emerald-50 transition shadow-lg"
                  >
                    Mark as Picked Up
                  </motion.button>
                )}
                
                {currentDelivery.status === "picked_up" && (
                  <motion.button
                    onClick={handleCompleteClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-white text-emerald-600 font-bold py-4 px-6 rounded-xl hover:bg-emerald-50 transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Complete Delivery
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-12 text-center shadow-xl border border-white/40 dark:border-gray-700/50"
          >
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Active Deliveries</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {agentStatus === "active" 
                ? "You're available for new deliveries. Orders will appear here automatically." 
                : "Set your status to Active to receive delivery orders."}
            </p>
          </motion.div>
        )}

        {/* Report Generation Modal */}
        <AnimatePresence>
          {reportOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !generatingReport && setReportOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-gray-800">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Generate Report</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={generatingReport}
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={generatingReport}
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Status Filter (Optional)
                    </label>
                    <select
                      value={reportStatus}
                      onChange={(e) => setReportStatus(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={generatingReport}
                    >
                      <option value="">All Statuses</option>
                      <option value="assigned">Assigned</option>
                      <option value="picked_up">Picked Up</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => !generatingReport && setReportOpen(false)}
                    disabled={generatingReport}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    disabled={generatingReport || !reportStartDate || !reportEndDate}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OTP Verification Modal - keeping unchanged */}
        <AnimatePresence>
          {otpOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !submitting && setOtpOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-gray-800">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Verify OTP</h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Enter the 6-digit OTP from the customer to complete this delivery.
                </p>

                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, ''));
                    setOtpError("");
                  }}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-bold tracking-widest bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl py-4 px-6 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-800 dark:text-white"
                  disabled={submitting}
                />

                {otpError && (
                  <p className="text-red-500 text-sm mb-4 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {otpError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => !submitting && setOtpOpen(false)}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyOtpAndComplete}
                    disabled={submitting || otpInput.length !== 6}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Complete"
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Deliveries */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-500" />
            Recent Deliveries
          </h2>
          
          {deliveryHistory.length === 0 ? (
            <div className="rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-12 text-center shadow-xl border border-white/40 dark:border-gray-700/50">
              <Clock className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No delivery history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveryHistory.map((delivery) => (
                <div
                  key={delivery.id}
                  className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 shadow-lg border border-white/40 dark:border-gray-700/50 hover:shadow-xl transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white mb-1">
                        Order #{delivery.order_id}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(delivery.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${
                        delivery.status === "delivered" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      }`}>
                        {delivery.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}