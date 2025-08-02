import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from '../utils/AuthContext';


const NotFound = () => {

  const {user} = useAuth();

  return (
    <section className="relative z-10 bg-white dark:bg-gray-900 py-20 min-h-screen flex items-center">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <div className="max-w-md text-center">
            <h2 className="text-[80px] font-extrabold leading-none text-emerald-500 mb-2">
              404
            </h2>
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
              Oops! That page can’t be found
            </h4>
            <p className="text-base text-gray-500 dark:text-gray-400 mb-8">
              The page you’re looking for doesn’t exist or was moved.
            </p>
          { user?.role == 'customer' ?
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              Go Back Home
            </Link>
            : user?.role == 'restaurant' ?
            <Link
              to="/restaurant"
              className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              Go Back Home
            </Link>
          : user?.role == 'admin' ?
            <Link
              to="/admin"
              className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              Go Back Home
            </Link>
          : 
          <Link
              to="/"
              className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              Go Back Home
            </Link>
          }
          </div>
        </div>
      </div>

      {/* Background Gradient Stripes */}
      <div className="absolute left-0 top-0 -z-10 flex h-full w-full items-center justify-between space-x-5 md:space-x-8 lg:space-x-14 opacity-10 pointer-events-none">
        <div className="h-full w-1/3 bg-gradient-to-t from-emerald-300/20 to-transparent dark:from-emerald-400/10"></div>
        <div className="flex h-full w-1/3">
          <div className="h-full w-1/2 bg-gradient-to-b from-emerald-300/20 to-transparent dark:from-emerald-400/10"></div>
          <div className="h-full w-1/2 bg-gradient-to-t from-emerald-300/20 to-transparent dark:from-emerald-400/10"></div>
        </div>
        <div className="h-full w-1/3 bg-gradient-to-b from-emerald-300/20 to-transparent dark:from-emerald-400/10"></div>
      </div>
    </section>
  );
};

export default NotFound;
