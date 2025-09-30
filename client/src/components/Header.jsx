import React, { useEffect, useState } from 'react';
import { Menu, X, Utensils, ShoppingCart, Coins, Wallet } from 'lucide-react';
import { Link } from "react-router-dom";
import ProfileButton from "./ProfileButton";
import { useAuth } from "../utils/AuthContext";
import axiosInstance from "../utils/axiosInstance"; 

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
      { label: "Reservations", path: "/reservations" },
      { label: "My Orders", path: "/customerprofile/orders" },
      { label: "About Us", path: "/about" },
    ],
    showProfile: true
  },
  restaurant: { showProfile: true },
  admin: { showProfile: true }
};

const Header = ({ isMenuOpen, setIsMenuOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [cartItems, setCartItems] = useState(0);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const { logout, user } = useAuth();

  // Determine user role
  const getUserRole = () => {
    if (!user) return 'unregistered';
    if (user.role === 'admin' || user.isAdmin) return 'admin';
    if (user.role === 'restaurant' || user.userType === 'restaurant') return 'restaurant';
    if (user.role === 'customer' || user.userType === 'customer') return 'customer';
    return 'customer';
  };

  const currentUserRole = getUserRole();
  const currentConfig = navigationConfig[currentUserRole];

  // Fetch cart count from backend
  const fetchCartCount = async () => {
    try {
      const res = await axiosInstance.get("/api/carts/count");
      setCartItems(res.data.count || res.data.totalItems || 0);
    } catch (err) {
      console.error("Failed to fetch cart count:", err);
    }
  };

  // Fetch wallet balance from backend
  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const res = await axiosInstance.get("/api/wallet");
      
      // Handle different response structures
      if (res.data.success) {
        setWalletBalance(res.data.data?.balance_coins || res.data.wallet?.balance_coins || 0);
      } else {
        setWalletBalance(res.data.balance_coins || 0);
      }
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    if (getUserRole() === "customer") {
      // Initial fetch for cart and wallet
      fetchCartCount();
      fetchWalletBalance();

      // Listen for cart updates
      const handleCartUpdate = () => fetchCartCount();
      window.addEventListener("cartUpdated", handleCartUpdate);

      // Listen for wallet updates (you can dispatch this event after purchases/spending)
      const handleWalletUpdate = () => fetchWalletBalance();
      window.addEventListener("walletUpdated", handleWalletUpdate);

      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener("cartUpdated", handleCartUpdate);
        window.removeEventListener("walletUpdated", handleWalletUpdate);
      };
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [user]);

  // Render navigation items
  const renderNavItems = (isMobile = false) => {
    return currentConfig.nav?.map(({ label, path, icon: Icon }, i) => (
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

        {/* Desktop Nav */}
        {(currentUserRole === 'unregistered' || currentUserRole === 'customer') && (
          <nav className="hidden md:flex items-center space-x-8">
            {renderNavItems()}
          </nav>
        )}

        <div className="flex items-center space-x-4">
          {/* Wallet Balance - Only for customers */}
          {currentUserRole === 'customer' && (
            <Link 
              to="/customerprofile/wallet" 
              className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
              title="View Wallet"
            >
              <Coins className="w-5 h-5" />
              {loadingWallet ? (
                <span className="text-sm font-medium">...</span>
              ) : (
                <span className="text-sm font-semibold">
                  {walletBalance !== null ? walletBalance.toLocaleString() : '0'}
                </span>
              )}
            </Link>
          )}

          {/* Shopping Cart Icon */}
          {(currentUserRole === 'unregistered' || currentUserRole === 'customer') && (
            <Link 
              to="/Plate" 
              className="relative text-gray-700 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold">
                  {cartItems}
                </span>
              )}
            </Link>
          )}

          {/* Desktop CTA or Profile */}
          {currentConfig.showProfile ? (
            <ProfileButton scrolled={scrolled} onLogout={logout} userRole={currentUserRole} />
          ) : (
            renderCTA()
          )}
        </div>

        {/* Mobile Menu Button */}
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

      {/* Mobile Dropdown Menu */}
      {(currentUserRole === 'unregistered' || currentUserRole === 'customer') && (
        <div
          className={`md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
            isMenuOpen ? 'max-h-[600px] opacity-100 py-4 px-6 mt-2' : 'max-h-0 opacity-0 py-0 px-6'
          }`}
        >
          <nav className="flex flex-col space-y-4">
            {renderNavItems(true)}

            {/* Wallet Balance in Mobile Menu */}
            {currentUserRole === 'customer' && (
              <Link 
                to="/customerprofile/wallet" 
                className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5" />
                  <span className="font-medium">Wallet Balance</span>
                </div>
                {loadingWallet ? (
                  <span className="text-sm">...</span>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Coins className="w-4 h-4" />
                    <span className="font-bold">
                      {walletBalance !== null ? walletBalance.toLocaleString() : '0'}
                    </span>
                  </div>
                )}
              </Link>
            )}

            {/* Shopping Cart Icon in Mobile Menu */}
            <Link 
              to="/Plate" 
              className="flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Cart</span>
              </div>
              {cartItems > 0 && (
                <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  {cartItems}
                </span>
              )}
            </Link>

            {renderCTA(true)}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;