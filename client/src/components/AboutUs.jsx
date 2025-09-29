import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Store, Users } from 'lucide-react';

const AboutUs = () => {
  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <section id="about-us" className="bg-white dark:bg-gray-800 transition-colors duration-300">
      <div className="container mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          
          {/* Image & Visuals Section (FIXED) */}
          <motion.div
            className="relative h-96 md:h-[30rem]"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* FIX: The bordered image is now first, so it's in the background. */}
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop"
              alt="People dining happily"
              className="absolute bottom-0 right-0 w-2/3 h-2/3 rounded-3xl shadow-2xl object-cover border-8 border-white dark:border-gray-800 z-40"
            />
            {/* This image will now render on top of the one above. */}
            <img
              src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1887&auto=format=fit=crop"
              alt="Chef preparing a dish"
              className="absolute top-0 left-0 w-2/3 h-2/3 rounded-3xl shadow-2xl object-cover"
            />
            <div className="absolute -top-6 -right-6 bg-emerald-500/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg flex items-center space-x-3 z-20">
              <Heart className="w-8 h-8 text-white" />
              <div>
                <p className="font-bold text-white">Made with Passion</p>
                <p className="text-sm text-emerald-100">For food lovers</p>
              </div>
            </div>
          </motion.div>

          {/* Content Section */}
          <motion.div
            className="text-center md:text-left"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <motion.h2
              className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white leading-tight mb-6"
              variants={itemVariants}
            >
              A New Recipe for <br />
              <span className="text-emerald-500">Dining Together.</span>
            </motion.h2>
            
            <motion.p className="text-lg text-gray-600 dark:text-gray-400 mb-6" variants={itemVariants}>
              We saw food courts as places of vibrant potential, often held back by old ways of thinking. Juggling cash, waiting in separate lines, and the disconnect between diners and chefs, we knew there was a better way.
            </motion.p>
            
            <motion.p className="text-lg text-gray-600 dark:text-gray-400 mb-8" variants={itemVariants}>
              Our mission is to blend technology with taste, creating a single, seamless ecosystem. We empower local food entrepreneurs with a fair, commission-based model and delight customers with the effortless joy of discovering, ordering, and paying-all from one digital wallet.
            </motion.p>

            <motion.div className="flex flex-col sm:flex-row gap-6 justify-center md:justify-start" variants={itemVariants}>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-full">
                  <Store className="w-6 h-6 text-emerald-500" />
                </div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Empowering Vendors</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-full">
                  <Users className="w-6 h-6 text-emerald-500" />
                </div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Connecting Community</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;