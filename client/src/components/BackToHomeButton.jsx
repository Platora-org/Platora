import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const BackToHomeButton = () => (
  <Link
    to="/"
    className="fixed top-4 right-4 z-50 px-4 py-2 sm:px-5 sm:py-2.5 flex items-center gap-2
               bg-white/80 dark:bg-gray-800/40 backdrop-blur-md
               border border-gray-300 dark:border-gray-700/50 rounded-full
               text-gray-800 dark:text-gray-200 
               hover:scale-[1.02] hover:shadow-md hover:shadow-gray-400/30 dark:hover:shadow-gray-800/40
               transition-all duration-300"
  >
    <Home className="w-5 h-5 sm:w-5 sm:h-5" />
    <span className="hidden sm:inline font-medium tracking-wide">Home</span>
  </Link>
);

export default BackToHomeButton;
