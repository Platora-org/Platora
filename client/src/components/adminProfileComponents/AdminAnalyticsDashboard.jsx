import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  CheckCircle
} from 'lucide-react';

// Configure axios defaults
const api = axios.create({
  baseURL: 'http://localhost:3000/api/wallet',
  withCredentials: true,
  timeout: 30000
});

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Date validation function (same as TransactionList)
  const validateAndSetDateRange = (field, value) => {
    const newDateRange = { ...dateRange };

    if (field === 'startDate') {
      newDateRange.startDate = value;

      // If end date is before the new start date, auto-correct end date
      const startDate = new Date(value);
      const endDate = new Date(newDateRange.endDate);

      if (endDate < startDate) {
        newDateRange.endDate = value;
        setSuccessMessage('End date automatically adjusted to match start date');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } else if (field === 'endDate') {
      // For end date, only allow if it's not before start date
      const startDate = new Date(dateRange.startDate);
      const selectedEndDate = new Date(value);

      if (selectedEndDate < startDate) {
        // Auto-correct: set end date to start date
        newDateRange.endDate = dateRange.startDate;
        setSuccessMessage('End date cannot be before start date. Adjusted to start date');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        newDateRange.endDate = value;
      }
    }

    setDateRange(newDateRange);
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      console.log('Loading analytics with params:', params);

      // Try each endpoint individually with axios
      let analyticsData = null;
      let trendsData = null;
      let customersData = null;
      let hasErrors = false;

      try {
        console.log('Fetching dashboard analytics...');
        const response = await api.get('/analytics/dashboard', { params });
        console.log('Dashboard response:', response.data);
        analyticsData = response.data.analytics || response.data;
      } catch (error) {
        console.warn('Analytics dashboard endpoint error:', error.message);
        hasErrors = true;
        analyticsData = {
          customers: {
            total_customers: 0,
            active_customers: 0,
            total_coins_in_circulation: 0,
            avg_balance_per_customer: 0,
            customers_with_transactions: 0
          },
          transactions: [],
          restaurants: [],
          platformRevenue: []
        };
      }

      try {
        console.log('Fetching trends...');
        const response = await api.get('/analytics/trends', { params });
        console.log('Trends response:', response.data);
        trendsData = response.data.trends || response.data;
      } catch (error) {
        console.warn('Analytics trends endpoint error:', error.message);
        hasErrors = true;
        trendsData = [];
      }

      try {
        console.log('Fetching customers...');
        const response = await api.get('/analytics/customers', { params });
        console.log('Customers response:', response.data);
        customersData = response.data.customers || response.data;
      } catch (error) {
        console.warn('Analytics customers endpoint error:', error.message);
        hasErrors = true;
        customersData = [];
      }

      setAnalytics(analyticsData);
      setTrends(trendsData);
      setTopCustomers(customersData);

      if (hasErrors) {
        setError('Some analytics data is temporarily unavailable. Please check console for details.');
      } else {
        setError(''); // Clear any previous errors
      }

    } catch (error) {
      console.error('Critical error loading analytics:', error);
      setError(`Analytics service is currently unavailable: ${error.message}`);

      // Set empty data on critical error
      setAnalytics({
        customers: {
          total_customers: 0,
          active_customers: 0,
          total_coins_in_circulation: 0,
          avg_balance_per_customer: 0,
          customers_with_transactions: 0
        },
        transactions: [],
        restaurants: [],
        platformRevenue: []
      });
      setTrends([]);
      setTopCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Quick date range setter (same as TransactionList)
  const setQuickDateRange = (days) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const newRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };

    setDateRange(newRange);
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]); // Reload when date range changes

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
    if (!analytics?.transactions || !Array.isArray(analytics.transactions)) return [];

    return analytics.transactions.map(t => ({
      type: t.transaction_type,
      count: parseInt(t.transaction_count) || 0,
      coins: parseInt(t.total_coins) || 0,
      value: parseFloat(t.total_value_lkr) || 0
    }));
  };

  const processTopRestaurants = () => {
    if (!analytics?.restaurants || !Array.isArray(analytics.restaurants)) return [];

    return analytics.restaurants.slice(0, 5).map(r => ({
      name: (r.name && r.name.length > 15) ? r.name.substring(0, 15) + '...' : (r.name || 'Unknown'),
      fullName: r.name || 'Unknown',
      earnings: parseInt(r.total_net_coins) || 0,
      transactions: parseInt(r.transaction_count) || 0,
      commission: parseInt(r.total_commission) || 0
    }));
  };

  const processTrendsData = () => {
    if (!trends || !Array.isArray(trends)) return [];

    const dailyData = {};
    trends.forEach(trend => {
      const date = trend.date;
      if (!dailyData[date]) {
        dailyData[date] = { date, PURCHASE: 0, SPEND: 0, REFUND: 0 };
      }
      dailyData[date][trend.transaction_type] = parseInt(trend.total_coins) || 0;
    });

    return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Fixed coins circulation calculation
  const calculateCoinsInCirculation = () => {
    if (!analytics?.transactions || !Array.isArray(analytics.transactions)) return 0;

    let circulation = 0;
    analytics.transactions.forEach(t => {
      const coins = parseInt(t.total_coins) || 0;
      if (t.transaction_type === 'PURCHASE' || t.transaction_type === 'REFUND') {
        circulation += coins; // Add coins to circulation
      } else if (t.transaction_type === 'SPEND') {
        circulation -= coins; // Remove coins from circulation
      }
    });

    return Math.max(0, circulation); // Ensure non-negative
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
  const coinsInCirculation = calculateCoinsInCirculation();

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
                <CheckCircle className="w-5 h-5 text-emerald-600 mr-2" />
                <p className="text-emerald-700 dark:text-emerald-300">{successMessage}</p>
              </div>
            </div>
          )}

          <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700/50">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              <strong>Analytics Overview:</strong> Track platform performance, user engagement, and revenue metrics across the ecosystem.
              {error && <span className="block mt-1 text-orange-700 dark:text-orange-300">Note: Some analytics data may be limited due to server configuration.</span>}
            </p>
          </div>
        </div>

        {/* Enhanced Filters with Date Validation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Date Range Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                max={dateRange.endDate}
                onChange={(e) => validateAndSetDateRange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                min={dateRange.startDate}
                onChange={(e) => validateAndSetDateRange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={loadAnalytics}
                className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setQuickDateRange(7)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickDateRange(30)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setQuickDateRange(90)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Last 90 Days
            </button>
            <button
              onClick={() => {
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                const newRange = {
                  startDate: startOfMonth.toISOString().split('T')[0],
                  endDate: endOfMonth.toISOString().split('T')[0]
                };
                setDateRange(newRange);
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => {
                const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
                const endOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
                const newRange = {
                  startDate: lastMonth.toISOString().split('T')[0],
                  endDate: endOfLastMonth.toISOString().split('T')[0]
                };
                setDateRange(newRange);
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Last Month
            </button>
          </div>
        </div>


        {/* USer Reports & Analytics Section */}
        <div className="mt-3 mb-5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between shadow-sm">
          <div className="flex items-center gap-3 mb-3 md:mb-0">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm-2-8V5a2 2 0 012-2h2m4 0h2a2 2 0 012 2v6"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                User Reports & Analytics
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate comprehensive PDF reports for the selected date range
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              window.open(`http://localhost:3000/admin/profile/users/export`, "_blank");
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
              />
            </svg>
            Generate Report
          </button>
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
            value={coinsInCirculation.toLocaleString()}
            subtitle={`Avg: ${customers.total_customers > 0 ? Math.round(coinsInCirculation / customers.total_customers) : 0} per user`}
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
              <BarChart3 className="w-6 h-6 text-emerald-500 mr-3" />
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
                  label={({ type, count }) => `${type}: ${count}`}
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
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
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