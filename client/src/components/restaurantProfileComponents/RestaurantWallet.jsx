import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { CheckCircle, X, ChevronDown } from "lucide-react";
import { useAuth } from "../../utils/AuthContext"; 

// Sri Lankan Banks and their branches
const SRI_LANKAN_BANKS = {
  "Bank of Ceylon": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Anuradhapura Branch",
    "Batticaloa Branch",
    "Jaffna Branch",
    "Trincomalee Branch",
    "Ratnapura Branch",
    "Badulla Branch",
    "Ampara Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch"
  ],
  "People's Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Anuradhapura Branch",
    "Negombo Branch",
    "Jaffna Branch",
    "Batticaloa Branch",
    "Trincomalee Branch",
    "Ratnapura Branch",
    "Badulla Branch",
    "Hambantota Branch",
    "Vavuniya Branch",
    "Mannar Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Kotte Branch"
  ],
  "Commercial Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Anuradhapura Branch",
    "Jaffna Branch",
    "Batticaloa Branch",
    "Trincomalee Branch",
    "Ratnapura Branch",
    "Badulla Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch",
    "Ja-Ela Branch"
  ],
  "Hatton National Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Anuradhapura Branch",
    "Jaffna Branch",
    "Batticaloa Branch",
    "Trincomalee Branch",
    "Ratnapura Branch",
    "Badulla Branch",
    "Hambantota Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch"
  ],
  "Sampath Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Anuradhapura Branch",
    "Jaffna Branch",
    "Batticaloa Branch",
    "Trincomalee Branch",
    "Ratnapura Branch",
    "Badulla Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch",
    "Homagama Branch"
  ],
  "Seylan Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Anuradhapura Branch",
    "Jaffna Branch",
    "Batticaloa Branch",
    "Trincomalee Branch",
    "Ratnapura Branch",
    "Badulla Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch",
    "Homagama Branch"
  ],
  "Nations Trust Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Ratnapura Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch",
    "Battaramulla Branch",
    "Rajagiriya Branch",
    "Wellawatte Branch",
    "Bambalapitiya Branch",
    "Kollupitiya Branch",
    "Pettah Branch"
  ],
  "DFCC Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Anuradhapura Branch",
    "Ratnapura Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch",
    "Battaramulla Branch",
    "Rajagiriya Branch",
    "Wellawatte Branch",
    "Bambalapitiya Branch",
    "Kollupitiya Branch"
  ],
  "Union Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch",
    "Battaramulla Branch",
    "Rajagiriya Branch",
    "Wellawatte Branch",
    "Bambalapitiya Branch",
    "Kollupitiya Branch",
    "Mount Lavinia Branch",
    "Ratmalana Branch"
  ],
  "Pan Asia Bank": [
    "Colombo Main Branch",
    "Kandy Branch",
    "Galle Branch",
    "Negombo Branch",
    "Matara Branch",
    "Kurunegala Branch",
    "Ratnapura Branch",
    "Kalutara Branch",
    "Panadura Branch",
    "Moratuwa Branch",
    "Dehiwala Branch",
    "Maharagama Branch",
    "Kotte Branch",
    "Nugegoda Branch",
    "Battaramulla Branch",
    "Rajagiriya Branch",
    "Wellawatte Branch",
    "Bambalapitiya Branch",
    "Kollupitiya Branch",
    "Kiribathgoda Branch"
  ]
};

const KYC_STATUS = {
  NOT_SUBMITTED: "NOT_SUBMITTED", 
  PENDING: "PENDING",
  REJECTED: "REJECTED", 
  APPROVED: "APPROVED",
};

// Toast Notification Component
const Toast = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`flex items-center space-x-3 px-6 py-4 rounded-xl shadow-lg max-w-md ${
        type === 'success' 
          ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700' 
          : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
      }`}>
        <div className={`flex-shrink-0 ${
          type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {type === 'success' ? (
            <CheckCircle className="w-6 h-6" />
          ) : (
            <X className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1">
          <p className={`font-medium ${
            type === 'success' 
              ? 'text-emerald-800 dark:text-emerald-200' 
              : 'text-red-800 dark:text-red-200'
          }`}>
            {type === 'success' ? 'Success!' : 'Error!'}
          </p>
          <p className={`text-sm ${
            type === 'success' 
              ? 'text-emerald-700 dark:text-emerald-300' 
              : 'text-red-700 dark:text-red-300'
          }`}>
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 p-1 rounded-full hover:bg-opacity-20 transition-colors ${
            type === 'success' 
              ? 'hover:bg-emerald-600 text-emerald-500 dark:text-emerald-400' 
              : 'hover:bg-red-600 text-red-500 dark:text-red-400'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Custom Dropdown Component
const CustomDropdown = ({ value, onChange, options, placeholder, error, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer flex items-center justify-between ${
          error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
        } ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}`}
      >
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-auto">
          {options.map((option, index) => (
            <div
              key={index}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-white transition-colors"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RestaurantWallet = () => {
  const { user: loggedUser, setUser, loading } = useAuth();
  const [nic, setNIC] = useState(null);
  const [businessReg, setBusinessReg] = useState(null);
  const [tin, setTIN] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [kycData, setKycData] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Toast state
  const [toast, setToast] = useState({
    isVisible: false,
    message: "",
    type: "success"
  });

  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  const maxSize = 5 * 1024 * 1024;

  // Enhanced regex patterns
  const patterns = {
    tin: /^[0-9]{9}$/,
    bankAccount: /^[0-9]{6,20}$/,
    bank: /^[A-Za-z\s&.-]{2,50}$/,
    branch: /^[A-Za-z0-9\s&.,-]{2,50}$/,
    name: /^[A-Za-z\s]{2,30}$/,
  };

  // Real-time input validation with character restriction
  const handleInputChange = (field, value) => {
    let filteredValue = value;
    let newErrors = { ...errors };

    switch (field) {
      case 'tin':
        // Only allow numbers, max 9 digits
        filteredValue = value.replace(/[^0-9]/g, '').slice(0, 9);
        
        if (value !== filteredValue) {
          newErrors.tin = "TIN must contain only digits.";
        } else if (filteredValue && filteredValue.length < 9) {
          newErrors.tin = "TIN must be exactly 9 digits.";
        } else {
          delete newErrors.tin;
        }
        
        setTIN(filteredValue);
        break;

      case 'bankAccount':
        // Only allow numbers, max 20 digits
        filteredValue = value.replace(/[^0-9]/g, '').slice(0, 20);
        
        if (value !== filteredValue) {
          newErrors.bankAccount = "Bank account must contain only digits.";
        } else if (filteredValue && filteredValue.length < 6) {
          newErrors.bankAccount = "Bank account must be at least 6 digits.";
        } else {
          delete newErrors.bankAccount;
        }
        
        setBankAccount(filteredValue);
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  // Handle bank selection
  const handleBankChange = (selectedBank) => {
    setBankName(selectedBank);
    setBranchName(""); // Reset branch when bank changes
    
    // Clear bank name errors
    const newErrors = { ...errors };
    delete newErrors.bankName;
    delete newErrors.branchName;
    setErrors(newErrors);
  };

  // Handle branch selection
  const handleBranchChange = (selectedBranch) => {
    setBranchName(selectedBranch);
    
    // Clear branch errors
    const newErrors = { ...errors };
    delete newErrors.branchName;
    setErrors(newErrors);
  };

  // Show toast function
  const showToast = (message, type = 'success') => {
    setToast({
      isVisible: true,
      message,
      type
    });
  };

  // Hide toast function
  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // Fetch KYC status on component mount
  useEffect(() => {
    const fetchKYCStatus = async () => {
      if (!loggedUser) return;
      
      try {
        const response = await axios.get("/api/restaurant/kyc/status", {
          withCredentials: true,
        });
        
        if (response.data.user) {
          setFirstName(response.data.user.first_name);
          setLastName(response.data.user.last_name);
          setRestaurantName(response.data.user.restaurant_name); 
          setEmail(response.data.user.email || "");
        }
        
        if (response.data.kycData) {
          setKycData(response.data.kycData);
          if (response.data.kycData.status === 'REJECTED') {
            setRejectionReason(response.data.kycData.rejection_reason || "");
          }
        }
      } catch (error) {
        console.error("Error fetching KYC status:", error);
        showToast("Failed to fetch KYC status", "error");
      }
    };

    fetchKYCStatus();
  }, [loggedUser]);

  const handleFileChange = (setter, label) => (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let newErrors = { ...errors };

    if (!allowedTypes.includes(file.type)) {
      newErrors[label] = `Invalid file type. Allowed: JPG, PNG, PDF.`;
      setter(null);
    } else if (file.size > maxSize) {
      newErrors[label] = `File too large. Maximum 5MB allowed.`;
      setter(null);
    } else {
      setter(file);
      delete newErrors[label];
    }

    setErrors(newErrors);
  };

  const sanitizeInput = (input) => input.replace(/[^\w\s-]/gi, "");

  const validateForm = () => {
    let newErrors = {};

    // Required field validations
    if (!firstName) newErrors.firstName = "First name is required.";
    else if (!patterns.name.test(firstName)) newErrors.firstName = "First name must contain only letters.";

    if (!lastName) newErrors.lastName = "Last name is required.";
    else if (!patterns.name.test(lastName)) newErrors.lastName = "Last name must contain only letters.";

    if (!tin) newErrors.tin = "TIN number is required.";
    else if (!patterns.tin.test(tin)) newErrors.tin = "TIN must be exactly 9 digits.";

    if (!bankAccount) newErrors.bankAccount = "Bank account number is required.";
    else if (!patterns.bankAccount.test(bankAccount)) newErrors.bankAccount = "Bank account must be 6–20 digits.";

    if (!bankName) newErrors.bankName = "Bank name is required.";
    if (!branchName) newErrors.branchName = "Branch name is required.";

    if (!nic) newErrors.nic = "NIC document is required.";
    if (!businessReg) newErrors.businessReg = "Business registration document is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = useMemo(() => {
    return (
      firstName &&
      lastName &&
      restaurantName &&
      email &&
      tin &&
      bankAccount &&
      bankName &&
      branchName &&
      nic &&
      businessReg &&
      Object.keys(errors).length === 0
    );
  }, [firstName, lastName, restaurantName, email, tin, bankAccount, bankName, branchName, nic, businessReg, errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loggedUser) {
      setErrors({ form: "User not found!" });
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append("nic_doc", nic);
      formData.append("business_reg_doc", businessReg);
      formData.append("tin_number", sanitizeInput(tin));
      formData.append("bank_account_number", sanitizeInput(bankAccount));
      formData.append("bank_name", sanitizeInput(bankName));
      formData.append("branch", sanitizeInput(branchName));
      formData.append("first_name", sanitizeInput(firstName));
      formData.append("last_name", sanitizeInput(lastName));
      formData.append("restaurant_name", sanitizeInput(restaurantName));
      formData.append("email", sanitizeInput(email));

      const res = await axios.post("/api/restaurant/kyc/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      setKycData({
        ...res.data.kycRecord,
        status: KYC_STATUS.PENDING,
        created_at: new Date().toISOString()
      });
      
      showToast("KYC submitted successfully! Please wait for verification.");
      
      // Clear form data
      setNIC(null);
      setBusinessReg(null);
      setTIN("");
      setBankAccount("");
      setBankName("");
      setBranchName("");
      setErrors({});
      
    } catch (err) {
      console.error("KYC submission failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to submit KYC.";
      setErrors({ form: errorMessage });
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-emerald-50/50 dark:bg-gray-900">
        <div className="animate-pulse text-emerald-600 dark:text-emerald-400">
          Loading user information...
        </div>
      </div>
    );
  }

  if (!loggedUser) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-emerald-50/50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <p className="text-gray-800 dark:text-white text-center">
            Please log in to access your wallet.
          </p>
        </div>
      </div>
    );
  }

  // Determine KYC status
  const kycStatus = kycData ? kycData.status : KYC_STATUS.NOT_SUBMITTED;

  const content = useMemo(() => {
    switch (kycStatus) {
      case KYC_STATUS.NOT_SUBMITTED:
      case KYC_STATUS.REJECTED:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              {kycStatus === KYC_STATUS.REJECTED && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6 mb-8">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                        KYC Application Rejected
                      </h3>
                      <p className="text-red-700 dark:text-red-300 mb-2">
                        Your KYC application has been rejected. Please review the feedback and resubmit.
                      </p>
                      {rejectionReason && (
                        <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 mt-3">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">Reason:</p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Complete Your KYC Verification
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Verify your identity to access wallet features and start receiving payments
                </p>
              </div>

              {errors.form && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
                  <p className="text-red-700 dark:text-red-300 text-center">{errors.form}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information Section */}
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Restaurant Owner's Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        disabled
                      />
                      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        disabled
                      />
                      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                    </div>

                    {/* Restaurant name */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Restaurant Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={restaurantName}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        disabled
                      />
                      {errors.restaurantName && <p className="text-red-500 text-sm mt-1">{errors.restaurantName}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={email}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        disabled
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Upload
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* NIC Upload */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        NIC Document <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          onChange={handleFileChange(setNIC, "nic")}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                          accept=".jpg,.jpeg,.png,.pdf"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Accepted formats: JPG, PNG, PDF (Max 5MB)
                      </p>
                      {errors.nic && <p className="text-red-500 text-sm mt-1">{errors.nic}</p>}
                    </div>

                    {/* Business Registration Upload */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Business Registration <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          onChange={handleFileChange(setBusinessReg, "businessReg")}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                          accept=".jpg,.jpeg,.png,.pdf"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Accepted formats: JPG, PNG, PDF (Max 5MB)
                      </p>
                      {errors.businessReg && <p className="text-red-500 text-sm mt-1">{errors.businessReg}</p>}
                    </div>
                  </div>
                </div>

                {/* Banking Information Section */}
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Banking Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TIN Number */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        TIN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tin}
                        onChange={(e) => handleInputChange('tin', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                          errors.tin ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Enter 9-digit TIN"
                        maxLength={9}
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Only numbers allowed, exactly 9 digits
                      </p>
                      {errors.tin && <p className="text-red-500 text-sm mt-1">{errors.tin}</p>}
                    </div>

                    {/* Bank Account Number */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Bank Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                          errors.bankAccount ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Enter bank account number"
                        maxLength={20}
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Only numbers allowed, 6-20 digits
                      </p>
                      {errors.bankAccount && <p className="text-red-500 text-sm mt-1">{errors.bankAccount}</p>}
                    </div>

                    {/* Bank Name Dropdown */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        value={bankName}
                        onChange={handleBankChange}
                        options={Object.keys(SRI_LANKAN_BANKS)}
                        placeholder="Select your bank"
                        error={errors.bankName}
                      />
                      {errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>}
                    </div>

                    {/* Branch Name Dropdown */}
                    <div>
                      <label className="block font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Branch Name <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        value={branchName}
                        onChange={handleBranchChange}
                        options={bankName ? SRI_LANKAN_BANKS[bankName] || [] : []}
                        placeholder={bankName ? "Select branch" : "Select bank first"}
                        error={errors.branchName}
                        disabled={!bankName}
                      />
                      {errors.branchName && <p className="text-red-500 text-sm mt-1">{errors.branchName}</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={!isFormValid || submitting}
                    className={`w-full px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                      isFormValid && !submitting
                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting KYC...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit KYC Application
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case KYC_STATUS.PENDING:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
                <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                KYC Under Review
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                Your KYC application is being reviewed by our team. This process typically takes 1-3 business days.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      What happens next?
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Our team will verify your submitted documents</li>
                      <li>• You'll receive an email notification once reviewed</li>
                      <li>• Your wallet will be activated upon approval</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                Submitted on: {kycData ? new Date(kycData.created_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>
        );

      case KYC_STATUS.APPROVED:
        return (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Balance Card */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold opacity-90">Available Balance</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="text-4xl font-bold mb-2">LKR 235,750.00</div>
                  <p className="text-emerald-100 text-sm">Last updated: Today</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl p-4 transition-colors group">
                      <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Funds</p>
                    </button>
                    <button className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl p-4 transition-colors group">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Transfer</p>
                    </button>
                    <button className="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl p-4 transition-colors group">
                      <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Analytics</p>
                    </button>
                    <button className="bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl p-4 transition-colors group">
                      <svg className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Settings</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="lg:col-span-3">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
                    <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm transition-colors">
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {/* Transaction Items */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Payment Received</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Order #1234 • 2 hours ago</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+LKR 14,250.00</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Service Fee</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Platform fee • Yesterday</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">-LKR 950.00</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Payment Received</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Order #1233 • 2 days ago</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+LKR 26,825.00</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Bank Transfer</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Withdrawal to bank • 3 days ago</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">-LKR 95,000.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [
    kycStatus,
    firstName,
    lastName,
    nic,
    businessReg,
    tin,
    bankAccount,
    bankName,
    branchName,
    submitting,
    errors,
    isFormValid,
    kycData,
    rejectionReason,
  ]);

  return (
    <div className="min-h-screen bg-emerald-50/50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Restaurant Wallet
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your payments and financial information
          </p>
        </div>
        {content}
        
        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </div>
    </div>
  );
};

export default RestaurantWallet;