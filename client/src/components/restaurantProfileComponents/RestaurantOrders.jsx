import React, { useEffect, useState } from "react";
import axiosInstance from '../../utils/axiosInstance';

export default function RestaurantOrders({ restaurantId }) {
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refunding, setRefunding] = useState(null); // Track which order is being refunded

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/restaurant-orders/${restaurantId}`);
        console.log("what is res????", res.data);
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

  const calculateTotal = (items) =>
    items.reduce((sum, it) => sum + it.quantity * it.price, 0);

  const statusBadge = (status) => {
    const base = "rounded-full px-2 py-0.5 text-xs font-semibold capitalize ";
    switch (status) {
      case "accepted": return base + "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100";
      case "denied":
      case "rejected": return base + "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100";
      case "delivered": return base + "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100";
      case "pending": return base + "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
      case "preparing":
      case "ready": return base + "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100";
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
      alert("Failed to accept order");
    }
  };

  const handleReject = async (id) => {
    // Prompt for rejection reason
    const reason = window.prompt("Please provide a reason for rejection (required for customer notification):");
    if (!reason || reason.trim() === "") {
      alert("Rejection reason is required");
      return;
    }

    if (!window.confirm(`Reject this order and refund customer?\n\nReason: ${reason}\n\nCustomer will receive a full refund to their wallet.`)) {
      return;
    }

    try {
      setRefunding(id);
      
      // First, update order status to denied
      await axiosInstance.patch(`/api/restaurant-orders/${id}/status`, { status: 'denied' });
      
      // Then, process refund
      const refundRes = await axiosInstance.post('/api/refunds/order', {
        restaurantOrderId: id,
        reason: reason.trim()
      });

      if (refundRes.data.success) {
        const { total_amount, items_refunded, new_balance } = refundRes.data.refund;
        alert(
          `✓ Order rejected successfully!\n\n` +
          `Refunded: ${total_amount} coins\n` +
          `Items refunded: ${items_refunded}\n` +
          `Customer's new balance: ${new_balance} coins`
        );
        updateLocalOrder(id, { status: 'denied' });
      } else {
        alert("Order status updated but refund failed: " + refundRes.data.message);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Failed to reject order and process refund";
      alert(`Error: ${errorMsg}`);
      
      // If refund failed, might want to revert order status
      // But usually better to keep it denied and handle refund manually
    } finally {
      setRefunding(null);
    }
  };

  const handleNextStatus = async (id) => {
    try {
      const res = await axiosInstance.patch(`/api/restaurant-orders/${id}/advance`);
      updateLocalOrder(id, { status: res.data.status });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to advance status");
    }
  };

  if (loading) return <div className="p-6">Loading orders…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Restaurant Orders</h1>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Order Rejection Policy</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          When you reject an order, the customer will automatically receive a <strong>full refund</strong> to their wallet. 
          Please provide a clear reason for the rejection.
        </p>
      </div>

      <div className="space-y-6">
        {orders.map(order => (
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
                {refunding === order.id && (
                  <span className="text-sm text-gray-600 dark:text-gray-400 italic">
                    Processing refund...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleAccept(order.id)} 
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={refunding === order.id}
                    >
                      Accept Order
                    </button>
                    <button 
                      onClick={() => handleReject(order.id)} 
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={refunding === order.id}
                    >
                      {refunding === order.id ? 'Processing Refund...' : 'Reject & Refund'}
                    </button>
                  </>
                )}

                {['accepted','preparing','ready'].includes(order.status) && (
                  <button 
                    onClick={() => handleNextStatus(order.id)} 
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Mark as {order.status === 'accepted' ? 'Preparing' : order.status === 'preparing' ? 'Ready' : 'Delivered'}
                  </button>
                )}

                {order.status === 'denied' && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Order rejected - Customer refunded
                  </span>
                )}

                {order.status === 'delivered' && (
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No orders yet</p>
            <p className="text-sm mt-2">Orders will appear here when customers place them</p>
          </div>
        )}
      </div>
    </div>
  );
}