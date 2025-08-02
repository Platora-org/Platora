import React from 'react';
import { motion } from 'framer-motion';

const FeaturesSection = ({ features }) => (
  <section className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300">
    <div className="container mx-auto px-6 text-center">
      <motion.h2
        className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        viewport={{ once: true }}
      >
        Why You'll Love It
      </motion.h2>

      <motion.p
        className="text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: -10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
      >
        Our system is designed to provide a fresh, elegant, and incredibly convenient dining experience.
      </motion.p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
            viewport={{ once: true }}
            className="relative group rounded-2xl p-8 bg-gray-50 dark:bg-gray-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-transparent hover:border-emerald-500"
          >
            <div className="mb-4 inline-block p-4 bg-emerald-100 dark:bg-emerald-900 rounded-full transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
