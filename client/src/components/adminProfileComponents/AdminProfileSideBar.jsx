import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from "react";

const AdminProfileSideBar = ({ onLogout, loggedUser }) => {
  const location = useLocation();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollStateRef = useRef(false);

  const getUserDisplayName = () => {
    if (!loggedUser) return 'User';

    // If first or last name exists, return both (trim avoids trailing spaces)
    if (loggedUser.firstName || loggedUser.lastName) {
      return `${loggedUser.firstName || ''} ${loggedUser.lastName || ''}`.trim();
    }

    // Fallback: use email prefix
    if (loggedUser.email) {
      return loggedUser.email.split('@')[0];
    }

    return 'User';
  };

  const getUserInitials = () => {
    if (!loggedUser) return 'U';

    const firstInitial = loggedUser.firstName?.[0] || '';
    const lastInitial = loggedUser.lastName?.[0] || '';

    // Use both initials if available
    if (firstInitial || lastInitial) {
      return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    // Fallback: first 2 chars of email prefix
    if (loggedUser.email) {
      return loggedUser.email.split('@')[0].slice(0, 2).toUpperCase();
    }

    return 'U';
  };

  useEffect(() => {
    const accountPaths = ['/admin/details', '/admin/security'];
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
      href: "/admin/",
      icon: (
        <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      type: "link",
      label: "Delivery Agents",
      href: "/admin/deliveryagentmanage",
      icon: (
        <svg className="w-5 h-5 opacity-75" stroke="currentColor"  viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M4.25 3.25C3.00736 3.25 2 4.25736 2 5.5V16C2 17.2426 3.00736 18.25 4.25 18.25H4.30197C4.56712 19.6729 5.81527 20.75 7.315 20.75C8.81473 20.75 10.0629 19.6729 10.328 18.25H14.052C14.3171 19.6729 15.5653 20.75 17.065 20.75C18.5647 20.75 19.8129 19.6729 20.078 18.25H22C22.4142 18.25 22.75 17.9142 22.75 17.5C22.75 17.0858 22.4142 16.75 22 16.75V12.4047C22 11.9553 21.8655 11.5163 21.6137 11.1441L19.0674 7.37945C18.6489 6.76072 17.9506 6.39003 17.2037 6.39003H15.75V5.5C15.75 4.25736 14.7426 3.25 13.5 3.25H4.25ZM7.315 14.62C5.94831 14.62 4.79055 15.5145 4.39523 16.75H4.25C3.83579 16.75 3.5 16.4142 3.5 16V5.5C3.5 5.08579 3.83579 4.75 4.25 4.75H13.5C13.9142 4.75 14.25 5.08579 14.25 5.5V16.4706C14.2107 16.5615 14.1757 16.6547 14.1452 16.75H10.2348C9.83945 15.5145 8.68169 14.62 7.315 14.62ZM17.065 14.62C16.5944 14.62 16.1485 14.7261 15.75 14.9156V12.695L20.5 12.695V16.75H19.9848C19.5895 15.5145 18.4317 14.62 17.065 14.62ZM19.8373 11.195L15.75 11.195V7.89003H17.2037C17.4527 7.89003 17.6854 8.01359 17.8249 8.21983L19.8373 11.195ZM15.5 17.685C15.5 16.8207 16.2007 16.12 17.065 16.12C17.9293 16.12 18.63 16.8207 18.63 17.685C18.63 18.5493 17.9293 19.25 17.065 19.25C16.2007 19.25 15.5 18.5493 15.5 17.685ZM5.75 17.685C5.75 16.8207 6.45067 16.12 7.315 16.12C8.17933 16.12 8.88 16.8207 8.88 17.685C8.88 18.5493 8.17933 19.25 7.315 19.25C6.45067 19.25 5.75 18.5493 5.75 17.685Z" fill="#323544" />
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
        { label: "Admin Details", href: "/admin/details" },
        { label: "Security Settings", href: "/admin/security" },
      ],
    },
  ];

  const isActiveLink = (href) => {
    if (href === '/admin/') {
      return location.pathname === '/admin/' || location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Profile Header */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${isScrolled ? 'pt-20' : 'pt-4'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">{getUserInitials()}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getUserDisplayName()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
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

export default AdminProfileSideBar;
