// src/pages/RedirectPage.jsx
import { useAuth } from "../utils/AuthContext";
import RoleRedirector from "../routes/RoleRedirector";

const RedirectPage = () => {
  const { loading } = useAuth();

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center mt-10">
          <svg
            className="animate-spin h-8 w-8 text-emerald-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
      ) : (
        <>
          <p className="text-center text-gray-600 mt-10">
            Redirecting based on your role...
          </p>
          <RoleRedirector />
        </>
      )}
    </>
  );
};

export default RedirectPage;
