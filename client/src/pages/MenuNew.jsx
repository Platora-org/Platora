import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Layers,
  UtensilsCrossed,
  ShoppingBasket,
  AlertTriangle,
  Package,
  Search,
  FolderTree,
  Bell,
  ChevronRight,
} from "lucide-react";

const uuid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const api = {
  async listCategories() {
    return [
      { id: "cat-1", name: "Mains" },
      { id: "cat-2", name: "Drinks" },
      { id: "cat-3", name: "Desserts" },
    ];
  },
  async createCategory(payload) {
    return { id: uuid(), ...payload };
  },
  async updateCategory(id, payload) {
    return { id, ...payload };
  },
  async deleteCategory(id) {
    return { ok: true, id };
  },
  async listMenu() {
    return [
      { id: "m-1", name: "Chicken Curry", description: "Spicy and creamy", price: 950, image_url: "", is_active: true, category_id: "cat-1" },
      { id: "m-2", name: "Iced Tea", description: "Refreshing", price: 350, image_url: "", is_active: true, category_id: "cat-2" },
    ];
  },
  async createMenuItem(payload) { return { id: uuid(), ...payload }; },
  async updateMenuItem(id, payload) { return { id, ...payload }; },
  async deleteMenuItem(id) { return { ok: true, id }; },
  async listInventory() {
    return [
      { id: "i-1", name: "Chicken", unit: "g", quantity: 1800, reorder_level: 2000 },
      { id: "i-2", name: "Rice", unit: "g", quantity: 10000, reorder_level: 5000 },
      { id: "i-3", name: "Curry Paste", unit: "g", quantity: 800, reorder_level: 1000 },
      { id: "i-4", name: "Tea Leaves", unit: "g", quantity: 300, reorder_level: 400 },
    ];
  },
  async createInventoryItem(payload) { return { id: uuid(), ...payload }; },
  async updateInventoryItem(id, payload) { return { id, ...payload }; },
  async deleteInventoryItem(id) { return { ok: true, id }; },
  async adjustInventory(id, { direction, quantity, reason }) { return { id, direction, quantity, reason }; },
  async listRecipe(menuItemId) {
    if (menuItemId === "m-1") {
      return [
        { inventory_id: "i-1", quantity: 250, unit: "g" },
        { inventory_id: "i-3", quantity: 50, unit: "g" },
        { inventory_id: "i-2", quantity: 200, unit: "g" },
      ];
    }
    return [];
  },
  async saveRecipe(menuItemId, ingredients) { return { menu_item_id: menuItemId, ingredients }; },
};

function classNames(...c) { return c.filter(Boolean).join(" "); }

const Card = ({ children, className }) => (
  <div className={classNames("rounded-2xl shadow-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur transition-colors", className)}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
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

const Toolbar = ({ children }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">{children}</div>
);

const Button = ({ variant = "primary", className, children, ...props }) => {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    secondary: "bg-white dark:bg-gray-900 text-emerald-600 border border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-gray-800",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400",
    ghost: "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-800/60",
  };
  return (
    <button className={classNames(base, variants[variant], className)} {...props}>{children}</button>
  );
};

const Input = (props) => (
  <input {...props} className={classNames("w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500", props.className)} />
);

const Select = ({ children, className, ...props }) => (
  <select {...props} className={classNames("w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500", className)}>
    {children}
  </select>
);

const Modal = ({ open, onClose, title, children, footer }) => (
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

const CategoriesManager = ({ categories, onCreate, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const filtered = useMemo(() => categories.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase())), [categories, filter]);
  return (
    <Card className="p-6">
      <SectionHeader icon={FolderTree} title="Menu Categories" subtitle="Organise your menu into clean sections." />
      <Toolbar>
        <div className="flex items-center gap-2">
          <Input placeholder="Search categories..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} className="md:w-72" />
          <Button onClick={() => name && onCreate({ name })}><Plus className="w-4 h-4" /> Add</Button>
        </div>
      </Toolbar>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800 dark:text-white">{cat.name}</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => { const renamed = prompt("Rename category", cat.name); if (renamed) onUpdate(cat.id, { name: renamed }); }}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onDelete(cat.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
                <span className={classNames("text-xs px-2 py-1 rounded-full", m.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600")}>{m.is_active ? "Active" : "Inactive"}</span>
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

const Th = ({ children, className }) => (
  <th className={classNames("px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300", className)}>{children}</th>
);
const Td = ({ children, className }) => (
  <td className={classNames("px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-100", className)}>{children}</td>
);

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
                    <span className={classNames("px-2 py-1 rounded-md text-sm", low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>{i.quantity}</span>
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

const StoreOperations = () => {
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tab, setTab] = useState("menu");
  useEffect(() => {
    (async () => {
      const [cats, m, inv] = await Promise.all([api.listCategories(), api.listMenu(), api.listInventory()]);
      setCategories(cats);
      setMenu(m);
      setInventory(inv);
      setLowStock(inv.filter((i) => Number(i.quantity) < Number(i.reorder_level)));
    })();
  }, []);
  const createCat = async (payload) => {
    const created = await api.createCategory(payload);
    setCategories((c) => [...c, created]);
  };
  const updateCat = async (id, payload) => {
    const updated = await api.updateCategory(id, payload);
    setCategories((c) => c.map((x) => (x.id === id ? updated : x)));
  };
  const deleteCat = async (id) => {
    await api.deleteCategory(id);
    setCategories((c) => c.filter((x) => x.id !== id));
  };
  const createMenu = async (payload) => {
    const created = await api.createMenuItem(payload);
    setMenu((m) => [...m, created]);
  };
  const updateMenu = async (id, payload) => {
    const updated = await api.updateMenuItem(id, payload);
    setMenu((m) => m.map((x) => (x.id === id ? updated : x)));
  };
  const deleteMenu = async (id) => {
    await api.deleteMenuItem(id);
    setMenu((m) => m.filter((x) => x.id !== id));
  };
  const recomputeLowStock = (list) => list.filter((i) => Number(i.quantity) < Number(i.reorder_level));
  const createInv = async (payload) => {
    const res = await api.createInventoryItem(payload);
    setInventory((i) => {
      const next = [...i, res];
      setLowStock(recomputeLowStock(next));
      return next;
    });
  };
  const updateInv = async (id, payload) => {
    const updated = await api.updateInventoryItem(id, payload);
    setInventory((i) => {
      const next = i.map((x) => (x.id === id ? { ...x, ...updated } : x));
      setLowStock(recomputeLowStock(next));
      return next;
    });
  };
  const deleteInv = async (id) => {
    await api.deleteInventoryItem(id);
    setInventory((i) => {
      const next = i.filter((x) => x.id !== id);
      setLowStock(recomputeLowStock(next));
      return next;
    });
  };
  const adjustInv = async (id, payload) => {
    await api.adjustInventory(id, payload);
    setInventory((i) => {
      const next = i.map((x) => (x.id === id ? { ...x, quantity: Math.max(0, Number(x.quantity) + (payload.direction === "in" ? Number(payload.quantity) : -Number(payload.quantity))) } : x));
      setLowStock(recomputeLowStock(next));
      return next;
    });
  };
  const saveRecipe = async (menuId, ingredients) => { await api.saveRecipe(menuId, ingredients); };
  const tabs = [
    { key: "menu", label: "Menu", icon: Layers },
    { key: "inventory", label: "Inventory", icon: ShoppingBasket },
    { key: "recipes", label: "Recipes", icon: UtensilsCrossed },
    { key: "categories", label: "Categories", icon: FolderTree },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];
  return (
    <div className="min-h-screen bg-emerald-50/50 dark:bg-gray-900 transition-colors px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-white">Store Operations</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your menu, inventory, recipes, and alerts in one place.</p>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={classNames("inline-flex items-center gap-2 px-4 py-2 rounded-full border transition", tab === t.key ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-emerald-50/50")}> 
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="space-y-6">
          {tab === "menu" && (<MenuManager menu={menu} categories={categories} onCreate={createMenu} onUpdate={updateMenu} onDelete={deleteMenu} />)}
          {tab === "inventory" && (<InventoryManager inventory={inventory} onCreate={createInv} onUpdate={updateInv} onDelete={deleteInv} onAdjust={adjustInv} />)}
          {tab === "recipes" && (<RecipeBuilder menu={menu} inventory={inventory} onSave={saveRecipe} />)}
          {tab === "categories" && (<CategoriesManager categories={categories} onCreate={createCat} onUpdate={updateCat} onDelete={deleteCat} />)}
          {tab === "notifications" && (<LowStockPanel lowStock={lowStock} />)}
        </div>
      </div>
    </div>
  );
};

export default StoreOperations;
