import { inventoryCategoriesCreate, inventoryCategoriesUpdate, inventoryCategoriesDelete, inventoryCategoriesReorder,
    inventoryItemsCreate, inventoryItemsUpdate, inventoryItemsDelete, inventoryItemsReorder } from "../api/generated/sdk.gen";
import type { InventoryCategoryUpdate, InventoryContentCreate, InventoryContentUpdate, ReorderEntry } from "../api/generated/types.gen";
import { apiOptions } from "./api";

async function createCategory(slug: string, name: string) {
    return (await inventoryCategoriesCreate({ ...apiOptions, path: { slug }, body: { name } })).data;
}
async function patchCategory(slug: string, categoryId: number, body: InventoryCategoryUpdate) {
    return (await inventoryCategoriesUpdate({ ...apiOptions, path: { slug, category_id: categoryId }, body })).data;
}
async function deleteCategory(slug: string, categoryId: number) {
    await inventoryCategoriesDelete({ ...apiOptions, path: { slug, category_id: categoryId } });
}
async function reorderCategories(slug: string, items: ReorderEntry[]) {
    return (await inventoryCategoriesReorder({ ...apiOptions, path: { slug }, body: { items } })).data;
}
async function createItem(slug: string, categoryId: number, body: InventoryContentCreate) {
    return (await inventoryItemsCreate({ ...apiOptions, path: { slug, category_id: categoryId }, body })).data;
}
async function patchItem(slug: string, categoryId: number, itemId: number, body: InventoryContentUpdate) {
    return (await inventoryItemsUpdate({ ...apiOptions, path: { slug, category_id: categoryId, item_id: itemId }, body })).data;
}
async function deleteItem(slug: string, categoryId: number, itemId: number) {
    await inventoryItemsDelete({ ...apiOptions, path: { slug, category_id: categoryId, item_id: itemId } });
}
async function reorderItems(slug: string, categoryId: number, items: ReorderEntry[]) {
    return (await inventoryItemsReorder({ ...apiOptions, path: { slug, category_id: categoryId }, body: { items } })).data;
}
export default { createCategory, patchCategory, deleteCategory, reorderCategories, createItem, patchItem, deleteItem, reorderItems };
