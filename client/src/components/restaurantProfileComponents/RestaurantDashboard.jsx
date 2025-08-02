import React from "react";

// ---------- Components ----------

// 1. StatCard
const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
      <div
        className={`w-12 h-12 bg-${color}-100 dark:bg-${color}-900/20 rounded-xl flex items-center justify-center`}
      >
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  </div>
);

// 2. OrderRow
const OrderRow = ({ order, getStatusColor }) => (
  <div className="flex items-center justify-between p-4 bg-emerald-50/40 dark:bg-gray-700/50 rounded-xl">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {order.customer}
        </span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            order.status
          )}`}
        >
          {order.status}
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {order.date} • {order.items}
      </div>
    </div>
    <div className="font-semibold text-gray-900 dark:text-gray-100">
      {order.amount}
    </div>
  </div>
);

// 3. DishCard
const DishCard = ({ dish }) => (
  <div className="flex items-center gap-4 p-4 bg-emerald-50/40 dark:bg-gray-700/50 rounded-xl">
    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center text-2xl">
      {dish.icon}
    </div>
    <div className="flex-1">
      <h3 className="font-medium text-gray-900 dark:text-gray-100">{dish.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {dish.orders} orders
      </p>
    </div>
  </div>
);

// 4. QuickActionButton
const QuickActionButton = ({ label, color, icon }) => (
  <button className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors">
    <div
      className={`w-10 h-10 bg-${color}-100 dark:bg-${color}-900/20 rounded-lg flex items-center justify-center`}
    >
      <span className="text-xl">{icon}</span>
    </div>
    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
  </button>
);

// ---------- Dashboard ----------
const RestaurantDashboard = () => {
  // Dummy Data
  const statsData = [
    { label: "Total Orders Today", value: 34, icon: "🍽️", color: "emerald" },
    { label: "Pending Pickups", value: 8, icon: "🛍️", color: "yellow" },
    { label: "Preparing Orders", value: 5, icon: "👨‍🍳", color: "blue" },
    { label: "Revenue Today", value: "$568.75", icon: "💵", color: "purple" },
  ];

  const recentOrders = [
    { customer: "John D.", date: "2025-07-30", status: "Preparing", amount: "$24.50", items: "2x Burgers, Fries" },
    { customer: "Sarah M.", date: "2025-07-30", status: "Ready for Pickup", amount: "$15.99", items: "Grilled Sandwich" },
    { customer: "Mike T.", date: "2025-07-30", status: "Picked Up", amount: "$42.00", items: "Family Pizza Combo" },
  ];

  const topDishes = [
    { name: "Cheese Burst Pizza", orders: 120, icon: "🍕" },
    { name: "Spicy Chicken Wrap", orders: 95, icon: "🌯" },
    { name: "Iced Coffee", orders: 87, icon: "☕" },
  ];

  const quickActions = [
    { label: "Manage Menu", color: "emerald", icon: "📋" },
    { label: "View Orders", color: "blue", icon: "📦" },
    { label: "Sales Report", color: "purple", icon: "📊" },
    { label: "Contact Support", color: "orange", icon: "☎️" },
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "picked up":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "ready for pickup":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "preparing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Restaurant Dashboard 🍴</h1>
        <p className="opacity-90">Manage orders, monitor sales, and track your best dishes.</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Orders</h2>
            <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm">
              View All
            </button>
          </div>
          <div className="p-6 space-y-4">
            {recentOrders.map((order, idx) => (
              <OrderRow key={idx} order={order} getStatusColor={getStatusColor} />
            ))}
          </div>
        </div>

        {/* Top Dishes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Dishes</h2>
            <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm">
              View Menu
            </button>
          </div>
          <div className="p-6 space-y-4">
            {topDishes.map((dish, idx) => (
              <DishCard key={idx} dish={dish} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <QuickActionButton key={idx} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
