import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";

function MenuPage() {
  const { id } = useParams(); // restaurant ID from URL
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axiosInstance.get(`/restaurants/menu/${id}`);
        setMenuItems(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id]);

  if (loading) return <p className="text-center py-10">Loading menu...</p>;
  if (error) return <p className="text-center text-red-500 py-10">Error: {error}</p>;

  return (
    <section
      id="menu"
      className="bg-emerald-50/50 dark:bg-gray-900 transition-colors duration-300 py-16"
    >
      <div className="container mx-auto px-6">
        {/* Page Title */}
        <motion.h2
          className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white text-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Menu
        </motion.h2>

        {/* Menu Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map((item) => (
            <motion.div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 group flex flex-col"
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Item Image */}
              <div className="relative w-full h-52 overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://placehold.co/600x400/e0e0e0/757575?text=No+Image";
                  }}
                />
              </div>

              {/* Item Info */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow mb-2">
                  {item.description}
                </p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                  ${item.price}
                </p>

                {/* Add to Cart Button */}
                <button className="mt-auto w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all duration-300 transform hover:scale-105">
                  Add to Cart
                  <ShoppingCart size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MenuPage;
