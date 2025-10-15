// src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Utensils } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import BackToHomeButton from "../components/BackToHomeButton";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const valid =
      password.length >= 8 && confirmPassword === password && !!token;
    setIsFormValid(valid);
  }, [password, confirmPassword, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      await axiosInstance.post("/api/auth/reset-password", {
        token,
        newPassword: password,
      });

      toast.success("Password reset successful! Please log in.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to reset password. Try again."
      );
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
              Reset Your Password
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-sm text-gray-600 dark:text-gray-200"
              >
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                placeholder="At least 8 characters"
                onChange={(e) => setPassword(e.target.value)}
                className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="confirmPassword"
                className="block mb-2 text-sm text-gray-600 dark:text-gray-200"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                placeholder="Confirm your new password"
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
            <Link
              to="/login"
              className="text-emerald-500 hover:opacity-70 transition-all duration-200"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
