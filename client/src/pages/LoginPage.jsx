import { useState, useEffect } from 'react';
import ImageCarousel from '../components/ImageCarousel';
import { Utensils } from 'lucide-react';
import { Link } from "react-router-dom";
import GoogleLoginButton from '../components/GoogleLoginButton';
import BackToHomeButton from '../components/BackToHomeButton';
import axiosInstance from '../utils/axiosInstance';
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

function LoginPage() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);

     const handleEmailChange = (e) => {
        const value = e.target.value;
        const sanitizedValue = value.replace(/[^a-zA-Z0-9@._-]/g, '');
        setEmail(sanitizedValue);
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent form default submission behavior

        if (!isFormValid) return;

        const payload = {
            email,
            password
        };

        try {
            const response = await axiosInstance.post('/api/auth/login', payload);
            console.log('Login success:', response.data);

            // Optional: redirect user or show success message
            // navigate('/login'); or show success toast
            setUser(response.data.user);
            navigate("/redirect");
        } catch (error) {
            console.error('Login failed:', error.response?.data || error.message);

            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Login failed. Please try again.";

            toast.error(errorMessage); // <-- show user-friendly toast error
        }
    };

    useEffect(() => {
        const isValid = validateEmail(email) && password.length >= 8;
        setIsFormValid(isValid);
    }, [email, password]);



    return (
        <div className="bg-white dark:bg-gray-900 transition-colors duration-300 h-screen  flex">

            <div className="hidden lg:block lg:w-1/2">
                <ImageCarousel />
            </div>


            <div className="flex items-center w-full max-w-md px-6 mx-auto lg:w-1/2">
                <BackToHomeButton />
                <div className="flex-1">
                    <div className="text-center">
                        <div className="flex justify-center mx-auto">
                            <Utensils className="h-8 w-8 dark:text-white text-gray-600" />
                        </div>

                        <p className="mt-3 text-gray-600 dark:text-gray-300">Sign in to access your account</p>
                    </div>

                    <div className="mt-8">
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block mb-2 text-sm text-gray-600 dark:text-gray-200">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={email}
                                    placeholder="example@example.com"
                                    onChange={handleEmailChange}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />
                            </div>

                            <div className="mt-6">
                                <div className="flex justify-between mb-2">
                                    <label htmlFor="password" className="text-sm text-gray-600 dark:text-gray-200">
                                        Password
                                    </label>
                                    <Link to={'/forgotpassword'}
                                        className="text-sm text-gray-500 focus:text-emerald-500 hover:text-emerald-500 transition-all duration-200"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>

                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    value={password}
                                    placeholder="Your Password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                                />
                            </div>

                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`w-full py-3 px-6 rounded-xl font-semibold shadow-lg transition-all duration-200 transform ${isFormValid
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 hover:scale-[1.02] cursor-pointer'
                                        : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    Sign in
                                </button>

                            </div>
                        </form>

                        <p className="mt-6 text-sm text-center text-gray-600 mb-5  dark:text-gray-400">
                            Don't have an account yet?{'  '}
                            <Link
                                to={'/register'}
                                className="text-emerald-500 hover:opacity-55 transition-all duration-200"
                            >
                                Sign up
                            </Link>
                            .
                        </p>
                        <span className="flex items-center">
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600"></span>

                            <span className="shrink-0 px-4 text-gray-600 dark:text-gray-400">or continue with</span>

                            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600"></span>
                        </span>
                        <div className="flex justify-center mt-6">
                            <GoogleLoginButton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
