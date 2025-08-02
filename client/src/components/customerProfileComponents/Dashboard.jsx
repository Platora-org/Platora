import React, { useState } from 'react';

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Mock data
  const dashboardData = {
    stats: {
      totalOrders: 12,
      pendingOrders: 2,
      wishlistItems: 5,
      totalSpend: 342.75, // NEW instead of loyalty points
    },
    recentOrders: [
      { id: '#ORD-201', date: '2025-07-28', status: 'Picked Up', amount: '$28.50', items: 'Veggie Pizza & Coke' },
      { id: '#ORD-202', date: '2025-07-26', status: 'Ready for Pickup', amount: '$15.99', items: 'Grilled Sandwich Combo' },
      { id: '#ORD-203', date: '2025-07-24', status: 'Preparing', amount: '$12.00', items: 'Pasta Alfredo' },
      { id: '#ORD-204', date: '2025-07-20', status: 'Picked Up', amount: '$34.75', items: 'Family Platter' }
    ],
    wishlistItems: [
      { id: 1, name: 'Cheese Burst Pizza', price: '$12.99', image: '🍕' },
      { id: 2, name: 'Spicy Chicken Wrap', price: '$8.49', image: '🌯' },
      { id: 3, name: 'Chocolate Brownie', price: '$4.99', image: '🍫' },
      { id: 4, name: 'Fresh Lemonade', price: '$2.99', image: '🥤' }
    ]
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'picked up':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'ready for pickup':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome back, Alex! 👋</h1>
        <p className="opacity-90">Your food is just a pickup away — here’s your activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: "Total Orders", value: dashboardData.stats.totalOrders, icon: "🍽️", color: "emerald", change: "+3 this week" },
          { label: "Pending Pickups", value: dashboardData.stats.pendingOrders, icon: "⏳", color: "yellow", change: "Being prepared" },
          { label: "Total Spend", value: `$${dashboardData.stats.totalSpend.toFixed(2)}`, icon: "💵", color: "blue", change: "Great savings with combos!" }
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              </div>
              <div
                className={`w-12 h-12 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 rounded-xl flex items-center justify-center`}
              >
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pickups */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Pickups</h2>
            <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm">
              View All
            </button>
          </div>
          <div className="p-6 space-y-4">
            {dashboardData.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-emerald-50/40 dark:bg-gray-700/50 rounded-xl"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{order.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {order.date} • {order.items}
                  </div>
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{order.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Favorites Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Favorite Dishes</h2>
            <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm">
              View Menu
            </button>
          </div>
          <div className="p-6 space-y-4">
            {dashboardData.wishlistItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-emerald-50/40 dark:bg-gray-700/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center text-2xl">
                  {item.image}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.price}</p>
                </div>
                <button className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors shadow">
                  Order Again
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Pickup Status", color: "emerald", icon: "🛍️" },
            { label: "Reserve Table", color: "blue", icon: "📅" },
            { label: "Contact Support", color: "orange", icon: "☎️" }
          ].map((action, idx) => (
            <button
              key={idx}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div
                className={`w-10 h-10 bg-${action.color}-100 dark:bg-${action.color}-900/20 rounded-lg flex items-center justify-center`}
              >
                <span className="text-xl">{action.icon}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
