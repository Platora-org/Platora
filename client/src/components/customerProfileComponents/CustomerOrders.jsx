import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function OrderPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  // Dummy order data
  const [order] = useState({
    orderId: "ORD123456",
    status: "Processing",
    items: [
      { id: 1, name: "Cheese Burger", quantity: 2, price: 450 },
      { id: 2, name: "Veg Pizza", quantity: 1, price: 1200 },
      { id: 3, name: "Coke", quantity: 3, price: 150 },
    ],
  });

  const total = order.items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

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
          <ClipboardList className="w-10 md:w-16 h-10 md:h-16 text-emerald-500" />
          Order Details
        </motion.h2>

        {/* Order Info */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-between mb-6">
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Order ID:
            </span>
            <span className="text-gray-800 dark:text-white font-bold">
              {order.orderId}
            </span>
          </div>

          <div className="flex justify-between mb-6">
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Status:
            </span>
            <span className="text-emerald-500 font-bold">{order.status}</span>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Items
          </h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between bg-emerald-50 dark:bg-gray-700 rounded-xl p-4"
              >
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white">
                    {item.name}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <div className="text-gray-800 dark:text-white font-bold">
                  Rs. {item.price * item.quantity}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 text-lg font-bold text-gray-800 dark:text-white">
            <span>Total</span>
            <span>Rs. {total}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default OrderPage;
