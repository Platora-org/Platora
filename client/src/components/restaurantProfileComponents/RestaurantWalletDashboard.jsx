import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Calendar,
  Download,
  Filter,
  Eye,
  UtensilsCrossed,
  Coins,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const RestaurantWalletDashboard = () => {
  const [earnings, setEarnings] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const loadEarnings = async () => {
    try {
      const data = await apiRequest('/restaurant/earnings');
      setEarnings(data);
    } catch (error) {
      console.error('Error loading earnings:', error);
      setError('Failed to load earnings data');
    }
  };

  const loadMonthlyData = async () => {
    try {
      const data = await apiRequest(`/restaurant/monthly-summary?year=${selectedYear}`);
      setMonthlyData(data.monthlyData || []);
    } catch (error) {
      console.error('Error loading monthly data:', error);
      setError('Failed to load monthly data');
    }
  };

  const loadHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const data = await apiRequest(`/restaurant/history?${params}`);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
      setError('Failed to load transaction history');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadEarnings(), loadMonthlyData(), loadHistory()]);
      setLoading(false);
    };
    
    loadData();
  }, [selectedYear, statusFilter]);

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

  const stats = earnings?.stats || {};

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
                  Restaurant Wallet Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {earnings?.restaurant?.name || 'Restaurant Earnings Overview'}
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
                <Coins className="w-5 h-5 text-emerald-600 mr-2" />
                <p className="text-emerald-700 dark:text-emerald-300">{successMessage}</p>
              </div>
            </div>
          )}
          
          <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700/50">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              <strong>Platform Fee:</strong> 5% commission is automatically deducted from your earnings
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Pending Earnings"
            value={`${stats.pending?.coins || 0} coins`}
            subtitle={`Rs. ${(stats.pending?.lkr || 0).toLocaleString()}`}
            icon={Clock}
            color="orange"
            bgColor="orange"
          />
          <StatCard
            title="Total Paid"
            value={`${stats.paid?.coins || 0} coins`}
            subtitle={`Rs. ${(stats.paid?.lkr || 0).toLocaleString()}`}
            icon={CheckCircle}
            color="emerald"
            bgColor="emerald"
          />
          <StatCard
            title="Total Transactions"
            value={stats.total?.transactions || 0}
            icon={TrendingUp}
            color="blue"
            bgColor="blue"
          />
          <StatCard
            title="Commission Paid"
            value={`${stats.total?.commissionCoins || 0} coins`}
            subtitle="5% Platform Fee"
            icon={DollarSign}
            color="purple"
            bgColor="purple"
          />
        </div>

        {/* Monthly Trends */}
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Monthly Earnings Trends
              </h2>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {monthlyData.length > 0 ? (
            <div className="space-y-4">
              {monthlyData.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-4 rounded-lg transition-all bg-gray-50 dark:bg-gray-700/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Month {month.month}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {month.transaction_count} transactions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {month.total_coins} coins
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Rs. {(month.total_lkr || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No data available for {selectedYear}</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Recent Transactions
              </h2>
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Customer</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Gross</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Commission</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Net Earnings</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(earnings?.pendingEarnings || []).map((earning) => (
                  <tr key={earning.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {new Date(earning.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {earning.customer_name || 'Customer'}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Coins className="w-4 h-4 text-emerald-500 mr-1" />
                        {earning.gross_coins}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Coins className="w-4 h-4 text-orange-500 mr-1" />
                        {earning.commission_coins} (5%)
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                        <Coins className="w-4 h-4 mr-1" />
                        {earning.net_coins}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        earning.payout_status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {earning.payout_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!earnings?.pendingEarnings || earnings.pendingEarnings.length === 0) && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Transactions will appear here once customers start ordering
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantWalletDashboard;

