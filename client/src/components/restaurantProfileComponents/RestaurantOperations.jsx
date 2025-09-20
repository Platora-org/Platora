// src/components/StoreOperations.jsx
import React, { useEffect, useState } from "react";
import { Layers, ShoppingBasket, UtensilsCrossed, FolderTree, Bell } from "lucide-react";
import { api } from "./MenuApi";
import { toast } from "react-toastify";
import axiosInstance from '../../utils/axiosInstance';
import MenuManager from "./MenuManager"
import InventoryManager from "./InventoryManager"
import RecipeBuilder from "./RecipeBuilder"
import CategoriesManager from "./CategoriesManager"
import LowStockPanel from "./LowStockPanel"


import { Card, Button } from "./MenuUI"

const StoreOperations = () => {
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tab, setTab] = useState("menu");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, m, inv] = await Promise.all([
          axiosInstance.get('/restaurants/menuCategories/'),
          api.listMenu(),
          api.listInventory(),
        ]);
        console.log(cats.data.categories)
        setCategories(cats.data.categories);
        setMenu(m);
        setInventory(inv);
        setLowStock(inv.filter((i) => Number(i.quantity) < Number(i.reorder_level)));
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // --- Categories CRUD Handlers ---

const createCat = async (payload) => {
  try {
    const res = await axiosInstance.post(`/restaurants/menuCategories/`, payload);

    // Update local state
    setCategories((c) => [...c, res.data.category]);

    // Success toast
    toast.success(res.data.message || "Category created successfully");
  } catch (error) {
    console.error("Failed to create category:", error);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || "Failed to create category";

      if (status === 400) toast.error("Category name is required");
      else if (status === 409) toast.error("Category with this name already exists");
      else toast.error(message);
    } else {
      toast.error("Network error: Failed to create category");
    }
  }
};


   const updateCat = async (id, payload) => {
  try {
    const res = await axiosInstance.put(`/restaurants/menuCategories/${id}`, payload);

    // Update local state
    setCategories((c) => c.map((x) => (x.id === id ? res.data.category : x)));

    // Success toast
    toast.success(res.data.message || "Category updated successfully");
  } catch (error) {
    console.error("Failed to update category:", error);

    // Show error toast based on response
    if (error.response) {
      // Server responded with a status code outside 2xx
      const status = error.response.status;
      const message = error.response.data?.message || "Failed to update category";

      if (status === 400) toast.error("Category name is required");
      else if (status === 404) toast.error("Category not found");
      else if (status === 409) toast.error("Category with this name already exists");
      else toast.error(message);
    } else {
      // Network error or other
      toast.error("Network error: Failed to update category");
    }
  }
};

 const deleteCat = async (id) => {
  try {
    const res = await axiosInstance.delete(`/restaurants/menuCategories/${id}`);

    // Update local state
    setCategories((c) => c.filter((x) => x.id !== id));

    // Success toast
    toast.success(res.data.message || "Category deleted successfully");
  } catch (error) {
    console.error("Failed to delete category:", error);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || "Failed to delete category";

      if (status === 404) toast.error("Category not found");
      else toast.error(message);
    } else {
      toast.error("Network error: Failed to delete category");
    }
  }
};

  // --- Menu CRUD Handlers ---
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

  // --- Inventory CRUD & Adjust Handlers ---
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

  // --- Recipe Handler ---
  const saveRecipe = async (menuId, ingredients) => {
    await api.saveRecipe(menuId, ingredients);
  };

  const tabs = [
    { key: "menu", label: "Menu", icon: Layers },
    { key: "inventory", label: "Inventory", icon: ShoppingBasket },
    { key: "recipes", label: "Recipes", icon: UtensilsCrossed },
    { key: "categories", label: "Categories", icon: FolderTree },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-emerald-50/50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-white">Store Operations</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your menu, inventory, recipes, and alerts in one place.</p>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button key={t.key} onClick={() => setTab(t.key)} variant={t.key === tab ? "primary" : "ghost"}>
              <t.icon className="w-4 h-4" /> {t.label}
            </Button>
          ))}
        </div>
        <div className="space-y-6">
          {tab === "menu" && <MenuManager menu={menu} categories={categories} onCreate={createMenu} onUpdate={updateMenu} onDelete={deleteMenu} />}
          {tab === "inventory" && <InventoryManager inventory={inventory} onCreate={createInv} onUpdate={updateInv} onDelete={deleteInv} onAdjust={adjustInv} />}
          {tab === "recipes" && <RecipeBuilder menu={menu} inventory={inventory} onSave={saveRecipe} />}
          {tab === "categories" && <CategoriesManager categories={categories} onCreate={createCat} onUpdate={updateCat} onDelete={deleteCat} />}
          {tab === "notifications" && <LowStockPanel lowStock={lowStock} />}
        </div>
      </div>
    </div>
  );
};

export default StoreOperations;