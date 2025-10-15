import React, { useEffect, useState } from "react";
import axiosInstance from '../../utils/axiosInstance';

export default function RestaurantOrders({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refunding, setRefunding] = useState(null); 
  const [rejectModal, setRejectModal] = useState(null); // Track order to reject
  const [rejectReason, setRejectReason] = useState(""); // User input for rejection reason
  const [notification, setNotification] = useState(null); // Success/error messages

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/restaurant-orders/${restaurantId}`);
        if (!mounted) return;
        setOrders(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOrders();
    return () => { mounted = false; };
  }, [restaurantId]);

  const calculateTotal = (items) => items.reduce((sum, it) => sum + it.quantity * it.price, 0);

  const statusBadge = (status) => {
    const base = "rounded-full px-2 py-0.5 text-xs font-semibold capitalize ";
    switch (status?.toLowerCase()) {
      case "accepted": return base + "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100";
      case "denied": return base + "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100";
      case "delivered":
      case "completed": return base + "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100";
      case "pending": return base + "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
      case "preparing":
      case "ready":
      case "delivering": return base + "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100";
      default: return base;
    }
  };

  const updateLocalOrder = (id, patch) => {
    setOrders(prev => prev.map(o => o.id === Number(id) ? { ...o, ...patch } : o));
  };

  const handleAccept = async (id) => {
    try {
      const res = await axiosInstance.patch(`/api/restaurant-orders/${id}/status`, { status: 'accepted' });
      updateLocalOrder(id, { status: res.data.status });
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Failed to accept order" });
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return;
    const id = rejectModal.id;
    try {
      setRefunding(id);
      await axiosInstance.patch(`/api/restaurant-orders/${id}/status`, { status: 'denied' });
      const refundRes = await axiosInstance.post('/api/refunds/order', {
        restaurantOrderId: id,
        reason: rejectReason.trim()
      });

      if (refundRes.data.success) {
        const { total_amount, items_refunded, new_balance } = refundRes.data.refund;
        updateLocalOrder(id, { status: 'denied' });
        setNotification({
          type: "success",
          message: `Order #${id} rejected and refunded successfully. Refunded: ${total_amount} coins, Items refunded: ${items_refunded}, Customer balance: ${new_balance}`
        });
      } else {
        setNotification({
          type: "warning",
          message: "Order status updated but refund failed: " + refundRes.data.message
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Failed to reject order and process refund"
      });
    } finally {
      setRefunding(null);
      setRejectModal(null);
      setRejectReason("");
    }
  };

  const handleNextStatus = async (id, type) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const currentStatus = order.status?.toLowerCase();
      const getNextStatus = (status, type) => {
        if (type === 'pickup') {
          switch (status) {
            case 'accepted': return 'preparing';
            case 'preparing': return 'ready';
            case 'ready': return 'completed';
            default: return null;
          }
        } else if (type === 'delivery') {
          switch (status) {
            case 'accepted': return 'preparing';
            case 'preparing': return 'ready';
            case 'ready': return 'delivering';
            case 'delivering': return 'completed';
            default: return null;
          }
        }
        return null;
      };

      const nextStatus = getNextStatus(currentStatus, type);
      if (!nextStatus) {
        setNotification({ type: "info", message: "Order is already completed or cannot advance further." });
        return;
      }

      const res = await axiosInstance.patch(`/api/restaurant-orders/${id}/status`, { status: nextStatus });
      updateLocalOrder(id, { status: res.data.status });
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: err.response?.data?.error || "Failed to advance status" });
    }
  };

  const downloadPDF = () => {
    window.open(`http://localhost:3000/api/restaurant-orders/user-report`, "_blank");
  };

  const getNextLabel = (status, type) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'Preparing';
      case 'preparing': return 'Ready';
      case 'ready': return type === 'delivery' ? 'Delivering' : 'Completed';
      case 'delivering': return 'Completed';
      default: return '';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return date.toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div className="p-6">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg text-sm font-medium ${
          notification.type === "success" ? "bg-green-100 text-green-800" :
          notification.type === "error" ? "bg-red-100 text-red-800" :
          "bg-yellow-100 text-yellow-800"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Restaurant Orders</h1>
        <button onClick={downloadPDF} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Generate Report</button>
      </div>

      {/* Orders */}
      <div className="space-y-6">
        {orders.map(order => {
          const lowerStatus = order.status?.toLowerCase();
          const showActionButton = lowerStatus && !['completed', 'denied'].includes(lowerStatus);

          return (
            <div key={order.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Order ID: #{order.id}</span>
                <span className={statusBadge(order.status)}>{order.status}</span>
              </div>
              <div className="p-6">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Item</th>
                      <th className="px-4 py-2 text-left font-semibold">Quantity</th>
                      <th className="px-4 py-2 text-left font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {order.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Rs. {item.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  Subtotal: Rs. {order.subtotal ?? calculateTotal(order.items)}
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div>
                  {refunding === order.id ? (
                    <span className="text-sm text-gray-600 dark:text-gray-400 italic">Processing refund...</span>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">Ordered on: {formatDate(order.created_at || order.createdAt)}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {lowerStatus === 'pending' && (
                    <>
                      <button onClick={() => handleAccept(order.id)} disabled={refunding === order.id} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Accept Order
                      </button>
                      <button onClick={() => setRejectModal(order)} disabled={refunding === order.id} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Reject & Refund
                      </button>
                    </>
                  )}

                  {showActionButton && lowerStatus !== 'pending' && (
                    <button onClick={() => handleNextStatus(order.id, order.type)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                      Mark as {getNextLabel(lowerStatus, order.type)}
                    </button>
                  )}

                  {order.status === 'denied' && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">Order rejected - Customer refunded</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No orders yet</p>
            <p className="text-sm mt-2">Orders will appear here when customers place them</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Reject Order #{rejectModal.id}</h3>
            <textarea
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={4}
              placeholder="Enter reason for rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600">Cancel</button>
              <button onClick={handleRejectConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Confirm & Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
