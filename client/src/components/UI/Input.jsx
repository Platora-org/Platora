import React from 'react';

export const Input = ({ value, onChange, placeholder, className = '', type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200 ${className}`}
  />
);