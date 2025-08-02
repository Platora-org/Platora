import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: 'How do I create an account?',
    answer: 'Click the "Sign Up" button in the top right corner and follow the registration process.',
  },
  {
    question: 'I forgot my password. What should I do?',
    answer: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.',
  },
  {
    question: 'How do I update my profile information?',
    answer: 'Go to "My Account" settings and select "Edit Profile" to make changes.',
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          Frequently Asked Questions
        </motion.h2>

        <div className="space-y-1">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <button
                onClick={() => toggle(index)}
                className="w-full text-left px-6 py-4 flex justify-between items-center text-gray-800 dark:text-white font-medium hover:bg-emerald-100 dark:hover:bg-gray-800 transition"
              >
                {faq.question}
                <span className="ml-4 text-emerald-500 text-xl">
                  {openIndex === index ? '−' : '+'}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="px-6 overflow-hidden text-sm text-gray-600 dark:text-gray-400"
                  >
                    <div className="py-2">{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
