// src/components/MenuManager.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Layers, Plus, Pencil, Trash2, Search, Save, Upload, X, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Card, SectionHeader, Toolbar, Button, Input, Select, Modal } from "./MenuUI";

// ----- Image Upload Component (robust) -----
const ImageUploader = ({ value, onChange, onRemove, disabled = false }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(value || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentObjectUrl = useRef(null);

  // keep preview in sync with incoming "value" (string URL)
  useEffect(() => {
    // if value is empty string -> clear
    if (!value) {
      if (currentObjectUrl.current) {
        try { URL.revokeObjectURL(currentObjectUrl.current); } catch {}
        currentObjectUrl.current = null;
      }
      setPreview("");
      return;
    }

    // If value is a string (either data: or remote url), set it.
    setPreview(value);
  }, [value]);

  // cleanup when unmount
  useEffect(() => {
    return () => {
      if (currentObjectUrl.current) {
        try { URL.revokeObjectURL(currentObjectUrl.current); } catch {}
        currentObjectUrl.current = null;
      }
    };
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsLoading(true);

    // create a fast local preview with object URL (instant)
    const objectUrl = URL.createObjectURL(file);
    currentObjectUrl.current = objectUrl;
    setPreview(objectUrl);

    // call parent immediately with object URL preview (so parent can set form.image_url right away)
    onChange?.({
      file,
      preview: objectUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // also produce a base64 data URL (useful if you need to upload raw base64)
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // replace preview with base64 (this is optional; objectURL was already shown)
      setPreview(dataUrl);

      // inform parent with final base64 preview
      onChange?.({
        file,
        preview: dataUrl,
        previewBase64: dataUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // revoke object URL (we no longer need it)
      if (currentObjectUrl.current) {
        try { URL.revokeObjectURL(currentObjectUrl.current); } catch {}
        currentObjectUrl.current = null;
      }

      setIsLoading(false);
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleRemove = () => {
    if (currentObjectUrl.current) {
      try { URL.revokeObjectURL(currentObjectUrl.current); } catch {}
      currentObjectUrl.current = null;
    }
    setPreview("");
    onRemove?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {preview ? (
        <div className="relative group">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-transparent">
            <img
              src={preview}
              alt="Preview"
              onLoad={() => console.log("Image loaded:", preview)}
              onError={(e) => {
                console.error("Image failed to load", e);
                // fallback placeholder
                setPreview("");
              }}
              className="w-full h-full object-cover block"
              decoding="async"
            />

            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* small action buttons (top-right) */}
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <button
              type="button"
              onClick={() => window.open(preview, "_blank")}
              className="p-1.5 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              title="View full image"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-red-500 bg-opacity-80 text-white rounded-full hover:bg-opacity-100 transition-all"
              title="Remove image"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* overlay "Change Image" — pointer-events disabled on container so it doesn't block the img */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-200"
              // clicking inside should work because inner div has pointer-events-auto
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-white text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded"
                disabled={disabled}
              >
                Change Image
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400
            ${isDragging ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Upload className="w-8 h-8" />
          <div className="text-center">
            <div className="font-medium">{isDragging ? "Drop image here" : "Click to upload or drag image here"}</div>
            <div className="text-xs mt-1">PNG, JPG, JPEG up to 5MB</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----- MenuItemModal (unchanged except uses new uploader) -----
const MenuItemModal = ({ open, onClose, initial, onSubmit, categories }) => {
  const [form, setForm] = useState(() =>
    initial || { name: "", description: "", price: "", image_url: "", image_file: null, is_active: true, category_id: "" }
  );

  useEffect(() => {
    setForm(initial || { name: "", description: "", price: "", image_url: "", image_file: null, is_active: true, category_id: "" });
  }, [initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = (imageData) => {
    // imageData.preview will be objectURL first, then base64 later (if generated)
    setForm(f => ({
      ...f,
      image_file: imageData,
      image_url: imageData?.preview || ''
    }));
  };

  const handleImageRemove = () => {
    setForm(f => ({
      ...f,
      image_file: null,
      image_url: ''
    }));
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      price: Number(form.price)
    };

    if (form.image_file) payload.image_file = form.image_file;
    onSubmit(payload);
  };

  return (
    <Modal  className="mt-5"
  open={open}
  onClose={onClose}
  title={initial ? "Edit Menu Item" : "New Menu Item"}
  footer={
    <div className="flex justify-end gap-2 ">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSubmit}><Save className="w-4 h-4" /> Save</Button>
    </div>
  }
>
  <div
    className="
      grid grid-cols-12 gap-4
      max-w-2xl mx-auto  
      max-h-[50vh]        
      overflow-y-auto    
      p-2  
                  
    "
  >
    {/* Name */}
    <div className="col-span-12">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name</label>
      <Input
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Enter item name"
      />
    </div>

    {/* Description */}
    <div className="col-span-12">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
      <Input
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="Enter description"
      />
    </div>

    {/* Price */}
    <div className="col-span-6">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Price (LKR)</label>
      <Input
        value={form.price}
        onChange={(e) => set("price", e.target.value)}
        placeholder="0.00"
      />
    </div>

    {/* Category */}
    <div className="col-span-6">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
      <Select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
        <option value="">Select category</option>
        {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
      </Select>
    </div>

    {/* Image Upload */}
    <div className="col-span-12">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Image</label>
      <ImageUploader
        value={form.image_url}
        onChange={handleImageUpload}
        onRemove={handleImageRemove}
      />
    </div>

    {/* Image URL */}
    <div className="col-span-12">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Or Image URL</label>
      <Input
        value={form.image_file ? '' : form.image_url}
        onChange={(e) => set("image_url", e.target.value)}
        placeholder="https://..."
        disabled={!!form.image_file}
      />
      {form.image_file && (<p className="text-xs text-gray-500 mt-1">Remove uploaded image to use URL instead</p>)}
    </div>

    {/* Active */}
    <div className="col-span-12">
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
        <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
      </label>
    </div>
  </div>
</Modal>

  );
};

// ----- Menu Manager -----
const MenuManager = ({ menu = [], categories = [], onCreate, onUpdate, onDelete }) => {
    console.log("========================================================================" , menu)
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(
    () =>
      menu.filter(
        (m) =>
          (!category || m.category_id == category) &&
          (m.name.toLowerCase().includes(filter.toLowerCase()) ||
            (m.description || "").toLowerCase().includes(filter.toLowerCase()))
      ),
    [menu, filter, category]
  );

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setOpenModal(true);
  };

  const handleSubmit = (payload) => {
    if (editing) {
      onUpdate(editing.id, payload);
    } else {
      onCreate(payload);
    }
    setOpenModal(false);
  };
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
            <div className="h-40 bg-gray-100 dark:bg-gray-800 relative group">
              <img
                src={m.image_url ? `${import.meta.env.VITE_API_URL}${m.image_url}` : "https://placehold.co/600x300/e2e8f0/475569?text=Menu+Image"}
                alt={m.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105 block"
                onLoad={() => console.log("card image loaded:", m.id)}
                onError={(e) => {
                  console.warn("card image error, using placeholder for id:", m.id);
                  e.currentTarget.src = "https://placehold.co/600x300/e2e8f0/475569?text=Menu+Image";
                }}
                decoding="async"
              />
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-all pointer-events-none" />

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

      <MenuItemModal open={openModal} onClose={() => setOpenModal(false)} categories={categories} initial={editing} onSubmit={handleSubmit} />
    </Card>
  );
};

export default MenuManager;
