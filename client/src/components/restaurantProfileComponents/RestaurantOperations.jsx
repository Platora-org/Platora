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

import { Card, Button, NotificationBadge } from "./MenuUI"

const StoreOperations = () => {
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tab, setTab] = useState("menu");

  const notifications = lowStock.map((item) => ({
    id: item.id,
    message: `${item.name} is below reorder level (${item.quantity} ${item.unit})`,
  }));

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
      setCategories((c) => [...c, res.data.category]);
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
      setCategories((c) => c.map((x) => (x.id === id ? res.data.category : x)));
      toast.success(res.data.message || "Category updated successfully");
    } catch (error) {
      console.error("Failed to update category:", error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || "Failed to update category";

        if (status === 400) toast.error("Category name is required");
        else if (status === 404) toast.error("Category not found");
        else if (status === 409) toast.error("Category with this name already exists");
        else toast.error(message);
      } else {
        toast.error("Network error: Failed to update category");
      }
    }
  };

  const deleteCat = async (id) => {
    try {
      const res = await axiosInstance.delete(`/restaurants/menuCategories/${id}`);
      setCategories((c) => c.filter((x) => x.id !== id));
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

  // --- Menu CRUD Handlers with Image Support ---
const createMenu = async (payload) => {
  try {
    const finalPayload = {
      name: payload.name,
      description: payload.description,
      price: payload.price,
      is_active: payload.is_active,
      category_id: payload.category_id,
    };

    // If image selected -> add to FormData
    if (payload.image_file?.file) {
      finalPayload.image = payload.image_file.file; // multer expects field "image"
    } else if (payload.image_url) {
      finalPayload.image_url = payload.image_url; // in case user pastes URL
    }

    const created = await api.createMenuItem(finalPayload);
    setMenu((m) => [...m, created]);
    toast.success("Menu item created successfully");
  } catch (error) {
    console.error("Failed to create menu item:", error);
    toast.error("Failed to create menu item");
  }
};

const updateMenu = async (id, payload) => {
  try {
    const finalPayload = {
      name: payload.name,
      description: payload.description,
      price: payload.price,
      is_active: payload.is_active,
      category_id: payload.category_id,
    };

    if (payload.image_file?.file) {
      finalPayload.image = payload.image_file.file;
    } else if (payload.image_url) {
      finalPayload.image_url = payload.image_url;
    }

    const updated = await api.updateMenuItem(id, finalPayload);
    setMenu((m) => m.map((x) => (x.id === id ? updated : x)));
    toast.success("Menu item updated successfully");
  } catch (error) {
    console.error("Failed to update menu item:", error);
    toast.error("Failed to update menu item");
  }
};

const deleteMenu = async (id) => {
  try {
    await api.deleteMenuItem(id);
    setMenu((m) => m.filter((x) => x.id !== id));
    toast.success("Menu item deleted successfully");
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    toast.error("Failed to delete menu item");
  }
};


  // --- Inventory CRUD & Adjust Handlers ---
  const recomputeLowStock = (list) => list.filter((i) => Number(i.quantity) < Number(i.reorder_level));

  const createInv = async (payload) => {
    try {
      const res = await api.createInventoryItem(payload);

      setInventory((i) => {
        const next = [...i, res];
        setLowStock(recomputeLowStock(next));
        return next;
      });

      toast.success("Inventory item created successfully");
    } catch (error) {
      console.error("Failed to create inventory item:", error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || "Failed to create item";

        if (status === 400) toast.error("Invalid inventory name or missing unit");
        else if (status === 409) toast.error("Inventory with this name already exists");
        else toast.error(message);
      } else {
        toast.error("Network error: Failed to create item");
      }
    }
  };

  const updateInv = async (id, payload) => {
    try {
      const updated = await api.updateInventoryItem(id, payload);

      setInventory((i) => {
        const next = i.map((x) => (x.id === id ? { ...x, ...updated } : x));
        setLowStock(recomputeLowStock(next));
        return next;
      });

      toast.success("Inventory item updated successfully");
    } catch (error) {
      console.error("Failed to update inventory item:", error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || "Failed to update item";

        if (status === 400) toast.error("Invalid inventory name or missing unit");
        else if (status === 409) toast.error("Inventory with this name already exists");
        else if (status === 404) toast.error("Item not found");
        else toast.error(message);
      } else {
        toast.error("Network error: Failed to update item");
      }
    }
  };

  const deleteInv = async (id) => {
    try {
      await api.deleteInventoryItem(id);

      setInventory((i) => {
        const next = i.filter((x) => x.id !== id);
        setLowStock(recomputeLowStock(next));
        return next;
      });

      toast.success("Inventory item deleted successfully");
    } catch (error) {
      console.error("Failed to delete inventory item:", error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || "Failed to delete item";

        if (status === 404) toast.error("Item not found");
        else toast.error(message);
      } else {
        toast.error("Network error: Failed to delete item");
      }
    }
  };

  const adjustInv = async (id, payload) => {
    try {
      await api.adjustInventory(id, payload);

      setInventory((i) => {
        const next = i.map((x) =>
          x.id === id
            ? {
                ...x,
                quantity: Math.max(
                  0,
                  Number(x.quantity) +
                    (payload.direction === "in"
                      ? Number(payload.quantity)
                      : -Number(payload.quantity))
                ),
              }
            : x
        );
        setLowStock(recomputeLowStock(next));
        return next;
      });

      toast.success("Inventory adjusted successfully");
    } catch (error) {
      console.error("Failed to adjust inventory:", error);

      if (error.response) {
        const message = error.response.data?.message || "Failed to adjust inventory";
        toast.error(message);
      } else {
        toast.error("Network error: Failed to adjust inventory");
      }
    }
  };

  // --- Recipe Handler ---
  const saveRecipe = async (menuId, ingredients) => {
    try {
      await api.saveRecipe(menuId, ingredients);
      toast.success("Recipe saved successfully");
    } catch (error) {
      console.error("Failed to save recipe:", error);
      toast.error("Failed to save recipe");
    }
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
            <Button
              key={t.key}
              onClick={() => setTab(t.key)}
              variant={t.key === tab ? "primary" : "ghost"}
              className="relative"
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {t.key === "notifications" && (
                <NotificationBadge count={notifications.length} />
              )}
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