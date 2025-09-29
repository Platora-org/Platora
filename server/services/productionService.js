import { getCartItemsByCustomer } from '../models/plateModel.js';
import { getRecipesWithInventoryForMenuItems } from '../models/recipeModel.js';

/**
 * computeProductionPlan(customerProfileId)
 * returns: { cartItems, perItem: { [menu_item_id]: { orderedQty, maxDoable, ingredients: [...] } }, shortages: [...] }
 */
export async function computeProductionPlan(customerProfileId) {
  const cartItems = await getCartItemsByCustomer(customerProfileId);
  if (!cartItems || cartItems.length === 0) {
    return { cartItems: [], perItem: {}, shortages: [] };
  }

  const menuIds = cartItems.map(ci => ci.menu_item_id);
  const recipes = await getRecipesWithInventoryForMenuItems(menuIds);

  // group recipes by menu item
  const recipesByMenu = {};
  for (const r of recipes) {
    if (!recipesByMenu[r.menu_item_id]) recipesByMenu[r.menu_item_id] = [];
    recipesByMenu[r.menu_item_id].push({
      inventory_item_id: r.inventory_item_id,
      qty_required: Number(r.quantity_required),
      inventory_qty: Number(r.inventory_qty),
      inventory_name: r.inventory_name
    });
  }

  const perItem = {};
  const shortages = [];

  for (const ci of cartItems) {
    const orderedQty = Number(ci.ordered_qty);
    const recs = recipesByMenu[ci.menu_item_id] || [];

    if (recs.length === 0) {
      // no recipe -> treat as unconstrained (or change policy to block)
      perItem[ci.menu_item_id] = {
        orderedQty,
        maxDoable: orderedQty,
        ingredients: []
      };
      continue;
    }

    // compute maxDoable = floor(min(inventory_qty / qty_required) across ingredients)
    let minPossible = Number.POSITIVE_INFINITY;
    const ingredients = [];
    for (const ing of recs) {
      const available = ing.inventory_qty || 0;
      if (!ing.qty_required || ing.qty_required <= 0) {
        // broken recipe -> zero doable
        ingredients.push({ ...ing, possibleFromThis: 0 });
        minPossible = 0;
        continue;
      }
      const possibleFromThis = Math.floor(available / ing.qty_required);
      ingredients.push({ ...ing, possibleFromThis });
      if (possibleFromThis < minPossible) minPossible = possibleFromThis;
    }
    if (!isFinite(minPossible)) minPossible = 0;

    perItem[ci.menu_item_id] = {
      orderedQty,
      maxDoable: minPossible,
      ingredients
    };

    if (orderedQty > minPossible) {
      shortages.push({
        menu_item_id: ci.menu_item_id,
        menu_name: ci.menu_name,
        ordered: orderedQty,
        canMake: minPossible
      });
    }
  }

  return { cartItems, perItem, shortages };
}

