import React, { useEffect, useMemo, useState } from "react";
import { UtensilsCrossed, Plus, Trash2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, SectionHeader, Button, Select, Input } from "./MenuUI";
import { api } from "./MenuApi";

const RecipeBuilder = ({ menu, inventory, onSave }) => {
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedMenu = useMemo(
    () => menu.find((m) => m.id == selectedMenuId),
    [menu, selectedMenuId]
  );

  const canSave = useMemo(() => {
    if (!selectedMenuId || rows.length === 0) return false;
    const validRows = rows.filter(
      (r) => r.inventory_id && Number(r.quantity) > 0
    );
    return validRows.length > 0;
  }, [selectedMenuId, rows]);

  const selectedIngredientIds = useMemo(
    () => new Set(rows.map((row) => row.inventory_id).filter(Boolean)),
    [rows]
  );

  // ✨ NEW: Determine if the 'Add Ingredient' button should be disabled
  const isAddDisabled = useMemo(() => {
    // Disable if no menu is selected OR if all inventory items are already used
    return !selectedMenuId || selectedIngredientIds.size >= inventory.length;
  }, [selectedMenuId, selectedIngredientIds, inventory.length]);


  const addRow = () =>
    setRows((r) => [...r, { inventory_id: "", quantity: "" }]);

  const removeRow = (idx) =>
    setRows((r) => r.filter((_, i) => i !== idx));

  const setField = (idx, key, val) =>
    setRows((r) =>
      r.map((x, i) => (i === idx ? { ...x, [key]: val } : x))
    );

  const handleQuantityChange = (idx, value) => {
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setField(idx, "quantity", value);
    }
  };

  const loadExisting = async (id) => {
    if (!id) return setRows([]);
    setLoading(true);
    try {
      const existing = await api.listRecipe(id);
      setRows(existing || []);
    } catch (error) {
      console.error("Failed to load recipe:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExisting(selectedMenuId);
  }, [selectedMenuId]);

  const save = async () => {
    if (!canSave) return;
    const cleaned = rows.filter(
      (r) => r.inventory_id && Number(r.quantity) > 0
    );
    await onSave(selectedMenuId, cleaned);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        icon={UtensilsCrossed}
        title="Recipe Builder"
        subtitle="Define ingredient usage per menu item for automatic inventory deductions."
      />
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Menu Item
          </label>
          <Select
            value={selectedMenuId}
            onChange={(e) => setSelectedMenuId(e.target.value)}
          >
            <option value="">Select menu item</option>
            {menu.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2 flex items-end justify-end">
          {/* ✨ CHANGE: Use the new 'isAddDisabled' variable */}
          <Button onClick={addRow} disabled={isAddDisabled}>
            <Plus className="w-4 h-4" /> Add Ingredient
          </Button>
        </div>
      </div>
      <div className="mt-4 min-h-[6rem] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            Loading ingredients...
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {rows.map((row, idx) => {
                const inv = inventory.find((i) => i.id == row.inventory_id);
                const availableInventory = inventory.filter(
                  (item) =>
                    !selectedIngredientIds.has(String(item.id)) ||
                    String(item.id) === row.inventory_id
                );
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
                  >
                    <div className="col-span-5">
                      <Select
                        value={row.inventory_id}
                        onChange={(e) =>
                          setField(idx, "inventory_id", e.target.value)
                        }
                      >
                        <option value="">Select inventory item</option>
                        {availableInventory.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="text"
                        inputMode="decimal"
                        min="0"
                        placeholder="Quantity"
                        value={row.quantity}
                        onChange={(e) =>
                          handleQuantityChange(idx, e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        readOnly
                        value={inv ? inv.unit : ""}
                        placeholder="Unit"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => removeRow(idx)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {selectedMenuId && rows.length === 0 && (
              <div className="text-md text-gray-500 dark:text-gray-400 pt-3">
                No ingredients yet. Use "Add Ingredient" to start.
              </div>
            )}
          </div>
        )}
      </div>
      {canSave && (
        <div className="mt-6 flex justify-end">
          <Button onClick={save}>
            <Save className="w-4 h-4" /> Save Recipe
          </Button>
        </div>
      )}
    </Card>
  );
};

export default RecipeBuilder;