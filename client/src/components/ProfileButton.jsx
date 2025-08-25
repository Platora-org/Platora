import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, Shield, Store, Heart, Receipt, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

// Profile menu configuration for different user roles
const profileMenuConfig = {
    customer: [
        { label: "My Profile", path: "/customerprofile/", icon: User },
    ]
};

const ProfileButton = ({ scrolled, onLogout, userRole = 'customer' }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { user } = useAuth();

    const currentMenuItems = profileMenuConfig[userRole] || profileMenuConfig.customer;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get user display name based on user object structure
    const getUserDisplayName = (user) => {
        if (!user) return 'User';

        if (user.role === 'restaurant') {
            // Try restaurant name from profile
            
            const restaurantName = user.restaurantName;
            console.log(user);
            if (restaurantName) return restaurantName;
        }

        if (user.firstName) return user.firstName;

        return user.email?.split('@')[0] || 'User';
    };


    // Get role-specific styling
    const getRoleColor = () => {
        switch (userRole) {
            case 'admin':
                return 'text-red-600 dark:text-red-400';
            case 'restaurant':
                return 'text-orange-600 dark:text-orange-400';
            case 'customer':
            default:
                return 'text-emerald-600 dark:text-emerald-400';
        }
    };

    const getRoleBadge = () => {
        const badges = {
            admin: { label: 'Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
            restaurant: { label: 'Restaurant', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
            customer: { label: 'Customer', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' }
        };
        return badges[userRole] || badges.customer;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Profile Button */}
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center space-x-3 px-4 py-2 rounded-full transition-all duration-300 ${scrolled
                    ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                aria-label="Profile menu"
            >
                {/* Profile Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-600">
                    {userRole === 'admin' ? (
                        <Shield className={`w-4 h-4 ${getRoleColor()}`} />
                    ) : userRole === 'restaurant' ? (
                        <Store className={`w-4 h-4 ${getRoleColor()}`} />
                    ) : (
                        <User className={`w-5 h-5 ${getRoleColor()}`} />
                    )}
                </div>

                {/* User Name & Role - Hidden on mobile */}
                <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getUserDisplayName(user)}
                    </div>
                    <div className={`text-xs ${getRoleColor()} capitalize`}>
                        {userRole}
                    </div>
                </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-600">
                                {userRole === 'admin' ? (
                                    <Shield className={`w-5 h-5 ${getRoleColor()}`} />
                                ) : userRole === 'restaurant' ? (
                                    <Store className={`w-5 h-5 ${getRoleColor()}`} />
                                ) : (
                                    <User className={`w-5 h-5 ${getRoleColor()}`} />
                                )}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {getUserDisplayName(user)}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge().color}`}>
                                        {getRoleBadge().label}
                                    </span>
                                </div>
                                {user?.email && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {user.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Menu Items - Only show for customers */}
                    {userRole === 'customer' && (
                        <div className="py-1">
                            {currentMenuItems.map(({ label, path, icon: Icon }, index) => (
                                <Link
                                    key={index}
                                    to={path}
                                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{label}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Logout */}
                    <div className={`${userRole === 'customer' ? 'border-t border-gray-200 dark:border-gray-700' : ''} py-1`}>
                        <button
                            onClick={() => {
                                onLogout();
                                setIsDropdownOpen(false);
                            }}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileButton;