import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, Coins, UtensilsCrossed, Calendar, TrendingUp, Globe, ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign, PieChart, BarChart3, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from "../../utils/AuthContext";

// Configuration
const API_BASE_URL = 'http://localhost:3000/api/wallet';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51S8eGQFFDqkDkeNubSukhuG4OqdgO12p6j00ujplCWKMVcYXu9AnqxZPtmTR9J9E60nHSCzl6XdXtC4seXdawuf600bx0HLq1h';

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  try {
    const config = {
      withCredentials: true,
      ...options
    };

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('Making request to:', url);

    let response;
    if (options.method === 'POST' || options.method === 'PUT') {
      response = await axios.post(url, options.data, config);
    } else {
      response = await axios.get(url, config);
    }
    
    return response.data;
  } catch (error) {
    console.error('API Request Error:', error.response?.data || error);
    throw error;
  }
};

// Wallet API functions
const walletAPI = {
  getWallet: () => apiRequest('/'),
  getExchangeRates: () => apiRequest('/rates'),
  updateExchangeRates: () => apiRequest('/rates/update', { method: 'POST' }),
  getSupportedCurrencies: () => apiRequest('/currencies'),
  calculateCoinPrice: (coins, currency) => apiRequest(`/calculate-price?coins=${coins}&currency=${currency}`),
  createPaymentIntent: (coins, currency = 'USD') => apiRequest('/create-payment-intent', {
    method: 'POST',
    data: { coins, currency },
  }),
  processSuccessfulPayment: (paymentIntentId) => apiRequest('/process-payment', {
    method: 'POST',
    data: { paymentIntentId },
  }),
  getTransactions: (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString(), 
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v != null))
    });
    return apiRequest(`/transactions?${params}`);
  },
  getAnalytics: (period = 'month') => apiRequest(`/analytics?period=${period}`),
  getRefunds: (page = 1, limit = 20) => {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString() 
    });
    return apiRequest(`/refunds?${params}`);
  },
  verifyPin: (pin) => apiRequest('/pin/verify', {
    method: 'POST',
    data: { pin },
  }),
  checkPinStatus: () => apiRequest('/pin/status'),
  setPin: (pin, confirmPin) => apiRequest('/pin/set', {
    method: 'POST',
    data: { pin, confirmPin },
  }),
};

// Stripe integration helper
const stripeHelper = {
  stripe: null,
  elements: null,

  initialize: async (publishableKey) => {
    if (!window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      document.head.appendChild(script);
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          stripeHelper.stripe = window.Stripe(publishableKey);
          resolve();
        };
        script.onerror = reject;
      });
    } else {
      stripeHelper.stripe = window.Stripe(publishableKey);
    }
  },

  createElements: (options = {}) => {
    if (!stripeHelper.stripe) throw new Error('Stripe not initialized');
    stripeHelper.elements = stripeHelper.stripe.elements(options);
    return stripeHelper.elements;
  },

  confirmPayment: async (clientSecret, elements, returnUrl = window.location.origin) => {
    if (!stripeHelper.stripe) throw new Error('Stripe not initialized');
    
    // For test mode, use a test payment method
    const { error, paymentIntent } = await stripeHelper.stripe.confirmPayment({
      clientSecret,
      confirmParams: {
        payment_method_data: {
          type: 'card',
          card: {
            token: 'tok_visa' // Stripe test token that always succeeds
          }
        }
      },
      redirect: 'if_required'
    });

    if (error) throw error;
    return paymentIntent;
  }
};

// PIN Modal Component
const PINModal = ({ isOpen, onClose, onVerify, title = "Enter PIN", isNewPIN = false }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isNewPIN && pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    if (pin.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }
    
    setIsLoading(true);
    try {
      await onVerify(pin);
      setPin('');
      setConfirmPin('');
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (value) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(numericValue);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-sm mx-4">
        <div className="flex items-center mb-4">
          <Lock className="w-6 h-6 text-emerald-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isNewPIN ? 'Set 6-digit PIN' : 'Enter your 6-digit PIN'}
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-wider focus:ring-2 focus:ring-emerald-500 focus:border-transparent border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                maxLength={6}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isNewPIN && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm PIN
              </label>
              <input
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-wider focus:ring-2 focus:ring-emerald-500 focus:border-transparent border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                maxLength={6}
                autoComplete="off"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length !== 6 || (isNewPIN && confirmPin.length !== 6)}
              className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const getCurrencySymbol = (currency) => {
    const symbols = {
      'LKR': 'Rs.', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'JPY': '¥'
    };
    return symbols[currency] || currency;
  };

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, onSuccess, clientSecret, amount, currency, coins }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);

  useEffect(() => {
    if (isOpen && !stripe) {
      initializeStripe();
    }
  }, [isOpen]);

  const initializeStripe = async () => {
    if (!window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      document.head.appendChild(script);
      
      script.onload = () => {
        const stripeInstance = window.Stripe(STRIPE_PUBLISHABLE_KEY);
        setStripe(stripeInstance);
      };
    } else {
      setStripe(window.Stripe(STRIPE_PUBLISHABLE_KEY));
    }
  };

  useEffect(() => {
    if (stripe && isOpen) {
      const elementsInstance = stripe.elements();
      setElements(elementsInstance);

      const cardElement = elementsInstance.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        },
      });

      cardElement.mount('#card-element');

      return () => {
        cardElement.unmount();
      };
    }
  }, [stripe, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement('card'),
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        await onSuccess(paymentIntent.id);
        onClose();
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Complete Payment
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Amount:</span>
              <span className="text-xl font-bold text-emerald-600">
                {getCurrencySymbol(currency)}{amount} {currency}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-600 dark:text-gray-400">Coins:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {coins} coins
              </span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Test Card Numbers:</strong>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              4242 4242 4242 4242 (Success)<br />
              Any future date, any 3 digits for CVC
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Card Details
              </label>
              <div id="card-element" className="p-3 border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"></div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${getCurrencySymbol(currency)}${amount}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const PlatoraWalletDashboard = () => {
  const { user } = useAuth();
  const [coinsToBuy, setCoinsToBuy] = useState(10);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showPINModal, setShowPINModal] = useState(false);
  const [pinModalConfig, setPinModalConfig] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [pinSetupRequired, setPinSetupRequired] = useState(false);

  const [exchangeRates, setExchangeRates] = useState({});
  const [supportedCurrencies, setSupportedCurrencies] = useState({});
  const [userWallet, setUserWallet] = useState({
    totalCoins: 0,
    pendingCoins: 0,
    lastTopup: '',
    memberSince: ''
  });
  const [transactions, setTransactions] = useState([]);
  const [refundHistory, setRefundHistory] = useState([]);
  const [analytics, setAnalytics] = useState({
    spendingByType: [],
    monthlyTrends: [],
    categorySpending: []
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [pendingPaymentData, setPendingPaymentData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('0.00');

  const COIN_BASE_VALUE_LKR = 50;
  const COLORS = ['#10B981', '#059669', '#047857'];
  const isAuthenticated = !!user;

  // useEffects
  useEffect(() => {
    const initializeWallet = async () => {
      if (user) {
        try {
          const pinStatus = await walletAPI.checkPinStatus();
          if (!pinStatus.success || !pinStatus.hasPin) {
            setPinSetupRequired(true);
            setInitialLoading(false);
            return;
          }
          await loadInitialData();
        } catch (error) {
          console.error('Failed to initialize wallet:', error);
          if (error.response?.status === 404 || error.message.includes('PIN')) {
            setPinSetupRequired(true);
          } else if (error.response?.status === 401) {
            setError('Authentication required. Please refresh the page.');
          } else {
            setError(error.response?.data?.message || 'Failed to initialize wallet. Please try again.');
          }
        }
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
      }
    };
    initializeWallet();
  }, [user]);

  useEffect(() => {
    if (user && !pinSetupRequired && Object.keys(exchangeRates).length > 0) {
      calculatePaymentAmount();
    }
  }, [coinsToBuy, selectedCurrency, exchangeRates, user, pinSetupRequired]);

  useEffect(() => {
    if (user && !pinSetupRequired) {
      const interval = setInterval(loadExchangeRates, 30000);
      return () => clearInterval(interval);
    }
  }, [user, pinSetupRequired]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handler functions
  const handlePINSetup = async (pin) => {
    try {
      const data = await walletAPI.setPin(pin, pin);
      if (data.success) {
        setSuccessMessage('PIN set up successfully! Welcome to Platora Wallet.');
        setPinSetupRequired(false);
        await loadInitialData();
        return data;
      } else {
        throw new Error(data.message || 'Failed to set up PIN');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.[0]?.msg 
        || error.response?.data?.message 
        || error.message 
        || 'PIN setup failed';
      throw new Error(errorMessage);
    }
  };

  const handlePINVerification = async (pin) => {
    try {
      const data = await walletAPI.verifyPin(pin);
      if (!data.success) {
        throw new Error(data.message || 'Invalid PIN');
      }
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'PIN verification failed');
    }
  };

  const setupPIN = () => {
    setPinModalConfig({
      title: 'Set Up Your Wallet PIN',
      isNewPIN: true,
      onVerify: handlePINSetup
    });
    setShowPINModal(true);
  };

  const requirePIN = (action, title = "Enter PIN to continue") => {
    return new Promise((resolve, reject) => {
      setPinModalConfig({
        title,
        onVerify: async (pin) => {
          try {
            await handlePINVerification(pin);
            resolve(pin);
          } catch (error) {
            reject(error);
          }
        }
      });
      setShowPINModal(true);
    });
  };

  // Load functions
  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadWallet(),
        loadExchangeRates(),
        loadSupportedCurrencies(),
        loadTransactions(),
        loadRefunds(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load wallet data. Please refresh the page.');
    }
  };

  const loadWallet = async () => {
    try {
      const data = await walletAPI.getWallet();
      if (data.success) {
        const wallet = data.wallet;
        setUserWallet({
          totalCoins: wallet.balance_coins || 0,
          pendingCoins: 0,
          lastTopup: wallet.updated_at ? new Date(wallet.updated_at).toISOString().split('T')[0] : '',
          memberSince: wallet.created_at ? new Date(wallet.created_at).toISOString().split('T')[0] : ''
        });
        setError('');
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
      setError(error.response?.data?.message || 'Failed to load wallet data.');
    }
  };

  const loadExchangeRates = async () => {
    try {
      const data = await walletAPI.getExchangeRates();
      if (data.success) {
        const convertedRates = { 'LKR': 1 };
        Object.entries(data.rates).forEach(([key, rate]) => {
          const [base, target] = key.split('_');
          if (base === 'LKR' && target !== 'LKR') {
            convertedRates[target] = rate;
          }
        });
        setExchangeRates(convertedRates);
        setLastUpdated(new Date(data.lastUpdated));
        setError('');
      }
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
      setExchangeRates({
        'LKR': 1, 'USD': 0.0031, 'EUR': 0.0028, 'GBP': 0.0024, 'AUD': 0.0047, 'JPY': 0.46
      });
    }
  };

  const loadSupportedCurrencies = async () => {
    try {
      const data = await walletAPI.getSupportedCurrencies();
      if (data.success) {
        setSupportedCurrencies(data.currencies);
      }
    } catch (error) {
      console.error('Failed to load supported currencies:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await walletAPI.getTransactions(1, 10);
      if (data.success) {
        const formattedTransactions = data.transactions.map(t => ({
          id: t.id,
          type: t.transaction_type.toLowerCase(),
          coins: t.amount_coins,
          amount: t.amount_money || 0,
          currency: t.currency,
          date: new Date(t.created_at).toISOString().split('T')[0],
          status: t.status.toLowerCase(),
          description: t.description
        }));
        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const loadRefunds = async () => {
    try {
      const data = await walletAPI.getRefunds();
      if (data.success) {
        const formattedRefunds = data.refunds.refunds?.map(r => ({
          id: r.id,
          type: 'refund',
          coins: r.amount_coins,
          amount: 0,
          currency: '',
          date: new Date(r.created_at).toISOString().split('T')[0],
          status: r.status.toLowerCase(),
          description: r.description
        })) || [];
        setRefundHistory(formattedRefunds);
      }
    } catch (error) {
      console.error('Failed to load refunds:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await walletAPI.getAnalytics('month');
      if (data.success) {
        const categoryData = data.analytics.categorySpending?.map(cat => ({
          name: cat.category,
          coins: parseInt(cat.total_coins),
          value: parseInt(cat.total_coins)
        })) || [];
        const monthlyData = data.analytics.monthlyTrends?.map(trend => ({
          month: new Date(trend.month).toLocaleDateString('en', { month: 'short' }),
          coins: parseInt(trend.total_coins),
          amount: parseInt(trend.total_coins || 0) * 50
        })) || [];
        setAnalytics({
          spendingByType: data.analytics.spendingByType || [],
          monthlyTrends: monthlyData,
          categorySpending: categoryData
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const calculatePaymentAmount = async () => {
    try {
      const data = await walletAPI.calculateCoinPrice(coinsToBuy, selectedCurrency);
      if (data.success) {
        setPaymentAmount(data.amount.toFixed(2));
      }
    } catch (error) {
      console.error('Failed to calculate payment amount:', error);
      const totalLKR = coinsToBuy * COIN_BASE_VALUE_LKR;
      const amount = (totalLKR * (exchangeRates[selectedCurrency] || 1)).toFixed(2);
      setPaymentAmount(amount);
    }
  };

  const updateExchangeRates = async () => {
    setIsLoadingRates(true);
    try {
      const updateResult = await walletAPI.updateExchangeRates();
      if (updateResult.success) {
        await loadExchangeRates();
        setSuccessMessage('Exchange rates updated successfully');
      } else {
        await loadExchangeRates();
        setError('Failed to update rates from API. Showing cached rates.');
      }
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      setError(error.response?.data?.message || 'Failed to update exchange rates.');
    } finally {
      setIsLoadingRates(false);
    }
  };

const handleCoinPurchase = async () => {
  setIsLoading(true);
  setError('');
  
  try {
    if (coinsToBuy > 100) {
      await requirePIN('purchase', 'Confirm purchase with PIN');
    }

    const paymentData = await walletAPI.createPaymentIntent(coinsToBuy, selectedCurrency);
    
    if (!paymentData.success) {
      throw new Error(paymentData.message);
    }

    // Store payment data and show payment modal
    setPendingPaymentData(paymentData);
    setShowPaymentModal(true);
    
  } catch (error) {
    console.error('Purchase failed:', error);
    setError(`Payment failed: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

const handlePaymentSuccess = async (paymentIntentId) => {
  setIsLoading(true);
  try {
    const processResult = await walletAPI.processSuccessfulPayment(paymentIntentId);
    
    if (processResult.success) {
      await loadWallet();
      await loadTransactions();
      
      setSuccessMessage(`Successfully purchased ${coinsToBuy} coins!`);
      setCoinsToBuy(10);
      setShowPaymentModal(false);
      setPendingPaymentData(null);
    } else {
      throw new Error('Payment succeeded but failed to update wallet');
    }
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen p-6 transition-colors duration-300 bg-emerald-50/50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // PIN setup screen
  if (pinSetupRequired) {
    return (
      <div className="min-h-screen p-6 transition-colors duration-300 bg-emerald-50/50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Coins className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Platora Wallet!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              To secure your wallet and transactions, please set up a 6-digit PIN.
            </p>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6 inline-block">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 mb-6 inline-block">
                <div className="flex items-center">
                  <Coins className="w-5 h-5 text-emerald-600 mr-2" />
                  <p className="text-emerald-700 dark:text-emerald-300">{successMessage}</p>
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-auto mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">PIN Requirements:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
                <li className="flex items-center">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Must be exactly 6 digits
                </li>
                <li className="flex items-center">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Only numbers (0-9)
                </li>
                <li className="flex items-center">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Avoid common patterns (123456, 111111, etc.)
                </li>
              </ul>
            </div>
            <button
              onClick={setupPIN}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
            >
              Set Up PIN
            </button>
          </div>
        </div>
        <PINModal
          isOpen={showPINModal}
          onClose={() => setShowPINModal(false)}
          onVerify={pinModalConfig.onVerify}
          title={pinModalConfig.title}
          isNewPIN={pinModalConfig.isNewPIN}
        />
      </div>
    );
  }

  // Authentication required screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen p-6 transition-colors duration-300 bg-emerald-50/50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Please log in to access your Platora Wallet
            </p>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6 inline-block">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                Go to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="block mx-auto px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen p-6 transition-colors duration-300 bg-emerald-50/50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <UtensilsCrossed className="w-8 h-8 text-emerald-500 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platora Wallet</h1>
              <p className="text-gray-600 dark:text-gray-400">Food Court Digital Payment System</p>
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
              <strong>How it works:</strong> Purchase coins to pay for food orders. 1 coin = Rs. {COIN_BASE_VALUE_LKR}
            </p>
          </div>
        </div>

        {/* Coin Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Coins className="w-8 h-8 mr-3" />
                <div>
                  <h3 className="text-sm opacity-90">Available Coins</h3>
                  <span className="text-3xl font-bold">{userWallet.totalCoins.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">Value in LKR</div>
                <div className="text-xl font-semibold">Rs. {(userWallet.totalCoins * COIN_BASE_VALUE_LKR).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="opacity-90">Ready for food & reservations</span>
            </div>
          </div>
          <div className="rounded-xl p-6 border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Globe className="w-6 h-6 text-emerald-500 mr-3" />
              <div>
                <h3 className="text-sm text-gray-600 dark:text-gray-400">Exchange Rates</h3>
                <div className="text-xs text-gray-500">Last: {lastUpdated.toLocaleTimeString()}</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${isLoadingRates ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isLoadingRates ? 'Updating...' : 'Live Rates'}
            </div>
          </div>
          <div className="rounded-xl p-6 border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{userWallet.memberSince}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Last Top-up</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{userWallet.lastTopup || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Rates Display */}
        <div className="mb-8 rounded-xl p-6 border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Coins className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">1 Coin Value</h2>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Live rates • Auto-updates every 01hr</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(exchangeRates).map(([currency, rate]) => {
              const coinValue = COIN_BASE_VALUE_LKR * rate;
              const symbol = getCurrencySymbol(currency);
              return (
                <div key={currency} className="border rounded-lg p-4 transition-all bg-gray-50 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 dark:bg-gray-700/30">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-500 mb-1">{currency}</div>
                    <div className="text-sm mb-2 text-gray-600 dark:text-gray-400">1 Coin =</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {symbol}{currency === 'JPY' ? coinValue.toFixed(0) : coinValue.toFixed(currency === 'LKR' ? 0 : 4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Coin Purchase */}
          <div className="rounded-xl p-6 border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <CreditCard className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Buy Coins</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Number of Coins</label>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[10, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setCoinsToBuy(amount)}
                      className={`py-3 px-4 rounded-lg border-2 transition-all font-medium ${
                        coinsToBuy === amount ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={coinsToBuy}
                  onChange={(e) => setCoinsToBuy(parseInt(e.target.value) || 0)}
                  placeholder="Custom amount"
                  min="1"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Payment Currency</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {Object.keys(exchangeRates).map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Coins to buy:</span>
                    <span className="font-medium">{coinsToBuy} coins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Base amount (LKR):</span>
                    <span className="font-medium">Rs. {(coinsToBuy * COIN_BASE_VALUE_LKR).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total to pay:</span>
                    <span className="text-emerald-500">{getCurrencySymbol(selectedCurrency)}{paymentAmount} {selectedCurrency}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCoinPurchase}
                disabled={isLoading || coinsToBuy <= 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 px-4 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay with Stripe
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Spending Analytics */}
          <div className="rounded-xl p-6 border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <PieChart className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Spending Categories</h2>
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <RechartsPieChart>
                  <Pie
                    data={analytics.categorySpending}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="coins"
                  >
                    {analytics.categorySpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} coins`, 'Spent']} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {analytics.categorySpending.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index] }}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{category.coins} coins</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="mb-8 rounded-xl p-6 border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <BarChart3 className="w-6 h-6 text-emerald-500 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Spending Trends</h2>
          </div>
          <div className="space-y-4">
            {analytics.monthlyTrends.map((month) => (
              <div key={month.month} className="flex items-center">
                <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">{month.month}</div>
                <div className="flex-1 mx-4">
                  <div className="rounded-full h-6 relative bg-gray-200 dark:bg-gray-700">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(month.coins / Math.max(...analytics.monthlyTrends.map(d => d.coins), 1)) * 100}%` }}
                    >
                      <span className="text-white text-xs font-medium">{month.coins}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm w-20 text-right text-gray-500 dark:text-gray-400">Rs. {month.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction & Refund History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-xl border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction History</h2>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      transaction.type === 'purchase' ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'purchase' ? <ArrowUpRight className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{transaction.description}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{transaction.date}</div>
                    </div>
                  </div>
                  <div className={`font-semibold text-sm ${transaction.coins > 0 ? 'text-emerald-500' : 'text-red-600'}`}>
                    {transaction.coins > 0 ? '+' : ''}{transaction.coins} coins
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Refund History</h2>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto divide-gray-200 dark:divide-gray-700">
              {refundHistory.length > 0 ? refundHistory.map((refund) => (
                <div key={refund.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mr-4">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{refund.description}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{refund.date}</div>
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-emerald-500">+{refund.coins} coins</div>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No refunds yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PIN Modal */}
        <PINModal
          isOpen={showPINModal}
          onClose={() => setShowPINModal(false)}
          onVerify={pinModalConfig.onVerify}
          title={pinModalConfig.title}
          isNewPIN={pinModalConfig.isNewPIN}
        />
        {/* Payment Modal - Add this before the closing </div> of your main component */}
        {showPaymentModal && pendingPaymentData && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setPendingPaymentData(null);
            }}
            onSuccess={handlePaymentSuccess}
            clientSecret={pendingPaymentData.clientSecret}
            amount={paymentAmount}
            currency={selectedCurrency}
            coins={coinsToBuy}
          />
        )}
      </div>
    </div>
  );
};

export default PlatoraWalletDashboard;
