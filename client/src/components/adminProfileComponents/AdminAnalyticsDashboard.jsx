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
  FileText,
  Receipt,
  TestTube
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
  const [exportType, setExportType] = useState('csv');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [dateError, setDateError] = useState('');

  // Date validation function
  const validateDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
    
    if (startDate > endDate) {
      return 'Start date must be before end date';
    }
    
    if (startDate > today) {
      return 'Start date cannot be in the future';
    }
    
    if (endDate > today) {
      return 'End date cannot be in the future';
    }
    
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return 'Date range cannot exceed 365 days';
    }
    
    if (daysDiff < 0) {
      return 'Invalid date range';
    }
    
    return '';
  };

  const handleDateChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    const validationError = validateDateRange(newDateRange.startDate, newDateRange.endDate);
    
    setDateError(validationError);
    setDateRange(newDateRange);
    
    // Only reload data if dates are valid
    if (!validationError) {
      // Debounce the API call
      setTimeout(() => {
        if (JSON.stringify(newDateRange) === JSON.stringify(dateRange)) {
          loadAnalytics();
        }
      }, 500);
    }
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

  const exportData = async () => {
    // Validate dates before export
    const validationError = validateDateRange(dateRange.startDate, dateRange.endDate);
    if (validationError) {
      setError(`Cannot export: ${validationError}`);
      return;
    }

    setExporting(true);
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: exportType
      };
      
      const response = await api.get('/analytics/export', { 
        params,
        responseType: 'blob' // Important for file downloads
      });
      
      if (exportType === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccessMessage('Analytics data exported to CSV successfully!');
      } else if (exportType === 'pdf') {
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccessMessage('Analytics report exported to PDF successfully!');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export analytics data. Please try again later.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadAnalytics();
    };
    
    loadData();
  }, []); // Only load once on mount

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
              <strong>Analytics Overview:</strong> Track platform performance, user engagement, and revenue metrics across the ecosystem. 
              {error && <span className="block mt-1 text-orange-700 dark:text-orange-300">Note: Some analytics data may be limited due to server configuration.</span>}
            </p>
          </div>
        </div>



        {/* Date Range Controls */}
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
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    dateError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    dateError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {dateError && (
                <div className="text-red-600 dark:text-red-400 text-sm mt-6">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {dateError}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 ml-auto">
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
              >
                <option value="csv">CSV Format</option>
                <option value="pdf">PDF Report</option>
              </select>
              <button
                onClick={exportData}
                disabled={exporting || !!dateError}
                className="flex items-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export {exportType.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Quick Date Range Buttons */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const newRange = {
                  startDate: lastWeek.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                };
                setDateRange(newRange);
                setDateError('');
                loadAnalytics();
              }}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                const newRange = {
                  startDate: lastMonth.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                };
                setDateRange(newRange);
                setDateError('');
                loadAnalytics();
              }}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastQuarter = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                const newRange = {
                  startDate: lastQuarter.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                };
                setDateRange(newRange);
                setDateError('');
                loadAnalytics();
              }}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Last 90 Days
            </button>
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