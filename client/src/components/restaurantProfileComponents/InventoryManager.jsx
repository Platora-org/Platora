// src/components/InventoryManager.jsx
import React, { useMemo, useState, useEffect } from "react";
import { ShoppingBasket, Plus, Search, Pencil, Trash2, ChevronRight, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, SectionHeader, Toolbar, Button, Input, Modal, Th, Td } from "./MenuUI";

const InventoryItemModal = ({ open, onClose, initial, onSubmit }) => {
    const [form, setForm] = useState(() => initial || { name: "", unit: "g", quantity: 0, reorder_level: 0 });
    useEffect(() => { setForm(initial || { name: "", unit: "g", quantity: 0, reorder_level: 0 }); }, [initial]);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    return (
        <Modal open={open} onClose={onClose} title={initial ? "Edit Inventory Item" : "New Inventory Item"} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit({ ...form, quantity: Number(form.quantity), reorder_level: Number(form.reorder_level) })}><Save className="w-4 h-4" /> Save</Button></div>}>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name</label>
                    <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="col-span-6">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Unit</label>
                    <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. g, ml, pcs" />
                </div>
                <div className="col-span-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</label>
                    <Input type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
                </div>
                <div className="col-span-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reorder Level</label>
                    <Input type="number" min="0" value={form.reorder_level} onChange={(e) => set("reorder_level", e.target.value)} />
                </div>
            </div>
        </Modal>
    );
};

const InventoryManager = ({ inventory, onCreate, onUpdate, onDelete, onAdjust }) => {
    const [filter, setFilter] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const filtered = useMemo(() => inventory.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase())), [inventory, filter]);
    const openCreate = () => { setEditing(null); setOpenModal(true); };
    const openEdit = (item) => { setEditing(item); setOpenModal(true); };
    return (
        <Card className="p-6">
            <SectionHeader icon={ShoppingBasket} title="Inventory" subtitle="Track stock levels with reorder alerts." />
            <Toolbar>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input placeholder="Search inventory..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={openCreate}><Plus className="w-4 h-4" /> New Item</Button>
                </div>
            </Toolbar>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                            <Th>Name</Th>
                            <Th>Unit</Th>
                            <Th>Quantity</Th>
                            <Th>Reorder Level</Th>
                            <Th className="text-right">Actions</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
                        {filtered.map((i) => {
                            const low = Number(i.quantity) < Number(i.reorder_level);
                            return (
                                <tr key={i.id} className={low ? "bg-amber-50/60 dark:bg-amber-900/10" : undefined}>
                                    <Td>{i.name}</Td>
                                    <Td>{i.unit}</Td>
                                    <Td>
                                        <span className={`px-2 py-1 rounded-md text-sm ${low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                            {i.quantity}
                                        </span>
                                    </Td>
                                    <Td>{i.reorder_level}</Td>
                                    <Td className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <Button variant="ghost" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" onClick={() => onAdjust(i.id, { direction: "in", quantity: 100, reason: "restock" })}><ChevronRight className="w-4 h-4" /></Button>
                                            <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onDelete(i.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </Td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <InventoryItemModal open={openModal} onClose={() => setOpenModal(false)} initial={editing} onSubmit={(payload) => { if (editing) onUpdate(editing.id, payload); else onCreate(payload); setOpenModal(false); }} />
        </Card>
    );
};

export default InventoryManager;