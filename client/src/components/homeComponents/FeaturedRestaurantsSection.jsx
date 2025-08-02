import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const FeaturedRestaurantsSection = ({ restaurants }) => (
  <section className="py-20 bg-emerald-50/50 dark:bg-gray-900 transition-colors duration-300">
    <div className="container mx-auto px-6">
      <motion.h2
        className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        Featured Restaurants
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {restaurants.map((resto, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.03 }}
            className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg dark:shadow-md hover:shadow-2xl dark:hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
          >
            <motion.img
              src={resto.image}
              alt={resto.name}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x400/2d2d2d/cccccc?text=Restaurant';
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{resto.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-3">{resto.cuisine}</p>
              <div className="flex items-center">
                <Star className="w-5 h-5 text-amber-400 fill-current" />
                <span className="text-gray-700 dark:text-gray-300 font-semibold ml-1">{resto.rating}</span>
                <span className="text-gray-500 dark:text-gray-500 ml-1.5">(100+ ratings)</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturedRestaurantsSection;
