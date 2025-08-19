import React, { useState } from 'react';

export const Tabs = ({ defaultValue, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return React.Children.map(children, child => {
    if (child.type.displayName === 'TabsList') {
      return React.cloneElement(child, { activeTab, setActiveTab });
    }
    if (child.type.displayName === 'TabsContent') {
      return child.props.value === activeTab ? child : null;
    }
    return child;
  });
};

export const TabsList = ({ children, activeTab, setActiveTab }) => (
  <div className="flex space-x-2 bg-gray-100 p-2 rounded-xl">
    {React.Children.map(children, child =>
      React.cloneElement(child, {
        isActive: child.props.value === activeTab,
        onClick: () => setActiveTab(child.props.value)
      })
    )}
  </div>
);
TabsList.displayName = 'TabsList';

export const TabsTrigger = ({ children, isActive, onClick }) => (
  <button
    className={`px-4 py-2 rounded-lg font-medium ${isActive ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
    onClick={onClick}
  >
    {children}
  </button>
);

export const TabsContent = ({ children }) => (
  <div className="mt-4">{children}</div>
);
TabsContent.displayName = 'TabsContent';