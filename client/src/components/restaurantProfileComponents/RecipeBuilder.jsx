// src/components/RecipeBuilder.jsx
import React, { useEffect, useMemo, useState } from "react";
import { UtensilsCrossed, Plus, Trash2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, SectionHeader, Button, Select, Input } from "./MenuUI";
import { api } from "./MenuApi";

const RecipeBuilder = ({ menu, inventory, onSave }) => {
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const selectedMenu = useMemo(() => menu.find((m) => m.id === selectedMenuId), [menu, selectedMenuId]);
  const addRow = () => setRows((r) => [...r, { inventory_id: "", quantity: "", unit: "" }]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));
  const setField = (idx, key, val) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));
  const loadExisting = async (id) => {
    if (!id) return setRows([]);
    setLoading(true);
    try {
      const existing = await api.listRecipe(id);
      setRows(existing);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadExisting(selectedMenuId); }, [selectedMenuId]);
  const save = async () => {
    if (!selectedMenuId || rows.length === 0) return;
    const cleaned = rows.filter((r) => r.inventory_id && Number(r.quantity) > 0 && r.unit);
    if (cleaned.length === 0) return;
    await onSave(selectedMenuId, cleaned);
  };
  return (
    <Card className="p-6">
      <SectionHeader icon={UtensilsCrossed} title="Recipe Builder" subtitle="Define ingredient usage per menu item for automatic inventory deductions." />
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Menu Item</label>
          <Select value={selectedMenuId} onChange={(e) => setSelectedMenuId(e.target.value)}>
            <option value="">Select menu item</option>
            {menu.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </Select>
        </div>
        <div className="md:col-span-2 flex items-end justify-end">
          <Button onClick={addRow}><Plus className="w-4 h-4" /> Add Ingredient</Button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <AnimatePresence>
          {rows.map((row, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="col-span-5">
                <Select value={row.inventory_id} onChange={(e) => setField(idx, "inventory_id", e.target.value)}>
                  <option value="">Select inventory item</option>
                  {inventory.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
                </Select>
              </div>
              <div className="col-span-3">
                <Input type="number" min="0" placeholder="Quantity" value={row.quantity} onChange={(e) => setField(idx, "quantity", e.target.value)} />
              </div>
              <div className="col-span-3">
                <Input placeholder="Unit (g, ml, pcs)" value={row.unit} onChange={(e) => setField(idx, "unit", e.target.value)} />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => removeRow(idx)}><Trash2 className="w-5 h-5" /></Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {selectedMenu && rows.length === 0 && !loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">No ingredients yet. Use "Add Ingredient" to start.</div>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={save}><Save className="w-4 h-4" /> Save Recipe</Button>
      </div>
    </Card>
  );
};

export default RecipeBuilder;