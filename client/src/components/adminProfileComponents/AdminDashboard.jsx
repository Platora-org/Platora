import React, { useState } from 'react';

const AdminDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Mock admin data
  const adminData = {
    stats: {
      totalOrders: 156,
      pendingOrders: 23,
      activeCustomers: 89,
      dailyRevenue: 2847.50,
      avgOrderValue: 18.25,
      completionRate: 94.2
    },
    recentOrders: [
      { id: '#ORD-301', customer: 'Sarah Chen', time: '14:32', status: 'Preparing', amount: '$24.50', items: 'Chicken Burger + Fries', estimatedTime: '8 min' },
      { id: '#ORD-302', customer: 'Mike Johnson', time: '14:28', status: 'Ready for Pickup', amount: '$16.99', items: 'Caesar Salad Wrap', estimatedTime: 'Ready' },
      { id: '#ORD-303', customer: 'Emily Davis', time: '14:25', status: 'In Progress', amount: '$31.75', items: 'Family Combo Deal', estimatedTime: '12 min' },
      { id: '#ORD-304', customer: 'James Wilson', time: '14:20', status: 'Completed', amount: '$8.99', items: 'Soup & Bread', estimatedTime: 'Picked up' }
    ],
    popularItems: [
      { id: 1, name: 'Veggie Deluxe Pizza', orders: 34, revenue: '$408.66', trend: '+15%' },
      { id: 2, name: 'Grilled Chicken Wrap', orders: 28, revenue: '$237.72', trend: '+8%' },
      { id: 3, name: 'Pasta Marinara', orders: 22, revenue: '$263.78', trend: '-3%' },
      { id: 4, name: 'Fresh Garden Salad', orders: 19, revenue: '$190.81', trend: '+22%' }
    ],
    alerts: [
      { type: 'warning', message: 'Low stock: Cheese Burst Pizza ingredients', time: '10 min ago' },
      { type: 'info', message: 'Peak hours approaching - lunch rush expected', time: '15 min ago' },
      { type: 'success', message: 'Daily target 80% achieved', time: '1 hour ago' }
    ]
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'ready for pickup':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'preparing':
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400';
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300';
    }
  };

  
  const downloadPDF = () => {
    window.open(`http://localhost:3000/admin/profile/users/export`, "_blank");
  };

  return (
    
    <div className="space-y-6">
      <button onClick={downloadPDF}> 
          Download PDF
        </button>
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">Admin Dashboard 👨‍💼</h1>
            <p className="opacity-90">Managing operations for FoodCourt Central</p>
          </div>
          <div className="flex gap-3">
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Total Orders", value: adminData.stats.totalOrders, icon: "📋", color: "emerald", change: "+12% vs yesterday" },
          { label: "Pending Orders", value: adminData.stats.pendingOrders, icon: "⏳", color: "yellow", change: "Average wait: 15min" },
          { label: "Active Customers", value: adminData.stats.activeCustomers, icon: "👥", color: "emerald", change: "+5 new today" },
          { label: "Daily Revenue", value: `$${adminData.stats.dailyRevenue.toFixed(2)}`, icon: "💰", color: "emerald", change: "+18% vs yesterday" },
          { label: "Avg Order Value", value: `$${adminData.stats.avgOrderValue.toFixed(2)}`, icon: "📊", color: "emerald", change: "+$2.15 vs yesterday" },
          { label: "Completion Rate", value: `${adminData.stats.completionRate}%`, icon: "✅", color: "emerald", change: "Excellent performance" }
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 rounded-xl flex items-center justify-center`}
              >
                <span className="text-lg">{stat.icon}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{stat.value}</p>
              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.change}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">System Alerts</h2>
        <div className="space-y-3">
          {adminData.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-l-4 ${getAlertColor(alert.type)}`}
            >
              <div className="flex justify-between items-start">
                <p className="font-medium">{alert.message}</p>
                <span className="text-sm opacity-75">{alert.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Orders Management */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Orders</h2>
            <div className="flex gap-2">
              <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm">
                View Kitchen Display
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {adminData.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{order.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{order.time}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Customer: {order.customer}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {order.items} • {order.amount}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{order.estimatedTime}</div>
                  <button className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg transition-colors">
                    Update Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Items Analytics */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Popular Items Today</h2>
            <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm">
              Full Analytics
            </button>
          </div>
          <div className="p-6 space-y-4">
            {adminData.popularItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    #{idx + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.orders} orders • {item.revenue}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.trend.startsWith('+') 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {item.trend}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Admin Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "Manage Menu", color: "emerald", icon: "🍽️" },
            { label: "Staff Schedule", color: "blue", icon: "👨‍🍳" },
            { label: "Inventory", color: "orange", icon: "📦" },
            { label: "Reports", color: "purple", icon: "📊" },
            { label: "Customer Support", color: "pink", icon: "💬" },
            { label: "Settings", color: "gray", icon: "⚙️" }
          ].map((action, idx) => (
            <button
              key={idx}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
            >
              <div
                className={`w-10 h-10 bg-${action.color}-100 dark:bg-${action.color}-900/20 rounded-lg flex items-center justify-center`}
              >
                <span className="text-xl">{action.icon}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
