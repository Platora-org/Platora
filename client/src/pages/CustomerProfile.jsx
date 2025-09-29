import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import CustomerProfileSideBar from "../components/customerProfileComponents/CustomerProfileSideBar";
import { useAuth } from '../utils/AuthContext';
import ChatBox from "./components/ChatBox";



const CustomerProfile = () => {
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  <ChatBox
  orderId={order.id}
  recipientEmail={order.restaurant_email} // order must include restaurant email
/>

 
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700">
          <div className="sticky top-0 h-screen">
            <CustomerProfileSideBar onLogout={logout} loggedUser={user}/>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-black opacity-50" 
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            <div className="relative w-64 bg-white dark:bg-gray-800 shadow-lg h-full">
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CustomerProfileSideBar onLogout={logout} loggedUser={user}/>
            </div>
          </div>
        )}

        {/* Mobile Sidebar Toggle - Positioned below your header */}
        <div className="lg:hidden fixed top-21 left-2 z-40">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-6 lg:p-8 pt-14 lg:pt-8"> {/* Added top padding for mobile */}
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;