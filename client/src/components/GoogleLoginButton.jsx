import React from 'react';
import { Link } from 'react-router-dom';

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:3000/api/auth/google";
  };
  return (
    <button
      onClick={handleGoogleLogin}
      className="
        flex items-center justify-center
        w-11 h-11 rounded-full border
        border-gray-300 dark:border-gray-700
        bg-white dark:bg-gray-900
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-all shadow-sm
      "
      aria-label="Login with Google"
    >
      <img
        src="/images/google-icon.png"
        alt="Google"
        className="w-5 h-5"
      />
    </button>
  );
};

export default GoogleLoginButton;
