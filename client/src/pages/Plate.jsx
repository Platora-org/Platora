import { motion } from "framer-motion";
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [orderType, setOrderType] = useState("pickup");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState(null);
  const { user } = useAuth();

  console.log("let's see what we get==", user);

  useEffect(() => {
    const fetchCart = async () => {
      const res = await axiosInstance.get("/api/carts");
      console.log(res.data.items[0]);
      setCartItems(res.data.items);
    };
    fetchCart();
  }, []);

  //inventory check
  const [checking, setChecking] = useState(false);

  const [canProceed, setCanProceed] = useState(false);

  const handleCheckout = async () => {
  setChecking(true);
  setError(null); // Clear previous errors

  try {
    // Step 1: Inventory check
    const inventoryRes = await axiosInstance.post("/api/orders/inventoryCheck");
    console.log("Inventory check response:", inventoryRes.data);
    
    const shortages = inventoryRes.data.shortages || [];
    if (shortages.length > 0) {
      setError(shortages);
      setCanProceed(false);
      return; // Exit early
    }
    
    console.log("All items are available!");

    // Step 2: Check wallet balance
    const walletCheckRes = await axiosInstance.post(
      "/api/wallet/checkSufficient",
      {
        coins: lkrToCoins(totalPrice),
      }
    );
    console.log("Wallet check:", walletCheckRes.data);

    // Step 3: Process wallet spending for each item
    for (const item of cartItems) {
      console.log("Processing item:", item);
      
      const walletSpendRes = await axiosInstance.post("/api/wallet/spend", {
        coins: lkrToCoins(item.price * item.quantity), // Fixed: multiply by quantity
        menu_item_id: item.menu_item_id,
        description: `Order ${item.name}`,
      });

      console.log("Wallet spend success:", walletSpendRes.data);
    }

    console.log("E-wallet balance is sufficient. Proceeding to checkout...");

    // Step 4: Complete the checkout
    const checkoutRes = await axiosInstance.post("/api/orders/checkout", {});
    console.log("Order placed:", checkoutRes.data);
    
    alert("Checkout successful!");
    setCartItems([]);
    setCanProceed(true);
    window.dispatchEvent(new Event("cartUpdated"));

  } catch (err) {
    console.error("Checkout error:", err);
    
    // Handle different error types
    const errorMessage = err?.response?.data?.message || 
                        err?.message || 
                        "Something went wrong during checkout. Please try again.";
    
    setError(errorMessage);
    setCanProceed(false);
  } finally {
    // ALWAYS reset checking state
    setChecking(false);
  }
};

  // Remove item
  const removeItem = async (id) => {
    try {
      await axiosInstance.delete(`/api/carts/${id}`);
      setCartItems(cartItems.filter((item) => item.id !== id));
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  // Increase quantity
  const increaseQty = async (id, currentQty) => {
    try {
      const res = await axiosInstance.put("/api/carts/update", {
        cartItemId: id,
        quantity: currentQty + 1,
      });
      setCartItems(
        cartItems.map((item) =>
          item.id === id ? { ...item, quantity: res.data.quantity } : item
        )
      );
    } catch (error) {
      console.error("Failed to increase qty:", error);
    }
  };

  // Decrease quantity
  const decreaseQty = async (id, currentQty) => {
    if (currentQty > 1) {
      try {
        const res = await axiosInstance.put("/api/carts/update", {
          cartItemId: id,
          quantity: currentQty - 1,
        });
        setCartItems(
          cartItems.map((item) =>
            item.id === id ? { ...item, quantity: res.data.quantity } : item
          )
        );
      } catch (error) {
        console.error("Failed to decrease qty:", error);
      }
    } else {
      removeItem(id);
    }
  };

  // Calculate totals
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Delivery fee only if delivery selected
  const deliveryFee = orderType === "delivery" ? 200 : 0;
  const grandTotal = totalPrice + deliveryFee;

  const navigate = useNavigate();
  const handleBack = () => {
    navigate(-1);
  };

  const lkrToCoins = (lkr) => {
    const exchangeRate = 50;
    return lkr / exchangeRate;
  };

  return (
    <section className="bg-emerald-50/50 dark:bg-gray-900 min-h-screen py-16">
      <div className="container mx-auto px-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold mb-6 text-xl"
        >
          <ArrowLeft className="mr-2" size={30} /> Back
        </button>

        {/* Title */}
        <motion.h2
          className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white text-center mb-12 flex items-center justify-center gap-5"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <ShoppingCart className="w-10 md:w-16 h-10 md:h-16 text-emerald-500" />
          Your Cart
        </motion.h2>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 shadow-lg transition duration-300">
            <div className="flex items-start">
              {/* Alert Icon */}
              <svg
                className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <div className="text-red-700 dark:text-red-400 flex-1">
                {Array.isArray(error) ? (
                  <>
                    {/* Structured List for Shortages (fixes the newline issue) */}
                    <p className="font-extrabold text-red-800 dark:text-red-200 mb-2 text-lg">
                      Shortages Detected
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-2 text-sm">
                      {error.map((s, i) => (
                        <li key={i} className="text-red-700 dark:text-red-300">
                          <span className="font-semibold text-red-800 dark:text-white">
                            {s.menu_name}
                          </span>
                          : ordered {s.ordered}, but we can only make{" "}
                          {s.canMake}.
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-red-600 dark:text-red-400 font-medium border-t border-red-700/30 pt-3">
                      Please adjust your cart items and re-check availability.
                    </p>
                  </>
                ) : (
                  // Simple text display for general API errors
                  <p>{error}</p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-500 hover:text-red-700 flex-shrink-0 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-300">
            Your cart is empty.{" "}
            <Link
              to="/restaurants"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Browse restaurants
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 flex items-center gap-4"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Image */}
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-xl"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/100x100/e0e0e0/757575?text=No+Image";
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lkrToCoins(item.price * item.quantity)} Coins
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => decreaseQty(item.id, item.quantity)}
                        className="bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-600"
                      >
                        -
                      </button>
                      <span className="px-3 text-gray-800 dark:text-white font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => increaseQty(item.id, item.quantity)}
                        className="bg-emerald-500 text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-600"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                Order Summary
              </h3>
              <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-2">
                <span>Subtotal</span>
                <span>{lkrToCoins(totalPrice)} Coins</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-4">
                <span>Delivery</span>
                <span>{lkrToCoins(deliveryFee)} Coins</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 dark:text-white text-lg mb-6">
                <span>Total</span>
                <span>{lkrToCoins(grandTotal)} Coins</span>
              </div>

              {/* Delivery or Pickup Option */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Choose Order Type
                </h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="orderType"
                      value="delivery"
                      checked={orderType === "delivery"}
                      onChange={(e) => setOrderType(e.target.value)}
                      className="text-emerald-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      Delivery
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="orderType"
                      value="pickup"
                      checked={orderType === "pickup"}
                      onChange={(e) => setOrderType(e.target.value)}
                      className="text-emerald-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      Pickup
                    </span>
                  </label>
                </div>
              </div>

              {/* Conditional Form if Delivery */}
              {orderType === "delivery" && (
                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={fullName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^A-Za-z ]/g, "");
                      setFullName(value);
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    required
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setPhoneNumber(value);
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <textarea
                    placeholder="Delivery Address"
                    rows="3"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  ></textarea>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={checking}
                className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-3xl hover:bg-emerald-700 transition-all"
              >
                {checking ? "Processing…" : "Checkout"}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}

export default CartPage;
