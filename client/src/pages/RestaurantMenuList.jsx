import { motion } from "framer-motion";
import { ShoppingCart, UtensilsCrossed } from "lucide-react"; // Added an icon for the message
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";

function MenuPage() {
    const { id } = useParams(); // restaurant ID from URL
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ⭐ 1. Updated fetch logic to always keep `menuItems` as an array
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get(`/restaurants/menu/${id}`);
                // If the API returns a valid array of items, set it
                if (Array.isArray(res.data)) {
                    setMenuItems(res.data);
                } else {
                    // Otherwise, set an empty array to indicate no items
                    setMenuItems([]);
                }
            } catch (err) {
                console.error("Failed to fetch menu:", err);
                setError("Could not load the menu at this time. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, [id]);

    
    const lkrToCoins = (lkr) => {
      const exchangeRate = 50;
      return lkr/exchangeRate;
    }

    const addToCart = async (menuItemId) => {
        try {
            await axiosInstance.post("/api/carts/add", { menuItemId, quantity: 1 });
            window.dispatchEvent(new Event("cartUpdated"));
        } catch (err) {
            console.error("Failed to add item to cart:", err);
        }
    };

    if (loading) return <p className="text-center py-10 dark:text-gray-300">Loading menu...</p>;
    if (error) return <p className="text-center py-10 text-red-500">{error}</p>;

    // ⭐ 2. Return a single <section> and handle conditional logic inside
    return (
        <section
            id="menu"
            className="bg-emerald-50/50 dark:bg-gray-900 min-h-screen transition-colors duration-300 py-16"
        >
            <div className="container mx-auto px-6">
                <motion.h2
                    className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white text-center mb-12"
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    Menu
                </motion.h2>

                {/* Check if the menuItems array has items */}
                {menuItems.length > 0 ? (
                    // If YES, render the grid of menu items
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {menuItems.map((item) => (
                            <motion.div
                                key={item.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 group flex flex-col"
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <div className="relative w-full h-52 overflow-hidden">
                                    <img
                                        src={item.image_url ? `${import.meta.env.VITE_API_URL}${item.image_url}`: "https://placehold.co/600x400/e0e0e0/757575?text=No+Image"}
                                        alt={item.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://placehold.co/600x400/e0e0e0/757575?text=No+Image";
                                        }}
                                    />
                                </div>
                                <div className="p-5 flex flex-col flex-grow">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                        {item.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow mb-2">
                                        {item.description}
                                    </p>
                                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                                         {lkrToCoins(item.price)} Coins
                                    </p>
                                    <button
                                        onClick={() => addToCart(item.id)}
                                        className="mt-auto w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all duration-300 transform hover:scale-105"
                                    >
                                        Add to Cart
                                        <ShoppingCart size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    // If NO, render a user-friendly message
                    <motion.div
                        className="text-center py-20"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <UtensilsCrossed className="mx-auto text-emerald-400 dark:text-emerald-500 mb-4" size={48} />
                        <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                            Menu Coming Soon!
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            This restaurant hasn't added any items to their menu yet. Please check back later.
                        </p>
                    </motion.div>
                )}
            </div>
        </section>
    );
}

export default MenuPage;