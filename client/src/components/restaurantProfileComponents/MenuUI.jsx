// src/ui/index.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export const Card = ({ children, className }) => (
  <div className={`rounded-2xl shadow-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur transition-colors ${className || ""}`}>
    {children}
  </div>
);

export const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-6">
    <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h2 className="text-xl md:text-2xl font-extrabold text-gray-800 dark:text-white">{title}</h2>
      {subtitle && <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

export const Toolbar = ({ children }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
    {children}
  </div>
);

export const NotificationBadge = ({ count }) => {
  if (!count || count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="absolute -top-1.5 -right-1.5 flex items-center justify-center 
                 min-w-[18px] h-[18px] px-1.5 text-[11px] font-semibold
                 text-white bg-red-600 rounded-full shadow-md"
    >
      {displayCount}
    </motion.span>
  );
};


export const Button = ({ variant = "primary", className, children, ...props }) => {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  let variantClass = "";
  if (variant === "primary") {
    variantClass = "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500";
  } else if (variant === "secondary") {
    variantClass = "bg-white dark:bg-gray-900 text-emerald-600 border border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-gray-800";
  } else if (variant === "danger") {
    variantClass = "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400";
  } else if (variant === "ghost") {
    variantClass = "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-800/60";
  }
  
  return (
    <button className={`${base} ${variantClass} ${className || ""}`} {...props}>
      {children}
    </button>
  );
};

export const Input = (props) => (
  <input {...props} className={`w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 ${props.className || ""}`} />
);

export const Select = ({ children, className, ...props }) => (
  <select {...props} className={`w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 ${className || ""}`}>
    {children}
  </select>
);

export const Modal = ({ open, onClose, title, children, footer }) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} className="relative w-[95%] md:w-[720px] rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div>{children}</div>
          {footer && <div className="mt-6">{footer}</div>}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const Th = ({ children, className }) => (
  <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 ${className || ""}`}>
    {children}
  </th>
);

export const Td = ({ children, className }) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-100 ${className || ""}`}>
    {children}
  </td>
);