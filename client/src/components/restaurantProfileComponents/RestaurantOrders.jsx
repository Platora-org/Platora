import React, { useEffect, useState } from "react";
import axiosInstance from '../../utils/axiosInstance';

export default function RestaurantOrders({ restaurantId }) {
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // base axios instance (optional)

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/restaurant-orders/${restaurantId}`);
        console.log("waht is res????",res.data);
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
    try {
      const res = await axiosInstance.patch(`/api/restaurant-orders/${id}/status`, { status: 'denied' });
      updateLocalOrder(id, { status: res.data.status });
    } catch (err) {
      console.error(err);
      alert("Failed to reject order");
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
              <div />
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <>
                    <button onClick={() => handleAccept(order.id)} className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700">Accept</button>
                    <button onClick={() => handleReject(order.id)} className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">Reject</button>
                  </>
                )}

                {['accepted','preparing','ready'].includes(order.status) && (
                  <button onClick={() => handleNextStatus(order.id)} className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
                    Mark as {order.status === 'accepted' ? 'Preparing' : order.status === 'preparing' ? 'Ready' : 'Delivered'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
