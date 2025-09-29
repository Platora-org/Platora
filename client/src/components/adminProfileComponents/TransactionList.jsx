import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Receipt, 
  Download, 
  RefreshCw, 
  Calendar, 
  Coins, 
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  FileText,
  TestTube,
  Users,
  Activity
} from 'lucide-react';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/wallet',
  withCredentials: true,
  timeout: 30000
});

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statistics, setStatistics] = useState({
    totalTransactions: 0,
    totalPurchased: 0,
    totalSpent: 0,
    totalRefunded: 0,
    totalValue: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    type: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: ''
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Date validation function
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

  // PDF Generation functions
  const generateInvoice = async (transactionId) => {
    try {
      setGeneratingInvoice(transactionId);
      console.log('Generating invoice for transaction:', transactionId);
      
      // Use admin invoice route for individual transactions
      const response = await api.get(`/invoice/${transactionId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${transactionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage(`Invoice for transaction ${transactionId} generated successfully!`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      setError(`Failed to generate invoice: ${error.response?.data?.message || error.message}`);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const generateStatement = async (type = 'custom') => {
    try {
      setGeneratingStatement(true);
      
      const params = { 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate,
        transactionType: filters.type,
        status: filters.status
      };
      
      console.log('Generating admin statement with params:', params);
      
      const response = await api.get('/admin/statement', {
        params,
        responseType: 'blob'
      });
      
      const filename = `admin-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage('Admin report generated successfully!');
    } catch (error) {
      console.error('Error generating statement:', error);
      setError(`Failed to generate report: ${error.response?.data?.message || error.message}`);
    } finally {
      setGeneratingStatement(false);
    }
  };

  const testPDF = async () => {
    try {
      setTestingPdf(true);
      console.log('Testing PDF generation...');
      const response = await api.get('/test-pdf', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage('PDF test successful!');
    } catch (error) {
      console.error('PDF test failed:', error);
      setError('PDF test failed: ' + error.message);
    } finally {
      setTestingPdf(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      
      const params = {
        // Get ALL transactions for statistics (no pagination)
        limit: 10000 // High limit to get all transactions for stats
      };
      
      if (filters.type) params.transactionType = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      
      console.log('Loading statistics with params:', params);
      
      const response = await api.get('/admin/transactions', { params });
      
      if (response.data.success && response.data.transactions) {
        const allTransactions = response.data.transactions;
        
        const stats = {
          totalTransactions: allTransactions.length,
          totalPurchased: allTransactions
            .filter(t => t.transaction_type === 'PURCHASE')
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount_coins) || 0), 0),
          totalSpent: allTransactions
            .filter(t => t.transaction_type === 'SPEND')
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount_coins) || 0), 0),
          totalRefunded: allTransactions
            .filter(t => t.transaction_type === 'REFUND')
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount_coins) || 0), 0),
          // Net coins in circulation
          netCoinsInCirculation: allTransactions
            .filter(t => t.transaction_type === 'PURCHASE')
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount_coins) || 0), 0) -
            allTransactions
            .filter(t => t.transaction_type === 'SPEND')
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount_coins) || 0), 0) +
            allTransactions
            .filter(t => t.transaction_type === 'REFUND')
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount_coins) || 0), 0),
          // Platform commission revenue (assuming 5% commission on spend transactions)
          platformRevenue: allTransactions
            .filter(t => t.transaction_type === 'SPEND')
            .reduce((sum, t) => sum + (Math.abs(parseFloat(t.amount_coins) || 0) * 50 * 0.05), 0), // 5% commission in LKR
          // Alternative: Total coin purchases in LKR value
          coinPurchaseRevenue: allTransactions
            .filter(t => t.transaction_type === 'PURCHASE')
            .reduce((sum, t) => sum + (Math.abs(parseFloat(t.amount_coins) || 0) * 50), 0), // Convert coins to LKR
          // Count of spend transactions for average calculation
          spendTransactionCount: allTransactions.filter(t => t.transaction_type === 'SPEND').length
        };
        
        setStatistics(stats);
        console.log('Statistics calculated:', stats);
      }
      
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Don't show error for statistics, just keep previous values
    } finally {
      setStatsLoading(false);
    }
  };

  const loadTransactions = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: page,
        limit: 10 // Show 10 transactions per page
      };
      
      if (filters.type) params.transactionType = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      
      console.log('Loading transactions with params:', params);
      
      // Use admin endpoint for all transactions
      const response = await api.get('/admin/transactions', { params });
      console.log('Admin transactions response:', response.data);
      
      // Handle different response structures
      if (response.data.success && response.data.transactions) {
        setTransactions(response.data.transactions);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else if (Array.isArray(response.data)) {
        setTransactions(response.data);
      } else if (response.data.data) {
        setTransactions(response.data.data);
      } else {
        console.warn('Unexpected response structure:', response.data);
        setTransactions([]);
      }
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions: ' + (error.response?.data?.message || error.message));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyDateRangeFilter = () => {
    setFilters(prev => ({
      ...prev,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }));
  };

  const setQuickDateRange = (days) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const newRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    setDateRange(newRange);
    setFilters(prev => ({
      ...prev,
      startDate: newRange.startDate,
      endDate: newRange.endDate
    }));
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'purchase':
        return 'text-green-600 bg-green-100';
      case 'spend':
        return 'text-red-600 bg-red-100';
      case 'refund':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatAmount = (amount, type) => {
    const absAmount = Math.abs(amount || 0);
    const sign = type === 'SPEND' ? '-' : type === 'PURCHASE' || type === 'REFUND' ? '+' : '';
    return `${sign}${absAmount}`;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    // Load both statistics and first page of transactions when filters change
    loadStatistics();
    loadTransactions(1);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [filters]);

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
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Transaction History & Reports
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all system transactions and generate detailed PDF reports and statements
        </p>
      </div>

      {/* Alert Messages */}
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

      {/* Enhanced Filters with Date Validation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="PURCHASE">Purchase</option>
              <option value="SPEND">Spend</option>
              <option value="REFUND">Refund</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          
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
              onClick={() => {
                applyDateRangeFilter();
                loadTransactions();
              }}
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
              setFilters(prev => ({ ...prev, startDate: newRange.startDate, endDate: newRange.endDate }));
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
              setFilters(prev => ({ ...prev, startDate: newRange.startDate, endDate: newRange.endDate }));
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Last Month
          </button>
        </div>
      </div>

      {/* PDF Generation Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center justify-between">
            <div className="flex items-center">
                <FileText className="w-6 h-6 text-emerald-500 mr-3" />
                <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Admin Reports & Analytics
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Generate comprehensive PDF reports for the selected date range
                </p>
                </div>
            </div>
            <button
                onClick={() => generateStatement('custom')}
                disabled={generatingStatement || transactions.length === 0}
                className="flex items-center justify-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
            >
                {generatingStatement ? (
                <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Generating Report...
                </>
                ) : (
                <>
                    <Download className="w-5 h-5 mr-2" />
                    Generate Report
                </>
                )}
            </button>
            </div>
        </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Transactions</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsLoading ? (
                  <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-12 h-8 block"></span>
                ) : (
                  statistics.totalTransactions.toLocaleString()
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                All transaction types
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform Revenue</h3>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {statsLoading ? (
                  <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-16 h-8 block"></span>
                ) : (
                  `Rs. ${statistics.platformRevenue.toLocaleString()}`
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Commission from restaurant orders (5%)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Coins className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Coins Active</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statsLoading ? (
                  <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-16 h-8 block"></span>
                ) : (
                  statistics.netCoinsInCirculation.toLocaleString()
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Purchased - Spent + Refunded
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Order Value</h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {statsLoading ? (
                  <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-16 h-8 block"></span>
                ) : (
                  statistics.spendTransactionCount > 0
                    ? `${Math.round(statistics.totalSpent / statistics.spendTransactionCount)} coins`
                    : '0 coins'
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Average per food order
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filtered Transactions ({transactions.length})
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Try adjusting your filters or check back later
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs">
                        <div className="font-medium">
                          {transaction.customer_name || 'Unknown Customer'}
                        </div>
                        {transaction.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {transaction.email}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {transaction.user_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate">
                        {transaction.description || 'Transaction'}
                      </div>
                      {transaction.restaurant_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.restaurant_name}
                        </div>
                      )}
                      {transaction.reference_id && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Ref: {transaction.reference_id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <span className={`font-medium ${
                          transaction.transaction_type === 'SPEND' ? 'text-red-600' : 
                          transaction.transaction_type === 'PURCHASE' ? 'text-green-600' : 
                          'text-blue-600'
                        }`}>
                          {formatAmount(transaction.amount_coins, transaction.transaction_type)} coins
                        </span>
                      </div>
                      {transaction.amount_money && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.currency || 'LKR'} {parseFloat(transaction.amount_money).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status)}
                        <span className="ml-2 text-sm text-gray-900 dark:text-white">
                          {transaction.status || 'PENDING'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => generateInvoice(transaction.id)}
                        disabled={generatingInvoice === transaction.id}
                        className="flex items-center px-3 py-1 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-700 text-sm rounded-lg transition-colors"
                      >
                        {generatingInvoice === transaction.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Receipt className="w-4 h-4 mr-1" />
                            Invoice
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing page {pagination.currentPage} of {pagination.totalPages} 
                ({pagination.totalCount} total transactions)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadTransactions(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev || loading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => loadTransactions(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          pageNum === pagination.currentPage
                            ? 'bg-emerald-500 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => loadTransactions(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext || loading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Summary Section at Bottom */}
      {pagination.totalCount > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Period Summary ({filters.startDate} to {filters.endDate})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statsLoading ? '...' : statistics.totalTransactions.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Rs. {statsLoading ? '...' : statistics.platformRevenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Platform Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statsLoading ? '...' : statistics.netCoinsInCirculation.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Net Coins Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {statsLoading ? '...' : 
                  statistics.spendTransactionCount > 0
                    ? `${Math.round(statistics.totalSpent / statistics.spendTransactionCount)} coins`
                    : '0 coins'
                }
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Avg Order Value</div>
            </div>
          </div>
          
          {/* Additional insights */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <span className="text-gray-500 dark:text-gray-400">Coin Usage Rate: </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statistics.totalPurchased > 0 
                    ? `${((statistics.totalSpent / statistics.totalPurchased) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
                <div className="text-xs text-gray-400 mt-1">
                  % of purchased coins that were spent
                </div>
              </div>
              <div className="text-center">
                <span className="text-gray-500 dark:text-gray-400">Avg Commission per Order: </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statistics.spendTransactionCount > 0 
                    ? `Rs. ${(statistics.platformRevenue / statistics.spendTransactionCount).toFixed(2)}`
                    : 'Rs. 0'
                  }
                </span>
                <div className="text-xs text-gray-400 mt-1">
                  Average revenue per restaurant order
                </div>
              </div>
              <div className="text-center">
                <span className="text-gray-500 dark:text-gray-400">Showing Page: </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {pagination.currentPage} of {pagination.totalPages}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Export Transaction Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Export filtered transactions as CSV for external analysis
            </p>
          </div>
          <button
            onClick={() => {
              // Simple CSV export functionality
              const csvData = transactions.map(t => ({
                Date: new Date(t.created_at).toLocaleDateString(),
                Time: new Date(t.created_at).toLocaleTimeString(),
                Description: t.description || 'Transaction',
                Type: t.transaction_type,
                Amount: t.amount_coins,
                Currency: t.currency || 'LKR',
                Money: t.amount_money || 0,
                Status: t.status,
                Reference: t.reference_id || '',
                Restaurant: t.restaurant_name || ''
              }));
              
              const headers = Object.keys(csvData[0] || {});
              const csvContent = [
                headers.join(','),
                ...csvData.map(row => headers.map(header => 
                  typeof row[header] === 'string' && row[header].includes(',') 
                    ? `"${row[header]}"` 
                    : row[header]
                ).join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `transactions-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              setSuccessMessage('Transaction data exported to CSV successfully!');
            }}
            disabled={transactions.length === 0}
            className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;