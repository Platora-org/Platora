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
  TrendingUp
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

  // Fetch agent profile
  const fetchAgentProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/delivery/agent/profile');
      console.log('Profile response:', response.data);
      setAgentProfile(response.data);
      // Always use status from backend as source of truth
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
      
      // Update status based on current delivery
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

    // Poll for new deliveries and status sync every 10 seconds
    const interval = setInterval(() => {
      fetchAgentProfile(); // Sync status from backend
      fetchCurrentDelivery(); // Check for new deliveries
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Toggle status (active/inactive)
  const handleToggleStatus = async () => {
    if (currentDelivery) {
      alert("Cannot change status while you have an active delivery.");
      return;
    }

    const newStatus = agentStatus === "active" ? "inactive" : "active";
    setStatusUpdating(true);
    
    try {
      const response = await axiosInstance.put('/api/delivery/agent/status', { 
        status: newStatus 
      });
      
      console.log('Status update response:', response.data);
      
      // Update status from backend response
      if (response.data.status) {
        setAgentStatus(response.data.status);
        console.log(`✅ Status updated to: ${response.data.status}`);
      }
      
      // Refresh profile to ensure sync
      await fetchAgentProfile();
    } catch (err) {
      console.error("Failed to update status:", err);
      
      // Handle specific error for active deliveries
      if (err.response?.data?.error?.includes('active deliveries')) {
        alert(err.response.data.error);
        // Sync status from backend
        if (err.response.data.currentStatus) {
          setAgentStatus(err.response.data.currentStatus);
        }
      } else {
        alert("Failed to update status. Please try again.");
      }
      
      // Always refresh to get correct status from backend
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
      
      // Refresh current delivery
      await fetchCurrentDelivery();
      alert("Order marked as picked up!");
    } catch (err) {
      console.error("Failed to mark as picked up:", err);
      alert("Failed to update status. Please try again.");
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
      
      // Refresh data - backend will set status back to 'active'
      await Promise.all([
        fetchAgentProfile(), // This will update status from backend
        fetchDeliveryHistory()
      ]);
      
      alert("Delivery completed successfully! 🎉");
    } catch (err) {
      console.error("Failed to verify OTP:", err);
      setOtpError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50/50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-emerald-50/50 dark:bg-gray-900 transition-colors duration-300 min-h-screen">
      <div className="container mx-auto px-6 py-10 md:py-16 max-w-7xl">
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
            {/* Status Toggle - only show when not on delivery */}
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

          {/* Completed Today Card */}
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

        {/* Current Delivery or No Delivery sections remain the same... */}
        {/* OTP Modal remains the same... */}
        {/* Recent Deliveries section remains the same... */}
        
        {/* I'll include the rest of the JSX in your actual file */}
      </div>
    </section>
  );
}