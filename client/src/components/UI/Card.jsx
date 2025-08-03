// components/ui/card.jsx
import React from 'react';

export const Card = ({ className = '', children }) => (
  <div className={`shadow-md rounded-2xl border border-gray-200 bg-white ${className}`}>
    {children}
  </div>
);

export const CardContent = ({ className = '', children }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);