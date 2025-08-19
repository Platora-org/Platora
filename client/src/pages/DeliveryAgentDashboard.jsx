import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../utils/AuthContext";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  Store,
  Phone,
  Clock,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  RefreshCcw,
  LogOut,
} from "lucide-react";

/**
 * DeliveryAgentDashboard
 * - Emerald-themed UI matching your HeroSection style
 * - Driver name
 * - Active/Inactive status button
 * - Auto-allocation when Active (mock order after a short delay)
 * - When an order is assigned:
 *    • Hide the status toggle
 *    • Show restaurant + order details
 *    • "Mark as Completed" opens OTP modal
 *    • OTP must match the customer-provided code
 *    • On success: clear order, show status button again with Active selected
 * - Extra polish: activity log, mini-stats, subtle motion, dark mode ready
 */

const EMERALD = {
  accent: "text-emerald-500",
  bgSoft: "bg-emerald-50/50 dark:bg-gray-900",
  btn: "bg-emerald-500 hover:bg-emerald-600 text-white",
  ring: "ring-emerald-500/30",
  shadow: "shadow-emerald-500/30",
};

const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const mockRestaurants = [
  "Spice Garden",
  "Curry Leaf",
  "Ocean Taste",
  "Green Bowl",
  "Sizzle & Stir",
  "Corner Kottu",
];

const mockCustomers = [
  "Nethmi Perera",
  "Aarav Kumar",
  "Ishara Silva",
  "Anya Fernando",
  "Ravindu Jay",
  "Meera Nair",
];

const mockLocations = [
  "Colombo 05",
  "Borella",
  "Dehiwala",
  "Rajagiriya",
  "Nugegoda",
  "Mount Lavinia",
];

function generateOrder() {
  const id = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  return {
    id,
    restaurant: randomPick(mockRestaurants),
    customer: randomPick(mockCustomers),
    location: randomPick(mockLocations),
    phone: "+94 7X XXX XXXX",
    etaMins: 18 + Math.floor(Math.random() * 12),
    otp, // In real life this comes from customer; shown here for demo/testing
    createdAt: new Date(),
  };
}

const Stat = ({ label, value, icon: Icon }) => (
  <div className="rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 shadow-xl border border-white/40 dark:border-gray-700/50">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-2xl ${EMERALD.bgSoft} ${EMERALD.ring} ring-2`}>
        <Icon className={`w-5 h-5 ${EMERALD.accent}`} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-800 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

const Pill = ({ children, variant = "neutral" }) => {
  const styles = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    info: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[variant]}`}>{children}</span>
  );
};

const OTPInput = ({ value, onChange, error }) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Enter 6‑digit OTP</label>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••••"
        className={`w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border focus:outline-none focus:ring-4 ${
          error
            ? "border-rose-400 focus:ring-rose-400/30"
            : "border-gray-200 dark:border-gray-700 focus:ring-emerald-400/30"
        }`}
      />
      {error && <p className="text-sm mt-2 text-rose-500">{error}</p>}
    </div>
  );
};

export default function DeliveryAgentDashboard() {
  const { logout } = useAuth();
  const [driverName] = useState("Dilan Perera");
  const [isActive, setIsActive] = useState(true); // default Active
  const [order, setOrder] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [log, setLog] = useState([]);
  

  // OTP modal state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [revealOtp, setRevealOtp] = useState(false);

  const allocationTimer = useRef(null);

  // Auto-allocate when Active and no order exists
  useEffect(() => {
    if (isActive && !order) {
      setAllocating(true);
      if (allocationTimer.current) clearTimeout(allocationTimer.current);
      allocationTimer.current = setTimeout(() => {
        const newOrder = generateOrder();
        setOrder(newOrder);
        setLog((prev) => [
          { ts: new Date(), text: `New order allocated: ${newOrder.id} from ${newOrder.restaurant}` },
          ...prev,
        ]);
        setAllocating(false);
      }, 1300); // mock delay
    }

    return () => {
      if (allocationTimer.current) clearTimeout(allocationTimer.current);
    };
  }, [isActive]);

  const handleToggle = () => {
    // If an order exists, status toggle is hidden anyway; guard for safety
    if (order) return;
    setIsActive((v) => !v);
    setLog((prev) => [
      { ts: new Date(), text: `Status changed to ${!isActive ? "Active" : "Inactive"}` },
      ...prev,
    ]);
  };

  const handleCompleteClick = () => {
    setOtpOpen(true);
    setOtpInput("");
    setOtpError("");
  };

  const verifyOtpAndComplete = () => {
    if (!otpInput || otpInput.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }
    if (otpInput !== order?.otp) {
      setOtpError("Incorrect OTP. Please try again.");
      return;
    }
    // Success
    setOtpOpen(false);
    const completedId = order.id;
    setOrder(null);
    setIsActive(true); // Restore status button with Active selected
    setLog((prev) => [
      { ts: new Date(), text: `Order ${completedId} completed.` },
      ...prev,
    ]);
  };

  const handleLogout = () => {
    logout();
  };

  const emptyState = !order && !allocating;

  return (
    <section className={`${EMERALD.bgSoft} transition-colors duration-300 min-h-screen`}>      
      <div className="container mx-auto px-6 py-10 md:py-16">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl ${EMERALD.shadow}`}>
              <User className={`w-7 h-7 ${EMERALD.accent}`} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white leading-tight">
                Delivery Agent Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Welcome back, <span className="font-semibold text-gray-800 dark:text-white">{driverName}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Toggle (hidden while an order is assigned) */}
            <AnimatePresence initial={false}>
              {!order && (
                <motion.button
                  key={isActive ? "active" : "inactive"}
                  onClick={handleToggle}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`px-6 py-3 rounded-full font-bold shadow-xl ${EMERALD.shadow} border-2 transition relative flex items-center gap-2 ${
                    isActive
                      ? `${EMERALD.btn} border-emerald-600`
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                  }`}
                  title="Toggle availability"
                >
                  {isActive ? (
                    <>
                      <ShieldCheck className="w-5 h-5" /> Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-500" /> Inactive
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Logout Button */}
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-3 rounded-full font-bold shadow-xl bg-rose-500 hover:bg-rose-600 text-white border-2 border-rose-600 transition relative flex items-center gap-2"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Top Stats */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Stat label="Status" value={order ? "On Delivery" : isActive ? "Active" : "Inactive"} icon={Clock} />
          <Stat label="Today Deliveries" value="5" icon={CheckCircle2} />
          <Stat label="Rating" value="4.9 ★" icon={ShieldCheck} />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 mt-10">
          {/* Left: Order or Empty */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/40 dark:border-gray-800/70 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Current Assignment</h2>
                  {order ? <Pill variant="info">On Delivery</Pill> : allocating ? <Pill variant="info">Searching orders…</Pill> : <Pill>Idle</Pill>}
                </div>

                {/* Allocating shimmer */}
                <AnimatePresence>
                  {allocating && (
                    <motion.div
                      key="allocating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 text-gray-600 dark:text-gray-300"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <p>Auto-allocating a delivery to you…</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Order Card */}
                <AnimatePresence>
                  {order && (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="grid md:grid-cols-2 gap-6 mt-2"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <Store className={`w-5 h-5 ${EMERALD.accent}`} />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Restaurant</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">{order.restaurant}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <User className={`w-5 h-5 ${EMERALD.accent}`} />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer</p>
                            <p className="text-gray-800 dark:text-white font-medium">{order.customer}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><Phone className="w-4 h-4" /> {order.phone}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <MapPin className={`w-5 h-5 ${EMERALD.accent}`} />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Location</p>
                            <p className="text-gray-800 dark:text-white font-medium">{order.location}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ETA ~ {order.etaMins} mins</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white/70 dark:bg-gray-900/60">
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Order</p>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-800 dark:text-white font-semibold">ID: {order.id}</p>
                            <Pill variant="success">Pickup Ready</Pill>
                          </div>
                        </div>

                        {/* OTP (demo helper) */}
                        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 p-4 bg-emerald-50/60 dark:bg-emerald-900/20">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">Delivery OTP</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setRevealOtp((v) => !v)}
                                className="p-1 rounded-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-800/40"
                                title={revealOtp ? "Hide" : "Show"}
                              >
                                {revealOtp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard?.writeText(order.otp)}
                                className="p-1 rounded-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-800/40"
                                title="Copy OTP"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-2xl font-extrabold tracking-widest text-emerald-700 dark:text-emerald-300 select-all">
                            {revealOtp ? order.otp : "••••••"}
                          </p>
                          <p className="text-xs mt-1 text-emerald-700/80 dark:text-emerald-300/80">Ask the customer for this code on delivery.</p>
                        </div>

                        <motion.button
                          onClick={handleCompleteClick}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full ${EMERALD.btn} font-bold px-6 py-4 rounded-2xl shadow-xl ${EMERALD.shadow}`}
                        >
                          Mark as Completed
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Empty state */}
                {emptyState && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center py-16"
                  >
                    <div className="p-4 rounded-3xl bg-white/80 dark:bg-gray-900/80 border border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
                      <RefreshCcw className={`w-8 h-8 mx-auto mb-3 ${EMERALD.accent}`} />
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">No current delivery</h3>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md">
                        {isActive
                          ? "You are active. We will auto-allocate the next available order to you."
                          : "You are inactive. Toggle to Active to start receiving orders."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Activity log */}
          <div className="space-y-4">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/40 dark:border-gray-800/70 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Activity</h2>
                <ul className="space-y-3">
                  {log.length === 0 && (
                    <li className="text-gray-500 dark:text-gray-400 text-sm">Nothing yet. Updates will appear here.</li>
                  )}
                  {log.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full ${idx === 0 ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{item.text}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.ts.toLocaleTimeString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/40 dark:border-gray-800/70 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Tips</h2>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 text-sm space-y-2">
                  <li>Keep your status <span className="font-semibold">Active</span> to auto-receive orders.</li>
                  <li>Verify the customer's <span className="font-semibold">OTP</span> before completing delivery.</li>
                  <li>Use the activity panel to review recent actions.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      <AnimatePresence>
        {otpOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl"
            >
              <div className="p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Confirm Delivery</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Enter the 6‑digit OTP provided by the customer to complete order <span className="font-semibold">{order?.id}</span>.
                </p>

                <OTPInput value={otpInput} onChange={setOtpInput} error={otpError} />

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setOtpOpen(false)}
                    className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyOtpAndComplete}
                    className={`px-6 py-3 rounded-2xl font-bold ${EMERALD.btn} shadow-xl ${EMERALD.shadow}`}
                  >
                    Verify & Complete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}