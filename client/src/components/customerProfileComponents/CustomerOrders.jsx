import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../../utils/AuthContext";

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const { user } = useAuth();

  // Fetch orders for logged-in customer
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;
      try {
        const res = await axiosInstance.get(`/api/orders/my/${user.id}`);
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error("Failed to fetch orders", err);
      }
    };
    fetchOrders();
  }, [user?.id]);

  // Sort newest → oldest
  const sorted = useMemo(
    () =>
      [...orders].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
      ),
    [orders]
  );

  // Status badge styling
  const statusBadge = (status) => {
    const base = "rounded-full px-2 py-0.5 text-xs font-semibold capitalize ";
    switch (status) {
      case "cancelled":
      case "denied":
        return base + "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100";
      case "partially_denied":
        return base + "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100";
      case "accepted":
      case "preparing":
        return base + "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100";
      case "delivered":
      case "completed":
        return base + "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100";
      case "pending":
      default:
        return base + "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
        My Orders
      </h1>

      <div className="space-y-6">
        {sorted.map((order) => (
          <div
            key={order.orderId}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {/* Order header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Order ID: #{order.orderId}
              </span>
            </div>

            {/* Sub-orders (per restaurant) */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {order.restaurants.map((rest, idx) => (
                <div key={idx} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {rest.restaurantName}
                    </h2>
                    <span className={statusBadge(rest.status)}>
                      {rest.status}
                    </span>
                  </div>

                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">
                          Item
                        </th>
                        <th className="px-4 py-2 text-left font-semibold">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left font-semibold">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {rest.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                            {item.name}
                          </td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                            {item.qty}
                          </td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                            Rs. {item.price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Order footer */}
            <div className="flex justify-between items-center border-t border-gray-200 bg-gray-50 px-6 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-400">
                Placed on: {order.createdAt}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
