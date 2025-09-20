// src/components/LowStockPanel.jsx
import React from "react";
import { Bell, AlertTriangle, Package } from "lucide-react";
import { Card, SectionHeader, Button } from "./MenuUI";

const LowStockPanel = ({ lowStock }) => {
  if (!lowStock || lowStock.length === 0) {
    return (
      <Card className="p-6">
        <SectionHeader icon={Bell} title="Notifications" subtitle="You're all caught up." />
        <p className="text-gray-600 dark:text-gray-400">No low-stock alerts at the moment.</p>
      </Card>
    );
  }
  return (
    <Card className="p-6">
      <SectionHeader icon={AlertTriangle} title="Low Stock Alerts" subtitle="Items below their reorder levels." />
      <div className="space-y-3">
        {lowStock.map((i) => (
          <div key={i.id} className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
            <div>
              <div className="font-semibold text-amber-800 dark:text-amber-200">{i.name}</div>
              <div className="text-sm text-amber-700/90 dark:text-amber-300/80">Qty: {i.quantity} {i.unit} • Reorder at {i.reorder_level} {i.unit}</div>
            </div>
            <Button variant="secondary" className="border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100/50">
              <Package className="w-4 h-4" /> Restock
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LowStockPanel;