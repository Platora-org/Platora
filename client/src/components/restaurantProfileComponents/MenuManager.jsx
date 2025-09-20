// src/components/MenuManager.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Layers, Plus, Pencil, Trash2, Search, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, SectionHeader, Toolbar, Button, Input, Select, Modal } from "./MenuUI";

const MenuItemModal = ({ open, onClose, initial, onSubmit, categories }) => {
    const [form, setForm] = useState(() => initial || { name: "", description: "", price: "", image_url: "", is_active: true, category_id: "" });
    useEffect(() => { setForm(initial || { name: "", description: "", price: "", image_url: "", is_active: true, category_id: "" }); }, [initial]);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    return (
        <Modal open={open} onClose={onClose} title={initial ? "Edit Menu Item" : "New Menu Item"} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit({ ...form, price: Number(form.price) })}><Save className="w-4 h-4" /> Save</Button></div>}>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name</label>
                    <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="col-span-12">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                    <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
                </div>
                <div className="col-span-6">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Price (LKR)</label>
                    <Input type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} />
                </div>
                <div className="col-span-6">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                    <Select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                        <option value="">Select category</option>
                        {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </Select>
                </div>
                <div className="col-span-12">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Image URL</label>
                    <Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." />
                </div>
                <div className="col-span-12">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /><span className="text-sm text-gray-700 dark:text-gray-300">Active</span></label>
                </div>
            </div>
        </Modal>
    );
};

const MenuManager = ({ menu, categories, onCreate, onUpdate, onDelete }) => {
    const [filter, setFilter] = useState("");
    const [category, setCategory] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const filtered = useMemo(() => menu.filter((m) => (!category || m.category_id === category) && (m.name.toLowerCase().includes(filter.toLowerCase()) || (m.description || "").toLowerCase().includes(filter.toLowerCase()))), [menu, filter, category]);
    const openCreate = () => { setEditing(null); setOpenModal(true); };
    const openEdit = (item) => { setEditing(item); setOpenModal(true); };
    return (
        <Card className="p-6">
            <SectionHeader icon={Layers} title="Menu" subtitle="Create and manage your store menu items." />
            <Toolbar>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input placeholder="Search menu..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={category} onChange={(e) => setCategory(e.target.value)} className="md:w-56">
                        <option value="">All categories</option>
                        {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </Select>
                </div>
                <Button onClick={openCreate}><Plus className="w-4 h-4" /> New Item</Button>
            </Toolbar>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((m) => (
                    <motion.div key={m.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950 shadow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="h-40 bg-gray-100 dark:bg-gray-800">
                            <img
                                src={m.image_url || "https://placehold.co/600x300/e2e8f0/475569?text=Menu+Image"}
                                alt={m.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = "https://placehold.co/600x300/e2e8f0/475569?text=Menu+Image"; }}
                            />
                        </div>
                        <div className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-white">{m.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{m.description}</p>
                                </div>
                                <div className="text-emerald-600 dark:text-emerald-400 font-bold">LKR {Number(m.price).toFixed(2)}</div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <span className={`text-xs px-2 py-1 rounded-full ${m.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                                    {m.is_active ? "Active" : "Inactive"}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onDelete(m.id)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            <MenuItemModal open={openModal} onClose={() => setOpenModal(false)} categories={categories} initial={editing} onSubmit={(payload) => { if (editing) onUpdate(editing.id, payload); else onCreate(payload); setOpenModal(false); }} />
        </Card>
    );
};

export default MenuManager;