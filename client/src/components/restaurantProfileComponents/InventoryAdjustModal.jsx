// src/components/InventoryAdjustModal.jsx
import React, { useState, useEffect } from "react";
import { Modal, Input, Button } from "./MenuUI";
import { Save } from "lucide-react";

const InventoryAdjustModal = ({ open, onClose, item, onSubmit }) => {
  const [form, setForm] = useState({ direction: "in", quantity: "", reason: "" });

  useEffect(() => {
    if (item) {
      setForm({ direction: "in", quantity: "", reason: "" }); // reset when new item opens
    }
  }, [item]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) return; // basic validation
    onSubmit({ ...form, quantity: qty });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Adjust Stock: ${item?.name || ""}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        {/* Direction (in/out) */}
        <div className="col-span-6">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Direction
          </label>
          <select
            value={form.direction}
            onChange={(e) => set("direction", e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-2 py-2 bg-white dark:bg-gray-900"
          >
            <option value="in">Restock (Add)</option>
            <option value="out">Consume (Subtract)</option>
          </select>
        </div>

        {/* Quantity (with unit shown) */}
        <div className="col-span-6">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Quantity {item?.unit ? `(in ${item.unit})` : ""}
          </label>
          <Input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)} // keep as string
          />
        </div>

        {/* Reason */}
        <div className="col-span-12">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Reason (optional)
          </label>
          <Input
            placeholder="e.g. supplier restock, wastage, etc."
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default InventoryAdjustModal;
