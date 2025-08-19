import React from 'react';

export const Button = ({ children, onClick, className = '', variant = 'default', type = 'button' }) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-colors duration-200 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};