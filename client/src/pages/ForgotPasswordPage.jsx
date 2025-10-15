// src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Utensils } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import BackToHomeButton from "../components/BackToHomeButton";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const handleEmailChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9@._-]/g, "");
    setEmail(value);
    setIsFormValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      await axiosInstance.post("/api/auth/forgot-password", { email });
      toast.success("If this email exists, a reset link has been sent.");
      setEmail("");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 h-screen flex transition-colors duration-300">
      <div className="flex items-center w-full max-w-md px-6 mx-auto">
        <BackToHomeButton />
        <div className="flex-1">
          <div className="text-center">
            <div className="flex justify-center mx-auto">
              <Utensils className="h-8 w-8 text-gray-600 dark:text-white" />
            </div>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Forgot your password?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter your email below and we’ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm text-gray-600 dark:text-gray-200"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                placeholder="example@example.com"
                onChange={handleEmailChange}
                className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-3 px-6 rounded-xl font-semibold shadow-lg transition-all duration-200 transform ${
                  isFormValid && !isSubmitting
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:scale-[1.02]"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
            Remember your password?{" "}
            <Link
              to="/login"
              className="text-emerald-500 hover:opacity-70 transition-all duration-200"
            >
              Back to Login
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
