import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../../utils/AuthContext";
import { Truck, User, Phone, ShieldCheck } from "lucide-react";

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [deliveryDetails, setDeliveryDetails] = useState({});
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

// Fetch delivery details for a specific order
const fetchDeliveryDetails = async (orderId) => {
  try {
    console.log(`🔍 Fetching delivery details for order ${orderId}`);
    const res = await axiosInstance.get(`/api/delivery/order/${orderId}/details`);
    console.log(`✅ Delivery details received for order ${orderId}:`, res.data);
    setDeliveryDetails(prev => ({ ...prev, [orderId]: res.data }));
  } catch (err) {
    console.error(`❌ Failed to fetch delivery for order ${orderId}`, err);
  }
};

// Fetch delivery details for all delivery orders
useEffect(() => {
  console.log(`📋 Total orders: ${orders.length}`);
  orders.forEach(order => {
    console.log(`Order ${order.orderId}: type = ${order.type}`);
    if (order.type === 'delivery') {
      fetchDeliveryDetails(order.orderId);
    }
  });
}, [orders]);

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
        {sorted.map((order) => {
          const delivery = deliveryDetails[order.orderId];
          const isDelivery = order.type === 'delivery';

          return (
            <div
              key={order.orderId}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              {/* Order header */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Order ID: #{order.orderId}
                  </span>
                  {isDelivery && (
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Delivery
                    </span>
                  )}
                </div>
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

              {/* 🚚 DELIVERY INFORMATION SECTION - Matches Restaurant Style */}
              {isDelivery && delivery && (
                <div className="mx-6 mb-6 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚚</span>
                      <span className="text-white font-semibold">Delivery Information</span>
                    </div>
                    {delivery.status && (
                      <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium capitalize">
                        {delivery.status === "assigned" && "Agent Assigned"}
                        {delivery.status === "picked_up" && "Out for Delivery"}
                        {delivery.status === "delivered" && "Delivered"}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Agent Name */}
                    <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                      <span className="text-white/90 text-sm">👤 Agent Name:</span>
                      <span className="text-white font-semibold">
                        {delivery.agentName || "Not assigned yet"}
                      </span>
                    </div>

                    {/* Agent Phone */}
                    {delivery.agentPhone && (
                      <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <span className="text-white/90 text-sm">📞 Phone:</span>
                        <a 
                          href={`tel:${delivery.agentPhone}`}
                          className="text-white font-semibold hover:underline"
                        >
                          {delivery.agentPhone}
                        </a>
                      </div>
                    )}

                    {/* OTP Code */}
                    {delivery.otp && (
                      <div className="bg-white/10 rounded-lg px-3 py-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white/90 text-sm">🔒 Verification Code:</span>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-white tracking-widest mb-1">
                            {delivery.otp}
                          </p>
                          <p className="text-xs text-white/80">
                            Share this code with the delivery agent
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order footer */}
              <div className="flex justify-between items-center border-t border-gray-200 bg-gray-50 px-6 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
                <span className="text-gray-600 dark:text-gray-400">
                  Placed on: {order.createdAt}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}