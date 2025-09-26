import React, { useState, useEffect } from 'react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  CreditCard,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Building2,
  Activity,
  UtensilsCrossed,
  Coins,
  AlertCircle,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportType, setExportType] = useState('csv');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const apiRequest = async (url, options = {}) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wallet${url}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  };

  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const [analyticsData, trendsData, customersData] = await Promise.all([
        apiRequest(`/analytics/dashboard?${params}`),
        apiRequest(`/analytics/trends?${params}`),
        apiRequest(`/analytics/customers?${params}`)
      ]);

      setAnalytics(analyticsData.analytics);
      setTrends(trendsData.trends || []);
      setTopCustomers(customersData.customers || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: exportType
      });
      
      const response = await fetch(`http://localhost:3000/api/wallet/analytics/export?${params}`, {
        credentials: 'include'
      });
      
      if (exportType === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccessMessage('Analytics data exported successfully!');
      } else {
        const data = await response.json();
        console.log('Export data:', data);
        setSuccessMessage('Analytics data exported to console');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export analytics data');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadAnalytics();
      setLoading(false);
    };
    
    loadData();
  }, [dateRange.startDate, dateRange.endDate]);

  // Auto-clear messages
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Process data for charts
  const processTransactionData = () => {
    if (!analytics?.transactions) return [];
    
    return analytics.transactions.map(t => ({
      type: t.transaction_type,
      count: parseInt(t.transaction_count),
      coins: parseInt(t.total_coins),
      value: parseFloat(t.total_value_lkr)
    }));
  };

  const processTopRestaurants = () => {
    if (!analytics?.restaurants) return [];
    
    return analytics.restaurants.slice(0, 5).map(r => ({
      name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
      fullName: r.name,
      earnings: parseInt(r.total_net_coins),
      transactions: parseInt(r.transaction_count),
      commission: parseInt(r.total_commission)
    }));
  };

  const processTrendsData = () => {
    if (!trends) return [];
    
    const dailyData = {};
    trends.forEach(trend => {
      const date = trend.date;
      if (!dailyData[date]) {
        dailyData[date] = { date, PURCHASE: 0, SPEND: 0, REFUND: 0 };
      }
      dailyData[date][trend.transaction_type] = parseInt(trend.total_coins);
    });
    
    return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'];

  if (loading) {
    return (
      <div className="min-h-screen p-6 transition-colors duration-300 bg-emerald-50/50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    );
  }

  const customers = analytics?.customers || {};
  const transactionData = processTransactionData();
  const restaurantData = processTopRestaurants();
  const trendsChartData = processTrendsData();

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'emerald', bgColor = 'emerald' }) => (
    <div className="rounded-xl p-6 border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600 dark:text-${color}-400`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 bg-${bgColor}-100 dark:bg-${bgColor}-900/30 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 transition-colors duration-300 bg-emerald-50/50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <UtensilsCrossed className="w-8 h-8 text-emerald-500 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Comprehensive insights into wallet performance and user behavior
                </p>
              </div>
            </div>
          </div>
          
          {/* Alerts */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
          {successMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <Download className="w-5 h-5 text-emerald-600 mr-2" />
                <p className="text-emerald-700 dark:text-emerald-300">{successMessage}</p>
              </div>
            </div>
          )}
          
          <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700/50">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              <strong>Analytics Overview:</strong> Track platform performance, user engagement, and revenue metrics across the ecosystem
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 bg-white dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 ml-auto">
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
              >
                <option value="csv">CSV Format</option>
                <option value="json">JSON Format</option>
              </select>
              <button
                onClick={exportData}
                disabled={exporting}
                className="flex items-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Customers"
            value={customers.total_customers || 0}
            subtitle={`${customers.active_customers || 0} active users`}
            icon={Users}
            color="blue"
            bgColor="blue"
          />
          <StatCard
            title="Coins in Circulation"
            value={parseInt(customers.total_coins_in_circulation || 0).toLocaleString()}
            subtitle={`Avg: ${parseInt(customers.avg_balance_per_customer || 0)} per user`}
            icon={Coins}
            color="emerald"
            bgColor="emerald"
          />
          <StatCard
            title="Total Transactions"
            value={transactionData.reduce((sum, t) => sum + t.count, 0).toLocaleString()}
            subtitle={`Active users: ${customers.customers_with_transactions || 0}`}
            icon={Activity}
            color="purple"
            bgColor="purple"
          />
          <StatCard
            title="Platform Revenue"
            value={`Rs. ${(analytics?.platformRevenue?.reduce((sum, p) => sum + parseFloat(p.daily_commission_lkr || 0), 0) || 0).toLocaleString()}`}
            subtitle="5% Commission"
            icon={DollarSign}
            color="orange"
            bgColor="orange"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Transaction Types Chart */}
          <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
            <div className="flex items-center mb-6">
              <PieChartIcon className="w-6 h-6 text-emerald-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Transaction Types Distribution
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={transactionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={({type, count}) => `${type}: ${count}`}
                >
                  {transactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {transactionData.length === 0 && (
              <div className="text-center py-8">
                <PieChartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No transaction data available</p>
              </div>
            )}
          </div>

          {/* Daily Trends Chart */}
          <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
            <div className="flex items-center mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Daily Transaction Trends
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="PURCHASE" stroke="#10b981" strokeWidth={2} name="Purchase" />
                <Line type="monotone" dataKey="SPEND" stroke="#ef4444" strokeWidth={2} name="Spend" />
                <Line type="monotone" dataKey="REFUND" stroke="#f59e0b" strokeWidth={2} name="Refund" />
              </LineChart>
            </ResponsiveContainer>
            {trendsChartData.length === 0 && (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No trend data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Restaurants */}
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 bg-white dark:bg-gray-800">
          <div className="flex items-center mb-6">
            <BarChart3 className="w-6 h-6 text-emerald-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Performing Restaurants
            </h3>
          </div>
          {restaurantData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={restaurantData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value} coins`,
                    name === 'earnings' ? 'Net Earnings' : name === 'commission' ? 'Commission Paid' : 'Transactions'
                  ]}
                  labelFormatter={(label) => {
                    const restaurant = restaurantData.find(r => r.name === label);
                    return restaurant ? restaurant.fullName : label;
                  }}
                />
                <Bar dataKey="earnings" fill="#10b981" name="Net Earnings" />
                <Bar dataKey="commission" fill="#f59e0b" name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No restaurant data available</p>
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-emerald-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Spending Customers
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Rank</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Customer</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Transactions</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Total Spent</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {topCustomers.slice(0, 10).map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4 text-gray-900 dark:text-white font-semibold">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {customer.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {customer.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Activity className="w-4 h-4 text-blue-500 mr-1" />
                        {customer.transaction_count}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="flex items-center font-semibold text-red-600 dark:text-red-400">
                          <Coins className="w-4 h-4 mr-1" />
                          {customer.total_coins_spent}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Rs. {parseFloat(customer.total_value_lkr).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                        <Coins className="w-4 h-4 mr-1" />
                        {customer.current_balance}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {topCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No customer data available for the selected period.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Customer spending data will appear here once transactions are made
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;