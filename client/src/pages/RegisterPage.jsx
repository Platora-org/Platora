import React, { useState, useEffect } from 'react';
import ImageCarousel from '../components/ImageCarousel';
import { Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { AnimatePresence, motion } from 'framer-motion';
import BackToHomeButton from '../components/BackToHomeButton';
import axiosInstance from '../utils/axiosInstance';
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

function RegisterPage() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    // State management for form inputs
    const [selectedRole, setSelectedRole] = useState('customer');
    const [restaurantName, setRestaurantName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMatch, setPasswordMatch] = useState(true);

    // Derived state to track overall form validity
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        const isValid =
            firstName.trim() &&
            lastName.trim() &&
            validatePhone(phone) &&
            validateEmail(email) &&
            password.length >= 8 &&
            getPasswordStrength(password) !== 'Weak' &&
            password === confirmPassword &&
            (!selectedRole || selectedRole === 'customer' || (selectedRole === 'restaurant' && restaurantName.trim()));

        setIsFormValid(isValid);
    }, [firstName, lastName, phone, email, password, confirmPassword, selectedRole, restaurantName]);


    // New state for error tracking and password strength
    const [errors, setErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState('');

    // --- Validation Helpers ---
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone) => /^07\d{8}$/.test(phone);

    const getPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[@$!%*?&#]/.test(password)) strength++;

        if (strength <= 2) return 'Weak';
        if (strength === 3) return 'Medium';
        return 'Strong';
    };



    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent form default submission behavior

        if (!isFormValid) return;

        const payload = {
            role: selectedRole,
            firstName,
            lastName,
            email,
            phone,
            password,
            ...(selectedRole === 'restaurant' && { restaurantName }),
        };

        try {
            const response = await axiosInstance.post('/api/auth/register', payload);
            console.log('Registration success:', response.data);

            // Optional: redirect user or show success message
            // navigate('/login'); or show success toast
            setUser(response.data.user);
            navigate("/redirect");
        } catch (error) {
            console.error('Registration failed:', error.response?.data || error.message);

            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Registration failed. Please try again.";

            toast.error(errorMessage); // <-- show user-friendly toast error
        }
    };


    // --- Input Handlers with Validation ---
    const handleEmailChange = (e) => {
        const val = e.target.value;
        // Allows only valid email characters
        const sanitizedValue = val.replace(/[^a-zA-Z0-9@._-]/g, '');
        setEmail(sanitizedValue);
        setErrors(prev => ({ ...prev, email: validateEmail(sanitizedValue) ? '' : 'Invalid email format' }));
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value;
        // Allows only numbers and limits length to 10
        const sanitizedValue = val.replace(/[^0-9]/g, '');
        if (sanitizedValue.length <= 10) {
            setPhone(sanitizedValue);
            setErrors(prev => ({ ...prev, phone: validatePhone(sanitizedValue) ? '' : 'Invalid phone format (e.g., 07XXXXXXXX)' }));
        }
    };

      const handleFirstNameChange = (e) => {
        // Allows only letters, spaces, and hyphens for names
        const sanitizedValue = e.target.value.replace(/[^a-zA-Z\s-]/g, '');
        setFirstName(sanitizedValue);
    };
    
    const handleLastNameChange = (e) => {
        // Allows only letters, spaces, and hyphens for names
        const sanitizedValue = e.target.value.replace(/[^a-zA-Z\s-]/g, '');
        setLastName(sanitizedValue);
    };

    const handleRestaurantNameChange = (e) => {
        // Allows letters, numbers, spaces, and some special characters
        // The hyphen '-' is now escaped to be treated as a literal character.
        const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9\s'\-&]/g, '');
        setRestaurantName(sanitizedValue);
    };

    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setPassword(val);
        setPasswordMatch(val === confirmPassword);
        setPasswordStrength(getPasswordStrength(val));
        setErrors(prev => ({ ...prev, password: val.length >= 8 ? '' : 'Password must be at least 8 characters' }));
    };

    const handleConfirmPasswordChange = (e) => {
        const val = e.target.value;
        setConfirmPassword(val);
        const match = password === val;
        setPasswordMatch(match);
        setErrors(prev => ({ ...prev, confirmPassword: match ? '' : 'Passwords do not match' }));
    };

    return (
        <section className="bg-white dark:bg-gray-900 transition-colors duration-300 min-h-screen overflow-y-auto">
            <div className="flex justify-center min-h-screen">
                <div className="hidden h-screen lg:block lg:w-1/2">
                    <ImageCarousel />
                </div>

                <div className="flex items-center w-full max-w-3xl px-6 mx-auto lg:px-12 lg:w-3/5">
                    <BackToHomeButton />
                    <div className="w-full">
                        {/* Title Section */}
                        <div className="text-center mb-3">
                            <div className="flex justify-center mx-auto mb-2">
                                <Utensils className="h-8 w-8 text-gray-600 dark:text-white" />
                            </div>
                            <h1 className="text-xl font-semibold text-gray-800 capitalize dark:text-white">
                                Get your free account now.
                            </h1>
                        </div>

                        {/* Role Selection */}
                        <div className="flex flex-col justify-center items-center">
                            <h2 className="text-sm text-gray-600 dark:text-gray-300">Select type of account</h2>
                            <div className="mt-3 md:flex md:items-center md:-mx-2">
                                {/* Customer Button */}
                                <button
                                    onClick={() => setSelectedRole('customer')}
                                    className={`flex justify-center items-center w-full px-4 py-2 text-sm rounded-lg hover:cursor-pointer md:w-auto md:mx-2 transition-all duration-200 focus:outline-none ${selectedRole === 'customer'
                                        ? 'text-white bg-emerald-500 hover:bg-emerald-600'
                                        : 'text-emerald-500 border border-emerald-500 dark:border-emerald-400 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="ml-2">Customer</span>
                                </button>

                                {/* Restaurant Button */}
                                <button
                                    onClick={() => setSelectedRole('restaurant')}
                                    className={`flex justify-center items-center w-full px-4 py-2 mt-4 text-sm hover:cursor-pointer rounded-lg md:mt-0 md:w-auto md:mx-2 transition-all duration-200 focus:outline-none ${selectedRole === 'restaurant'
                                        ? 'text-white bg-emerald-500 hover:bg-emerald-600'
                                        : 'text-emerald-500 border border-emerald-500 dark:border-emerald-400 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="ml-2">Restaurant</span>
                                </button>
                            </div>
                        </div>

                        {/* Registration Form */}
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 mt-3 md:grid-cols-2 relative">
                            <AnimatePresence mode="wait">
                                {selectedRole === 'restaurant' && (
                                    <motion.div
                                        key="restaurant-field"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="md:col-span-2 overflow-hidden"
                                    >
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Restaurant Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter restaurant name"
                                            value={restaurantName}
                                            onChange={handleFirstNameChange}
                                            className="block text-sm w-full px-4 py-2.5 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">First Name</label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={firstName}
                                    onChange={handleFirstNameChange}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Snow"
                                    value={lastName}
                                    onChange={handleLastNameChange}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="XXX-XX-XXXX-XXX"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />
                                <AnimatePresence mode="wait">
                                    {errors.phone && (
                                        <motion.div
                                            key="phone-error-wrapper"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <motion.p
                                                key="phone-error"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-red-500 text-sm mt-1"
                                            >
                                                {errors.phone}
                                            </motion.p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="johnsnow@example.com"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />
                                <AnimatePresence mode="wait">
                                    {errors.email && (
                                        <motion.div
                                            key="email-error-wrapper"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <motion.p
                                                key="email-error"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-red-500 text-sm mt-1"
                                            >
                                                {errors.email}
                                            </motion.p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />

                                <AnimatePresence>
                                    {(errors.password || password) && (
                                        <motion.div
                                            key="pw-wrapper"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="relative mt-1 mb-1"
                                        >
                                            {errors.password && (
                                                <motion.p
                                                    key="pw-length-error"
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="text-red-500 text-sm"
                                                >
                                                    {errors.password}
                                                </motion.p>
                                            )}
                                            {!errors.password && password && (
                                                <motion.p
                                                    key="pw-strength"
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    transition={{ duration: 0.2 }}
                                                    className={`text-sm ${passwordStrength === 'Strong'
                                                        ? 'text-green-600'
                                                        : passwordStrength === 'Medium'
                                                            ? 'text-yellow-600'
                                                            : 'text-red-500'
                                                        }`}
                                                >
                                                    Strength: {passwordStrength}
                                                </motion.p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>




                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Confirm Password</label>
                                <input
                                    type="password"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={handleConfirmPasswordChange}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />
                                <div className="relative mt-1 min-h-[20px]">
                                    <AnimatePresence initial={false} mode="wait">
                                        {!passwordMatch && (
                                            <motion.p
                                                key="pw-error"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute text-red-500 text-sm"
                                            >
                                                Passwords do not match.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>

                            <button
                                type="submit"
                                disabled={!isFormValid}
                                className={`flex items-center justify-center w-full px-6 py-3 text-sm tracking-wide rounded-xl font-semibold md:col-span-2 shadow-lg transition-all duration-200 transform ${isFormValid
                                    ? 'text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 hover:scale-[1.02] cursor-pointer'
                                    : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Sign Up
                            </button>
                        </form>

                        <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link
                                to={'/login'}
                                className="text-emerald-500 hover:opacity-55 transition-all duration-200"
                            >
                                Log in
                            </Link>
                            .
                        </p>
                         <AnimatePresence mode="wait">
                            {selectedRole === 'customer' && (
                                <motion.div
                                    key="google-login-section"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <span className="flex items-center mt-5">
                                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600"></span>
                                        <span className="shrink-0 px-4 text-gray-600 dark:text-gray-400">or continue with</span>
                                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600"></span>
                                    </span>
                                    <div className="flex justify-center mt-3">
                                        <GoogleLoginButton />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default RegisterPage;
