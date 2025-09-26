import { motion } from "framer-motion";
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [orderType, setOrderType] = useState("pickup");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    const fetchCart = async () => {
      const res = await axiosInstance.get("/api/carts");
      console.log(res.data.items[0]);
      setCartItems(res.data.items);
    };
    fetchCart();
  }, []);

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
                      Rs. {item.price * item.quantity}
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
                <span>Rs. {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-4">
                <span>Delivery</span>
                <span>Rs. {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 dark:text-white text-lg mb-6">
                <span>Total</span>
                <span>Rs. {grandTotal.toFixed(2)}</span>
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

              {/* Checkout Button */}
              <Link
                to="/checkout"
                className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all duration-300 transform hover:scale-105"
              >
                Proceed to Checkout <ArrowRight size={18} />
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}

export default CartPage;
