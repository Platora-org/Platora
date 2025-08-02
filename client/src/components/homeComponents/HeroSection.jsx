import React from 'react';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Typewriter } from 'react-simple-typewriter';

const HeroSection = () => {
  const handleScroll = () => {
    const section = document.getElementById('restaurants');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-emerald-50/50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Animated Text Section */}
          <motion.div
            className="text-center md:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800 dark:text-white leading-tight mb-4">
              Your Culinary World, <br />
              <span className="text-emerald-500">
                <Typewriter
                  words={['All in One Place.']}
                  loop={0}
                  cursor
                  cursorStyle="|"
                  typeSpeed={70}
                  deleteSpeed={40}
                  delaySpeed={1000}
                />
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto md:mx-0">
              Discover, order, and pay with ultimate convenience. The future of food court dining is here, featuring a seamless e-wallet for all your cravings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              {/* Explore Restaurants with scroll */}
              <motion.button
                onClick={handleScroll}
                className="bg-emerald-500 text-white font-bold px-8 py-4 rounded-full hover:bg-emerald-600 transition duration-300 transform hover:scale-105 shadow-xl shadow-emerald-500/30 text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                Explore Restaurants
              </motion.button>

              {/* How it Works */}
              <motion.button
                className="bg-white dark:bg-gray-900 text-emerald-500 font-bold px-8 py-4 rounded-full hover:bg-emerald-100/50 dark:hover:bg-gray-800 transition duration-300 border-2 border-emerald-500 text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                How it Works
              </motion.button>
            </div>
          </motion.div>

          {/* Animated Image Section */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
              alt="Delicious food platter"
              className="rounded-3xl shadow-2xl w-full h-auto object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x500/e0e0e0/757575?text=Image+Not+Found';
              }}
            />
            <div className="absolute -bottom-6 -right-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg flex items-center space-x-3">
              <Wallet className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="font-bold text-gray-800 dark:text-white">E-Wallet Ready</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tap to pay instantly</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
