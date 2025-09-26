import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  DollarSign, 
  Calendar,
  Check,
  Clock,
  Download,
  Eye,
  Upload,
  X,
  Search,
  UtensilsCrossed,
  Coins,
  AlertCircle,
  RefreshCw,
  Users,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

const AdminPayoutDashboard = () => {
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [payoutForm, setPayoutForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    bankDetails: {
      accountNumber: '',
      bankName: ''
    },
    proofUrl: '',
    notes: ''
  });

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

  const loadPendingPayouts = async () => {
    try {
      const data = await apiRequest('/admin/pending-payouts');
      setPendingPayouts(data.payouts || []);
    } catch (error) {
      console.error('Error loading pending payouts:', error);
      setError('Failed to load pending payouts');
    }
  };

  const loadPayoutHistory = async () => {
    try {
      const data = await apiRequest('/admin/payout-history');
      setPayoutHistory(data.payouts || []);
    } catch (error) {
      console.error('Error loading payout history:', error);
      setError('Failed to load payout history');
    }
  };

  const processPayout = async () => {
    if (!selectedRestaurant) return;
    
    setProcessing(true);
    try {
      await apiRequest('/admin/process-payout', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurant_id,
          month: payoutForm.month,
          year: payoutForm.year,
          bankDetails: payoutForm.bankDetails,
          proofUrl: payoutForm.proofUrl,
          notes: payoutForm.notes
        })
      });
      
      // Reload data
      await Promise.all([loadPendingPayouts(), loadPayoutHistory()]);
      setShowPayoutModal(false);
      setSelectedRestaurant(null);
      resetForm();
      
      setSuccessMessage('Payout processed successfully!');
    } catch (error) {
      console.error('Error processing payout:', error);
      setError('Failed to process payout');
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setPayoutForm({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      bankDetails: { accountNumber: '', bankName: '' },
      proofUrl: '',
      notes: ''
    });
  };

  const openPayoutModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setPayoutForm({
      ...payoutForm,
      bankDetails: {
        accountNumber: restaurant.bank_account_number || '',
        bankName: restaurant.bank_name || ''
      }
    });
    setShowPayoutModal(true);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadPendingPayouts(), loadPayoutHistory()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

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

  const filteredPayouts = pendingPayouts.filter(payout =>
    payout.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payout.restaurant_email.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

export default AdminPayoutDashboard;

  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount_lkr || 0), 0);

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
                  Admin Payout Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Process restaurant payouts and manage commission distributions
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
              <strong>Admin Controls:</strong> Process monthly payouts to restaurant partners after 5% platform commission
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Pending Payouts"
            value={pendingPayouts.length}
            subtitle="Restaurants waiting"
            icon={Clock}
            color="orange"
            bgColor="orange"
          />
          <StatCard
            title="Total Pending Amount"
            value={`Rs. ${totalPendingAmount.toLocaleString()}`}
            subtitle="To be processed"
            icon={DollarSign}
            color="red"
            bgColor="red"
          />
          <StatCard
            title="Processed This Month"
            value={payoutHistory.filter(p => new Date(p.payout_date).getMonth() === new Date().getMonth()).length}
            subtitle="Completed payouts"
            icon={CheckCircle}
            color="emerald"
            bgColor="emerald"
          />
        </div>

        {/* Pending Payouts */}
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Pending Payouts
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Restaurant</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Email</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Transactions</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Earnings</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Amount (LKR)</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.restaurant_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3">
                          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {payout.restaurant_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {payout.restaurant_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {payout.restaurant_email}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {payout.transaction_count} orders
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <Coins className="w-4 h-4 text-emerald-500 mr-1" />
                        {payout.total_earnings}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Rs. {parseFloat(payout.amount_lkr || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => openPayoutModal(payout)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all"
                      >
                        Process Payout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPayouts.length === 0 && (
            <div className="text-center py-12">
              {searchTerm ? (
                <>
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No restaurants found matching your search.</p>
                </>
              ) : (
                <>
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No pending payouts.</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Payouts will appear here when restaurants have earnings to process
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recent Payout History */}
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <div className="flex items-center mb-6">
            <TrendingUp className="w-6 h-6 text-emerald-500 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Payout History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Restaurant</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Period</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Amount</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-900 dark:text-white">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payoutHistory.slice(0, 10).map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {new Date(payout.payout_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {payout.restaurant_name}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {payout.period_month}/{payout.period_year}
                    </td>
                    <td className="py-4 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      Rs. {parseFloat(payout.amount_lkr).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {payout.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {payout.processed_by_name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {payoutHistory.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No payout history available</p>
            </div>
          )}
        </div>

        {/* Payout Modal */}
        {showPayoutModal && selectedRestaurant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 text-emerald-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Process Payout
                  </h3>
                </div>
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedRestaurant.restaurant_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedRestaurant.restaurant_email}
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">
                    <strong>Amount:</strong> Rs. {parseFloat(selectedRestaurant.amount_lkr).toLocaleString()} 
                    ({selectedRestaurant.total_earnings} coins)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Month
                    </label>
                    <select
                      value={payoutForm.month}
                      onChange={(e) => setPayoutForm({...payoutForm, month: Number(e.target.value)})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                    >
                      {Array.from({length: 12}, (_, i) => (
                        <option key={i+1} value={i+1}>
                          {new Date(2024, i).toLocaleDateString('en', {month: 'long'})}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year
                    </label>
                    <select
                      value={payoutForm.year}
                      onChange={(e) => setPayoutForm({...payoutForm, year: Number(e.target.value)})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={payoutForm.bankDetails.accountNumber}
                    onChange={(e) => setPayoutForm({
                      ...payoutForm, 
                      bankDetails: {...payoutForm.bankDetails, accountNumber: e.target.value}
                    })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                    placeholder="Enter bank account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={payoutForm.bankDetails.bankName}
                    onChange={(e) => setPayoutForm({
                      ...payoutForm, 
                      bankDetails: {...payoutForm.bankDetails, bankName: e.target.value}
                    })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                    placeholder="Enter bank name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Proof URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={payoutForm.proofUrl}
                    onChange={(e) => setPayoutForm({...payoutForm, proofUrl: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                    placeholder="Upload receipt/proof URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={payoutForm.notes}
                    onChange={(e) => setPayoutForm({...payoutForm, notes: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                    rows={3}
                    placeholder="Add any notes about this payout"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={processPayout}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Payout
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );