// src/components/CategoriesManager.jsx
import React, { useMemo, useState } from "react";
import { FolderTree, Plus, Pencil, Trash2, X } from "lucide-react";
import { Card, SectionHeader, Toolbar, Button, Input } from "./MenuUI";

const CategoriesManager = ({ categories = [], onCreate, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");

  // Popup state
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [editName, setEditName] = useState("");

  const filtered = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase())),
    [categories, filter]
  );

  const handleEditClick = (cat) => {
    setEditCategory(cat);
    setEditName(cat.name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onUpdate(editCategory.id, { name: editName.trim() });
      setIsEditing(false);
      setEditCategory(null);
      setEditName("");
    }
  };

  return (
    <Card className="p-6">
      <SectionHeader
        icon={FolderTree}
        title="Menu Categories"
        subtitle="Organise your menu into clean sections."
      />
      <Toolbar>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search categories..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="New category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="md:w-72"
          />
          <Button onClick={() => name && onCreate({ name })}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </Toolbar>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cat) => (
          <div
            key={cat.id}
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-950"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800 dark:text-white">
                {cat.name}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => handleEditClick(cat)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => onDelete(cat.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Popup Modal */}
      {isEditing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Edit Category</h2>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter category name"
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CategoriesManager;
