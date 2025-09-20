import { useAuth } from "../../utils/AuthContext";
import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from "react";

const RestaurantProfileSideBar = ({ onLogout, loggedUser }) => {

    const location = useLocation();
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollStateRef = useRef(false);

    useEffect(() => {
        const accountPaths = ['/restaurant/details', '/restaurant/security'];
        if (accountPaths.some(path => location.pathname.includes(path))) {
            setIsAccountOpen(true);
        } else {
            setIsAccountOpen(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollThreshold = 50;
            const shouldBeScrolled = window.scrollY > scrollThreshold;
            if (scrollStateRef.current !== shouldBeScrolled) {
                scrollStateRef.current = shouldBeScrolled;
                setIsScrolled(shouldBeScrolled);
            }
        };

        const initialScrolled = window.scrollY > 50;
        scrollStateRef.current = initialScrolled;
        setIsScrolled(initialScrolled);

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const sidebarItems = [
        {
            type: "link",
            label: "Dashboard",
            href: "/restaurant/",
            icon: (
                <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            type: "dropdown",
            label: "Account",
            icon: (
                <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            children: [
                { label: "Account Details", href: "/restaurant/details" },
                { label: "Security Settings", href: "/restaurant/security" },
            ],
        },
            {
      type: "link",
      label: "Menu",
      href: "/restaurant/menu",
      icon: (
        <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <g strokeLinecap="round">
            <line x1="8" y1="4" x2="8" y2="20" />
            <line x1="6" y1="4" x2="6" y2="7" />
            <line x1="8" y1="4" x2="8" y2="7" />
            <line x1="10" y1="4" x2="10" y2="7" />
          </g>

          <g strokeLinecap="round">
            <line x1="16" y1="8" x2="16" y2="20" />
            <ellipse cx="16" cy="5.5" rx="2" ry="2.5" />
          </g>
        </svg>
      ),
    },
        {
            type: "link",
            label: "Orders",
            href: "/restaurant/orders",
            icon: (
                <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <g strokeLinecap="round">
                        <line x1="8" y1="4" x2="8" y2="20" />
                        <line x1="6" y1="4" x2="6" y2="7" />
                        <line x1="8" y1="4" x2="8" y2="7" />
                        <line x1="10" y1="4" x2="10" y2="7" />
                    </g>

                    <g strokeLinecap="round">
                        <line x1="16" y1="8" x2="16" y2="20" />
                        <ellipse cx="16" cy="5.5" rx="2" ry="2.5" />
                    </g>
                </svg>
            ),
        },
        {
            type: "link",
            label: "Wallet",
            href: "/restaurant/wallet",
            icon: (
                <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12h-6a1 1 0 000 2h6a1 1 0 000-2z" />
                </svg>
            ),
        },

    ];

    const isActiveLink = (href) => {
        if (href === '/restaurant/') {
            return location.pathname === '/restaurant/' || location.pathname === '/restaurant';
        }
        return location.pathname.startsWith(href);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-300">
            {/* Profile Header */}
            <div className={`p-4 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${isScrolled ? 'pt-20' : 'pt-4'}`}>
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{loggedUser?.restaurantName
                            ? loggedUser.restaurantName
                                .split(' ')
                                .map(word => word[0])
                                .join('')
                                .toUpperCase()
                            : loggedUser.email?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{loggedUser?.restaurantName || loggedUser.email?.split('@')[0] }</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Restaurant</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {sidebarItems.map((item, idx) => {
                        if (item.type === "link") {
                            const isActive = isActiveLink(item.href);
                            return (
                                <li key={idx}>
                                    <Link
                                        to={item.href}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            : 'text-gray-700 hover:bg-emerald-100/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        }

                        if (item.type === "dropdown") {
                            const hasActiveChild = item.children.some(child => isActiveLink(child.href));
                            return (
                                <li key={idx}>
                                    <details open={isAccountOpen} onToggle={(e) => setIsAccountOpen(e.target.open)} className="group">
                                        <summary className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors list-none [&::-webkit-details-marker]:hidden ${hasActiveChild
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            : 'text-gray-700 hover:bg-emerald-100/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                {item.icon}
                                                {item.label}
                                            </div>
                                            <svg className={`w-4 h-4 transition-transform duration-200 ${isAccountOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </summary>
                                        <ul className="mt-2 ml-8 space-y-1">
                                            {item.children.map((child, cIdx) => {
                                                const isChildActive = isActiveLink(child.href);
                                                return (
                                                    <li key={cIdx}>
                                                        <Link
                                                            to={child.href}
                                                            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${isChildActive
                                                                ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                : 'text-gray-600 hover:bg-emerald-100/50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                                                                }`}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </details>
                                </li>
                            );
                        }
                        return null;
                    })}
                </ul>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default RestaurantProfileSideBar;
