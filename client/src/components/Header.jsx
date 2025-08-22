import React, { useEffect, useState } from 'react';
import { Menu, X, Utensils, User, Store, Shield, Home } from 'lucide-react';
import { Link } from "react-router-dom";
import ProfileButton from "./ProfileButton";
import { useAuth } from "../utils/AuthContext";

// Navigation configuration for different user roles
const navigationConfig = {
  unregistered: {
    nav: [
      { label: "Home", path: "/"},
      { label: "Restaurants", path: "/restaurants" },
      { label: "About Us", path: "/about" },
      { label: "Contact", path: "/contact" },
    ],
    cta: {
      primary: { label: "Sign Up", path: "/register", style: "button" },
      secondary: { label: "Log In", path: "/login", style: "link" }
    }
  },
  customer: {
    nav: [
      { label: "Home", path: "/" },
      { label: "Restaurants", path: "/restaurants" },
      { label: "Reservations", path: "/customerprofile/reservation" },
      { label: "My Orders", path: "/customerprofile/orders" },
      { label: "About Us", path: "/about" },
     

    ],
    showProfile: true
  },
  restaurant: {
    showProfile: true
  },
  admin: {
    showProfile: true
  }
};

const Header = ({ isMenuOpen, setIsMenuOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const { logout, user } = useAuth();
  
  // Determine user role - customize this logic based on your user object structure
  const getUserRole = () => {
    if (!user) return 'unregistered';
    
    // Adjust these conditions based on your user object structure
    if (user.role === 'admin' || user.isAdmin) return 'admin';
    if (user.role === 'restaurant' || user.userType === 'restaurant') return 'restaurant';
    if (user.role === 'customer' || user.userType === 'customer') return 'customer';
    
    // Fallback to customer if user exists but role is unclear
    return 'customer';
  };

  const currentUserRole = getUserRole();
  const currentConfig = navigationConfig[currentUserRole];

  console.log("User from AuthContext:", user);
  console.log("Current user role:", currentUserRole);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Render navigation items
  const renderNavItems = (isMobile = false) => {
    return currentConfig.nav.map(({ label, path, icon: Icon }, i) => (
      <Link
        key={i}
        to={path}
        className={`${
          isMobile
            ? "text-gray-700 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition font-medium flex items-center space-x-2"
            : "relative text-gray-700 dark:text-gray-300 font-medium transition duration-300 hover:text-emerald-500 dark:hover:text-emerald-400 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[2px] after:bg-emerald-500 dark:after:bg-emerald-400 hover:after:w-full after:transition-all after:duration-300 flex items-center space-x-1"
        }`}
        onClick={isMobile ? () => setIsMenuOpen(false) : undefined}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </Link>
    ));
  };

  // Render CTA buttons for unregistered users
  const renderCTA = (isMobile = false) => {
    if (currentUserRole !== 'unregistered') return null;

    const { primary, secondary } = currentConfig.cta;
    
    if (isMobile) {
      return (
        <>
          <Link
            to={secondary.path}
            className="text-gray-700 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
            onClick={() => setIsMenuOpen(false)}
          >
            {secondary.label}
          </Link>
          <Link to={primary.path} onClick={() => setIsMenuOpen(false)}>
            <button className="w-full px-5 py-2 font-semibold rounded-full bg-emerald-500 text-white border border-transparent hover:border-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-600 transition duration-300 shadow-sm">
              {primary.label}
            </button>
          </Link>
        </>
      );
    }

    return (
      <div className="hidden md:flex items-center space-x-4">
        <Link
          to={secondary.path}
          className="text-gray-700 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition duration-300"
        >
          {secondary.label}
        </Link>
        <Link to={primary.path}>
          <button className="px-5 py-2 font-semibold rounded-full bg-emerald-500 text-white border border-transparent hover:border-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-600 transition duration-300 shadow-sm">
            {primary.label}
          </button>
        </Link>
      </div>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-gray-800/80 shadow-md py-2'
          : 'bg-white/80 dark:bg-gray-800/80 shadow-none py-4'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center transition-all duration-300">
        {/* Logo */}
        <Link 
          to={currentUserRole === 'admin' ? '/admin' : currentUserRole === 'restaurant' ? '/restaurant' : '/'} 
          className="flex items-center space-x-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-wide select-none"
        >
          <Utensils className="w-6 h-6 mr-3" />
          <span>Platora</span>
        </Link>

        {/* Desktop Nav - Only show for unregistered and customer users */}
        {(currentUserRole === 'unregistered' || currentUserRole === 'customer') && (
          <nav className="hidden md:flex items-center space-x-8">
            {renderNavItems()}
          </nav>
        )}

        {/* Desktop CTA or Profile */}
        {currentConfig.showProfile ? (
          <ProfileButton scrolled={scrolled} onLogout={logout} userRole={currentUserRole} />
        ) : (
          renderCTA()
        )}

        {/* Mobile Menu Button - Only show for unregistered and customer users */}
        {(currentUserRole === 'unregistered' || currentUserRole === 'customer') && (
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Dropdown Menu - Only show for unregistered and customer users */}
      {(currentUserRole === 'unregistered' || currentUserRole === 'customer') && (
        <div
          className={`md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
            isMenuOpen ? 'max-h-[500px] opacity-100 py-4 px-6 mt-2' : 'max-h-0 opacity-0 py-0 px-6'
          }`}
        >
          <nav className="flex flex-col space-y-4">
            {renderNavItems(true)}
            {renderCTA(true)}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;