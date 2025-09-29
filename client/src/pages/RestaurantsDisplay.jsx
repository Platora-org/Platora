import { motion } from "framer-motion";
import { Utensils, ArrowRight } from "lucide-react"; // Added ArrowRight for the button
import { useState, useEffect } from "react";
import axiosInstance from '../utils/axiosInstance';
import axios from "axios";
import { Link } from "react-router-dom";

function RestaurantsDisplay() {

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
       try {
        const res = await axios.get("http://localhost:3000/restaurants/data/all");
        console.log(res.data)
        setRestaurants(res.data); // save data in state
      } catch (err) {
        setError(err.message); // save error if any
      } finally {
        setLoading(false); // always stop loading
      }
    }
    fetchRestaurants();
  },[]) 

  return (
    <section
      id="restaurants"
      className="bg-emerald-50/50 dark:bg-gray-900 transition-colors duration-300 py-16"
    >
      <div className="container mx-auto px-6">
        {/* Section Title */}
        <motion.h2
          className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white text-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Explore Our Restaurants
        </motion.h2>

        {/* Restaurants Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((restaurant) => (
            <motion.div
              key={restaurant.id}
              // Added `group` class to coordinate hover effects
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 group"
              whileHover={{ scale: 1.03, y: -5 }} // Enhanced hover animation
              whileTap={{ scale: 0.97 }}
            >
              {/* Restaurant Image */}
              <div className="relative w-full h-52 overflow-hidden">
                <img
                  src={restaurant.profile_image_url?restaurant.profile_image_url:"https://placehold.co/600x400/e0e0e0/757575?text=No+Image"}
                  alt={restaurant.restaurant_name}
                  // Added a subtle zoom effect on the image
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://placehold.co/600x400/e0e0e0/757575?text=No+Image";
                  }}
                />
                {/* --- NEW: Subtle overlay on hover --- */}
                {restaurant.cuisine_type ?( <>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                  {restaurant.cuisine_type}
                </div></>)
                :null}
              </div>
                

              {/* Restaurant Info */}
              {/* Added flex classes to position the button at the bottom */}
              <div className="p-5 flex flex-col flex-grow">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                  
                  {restaurant.restaurant_name}
                </h2>
                {/* Added `flex-grow` to push button down */}
                <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow">
                  Serving authentic {restaurant.cuisine_type} cuisine.
                </p>

                {/* --- NEW: "View Menu" Button --- */}
                <Link 
                  to = {`/restaurants/${restaurant.id}/menu`}
                  className="mt-4 w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all duration-300 transform hover:scale-105">
                    View Menu
                    <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RestaurantsDisplay;