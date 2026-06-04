import type { InventoryCategoryDto, InventoryContentDto } from "../types/api";
import api from "./api";

type ReorderItem = {
    id: number;
    sortOrder: number;
};

async function createCategory(slug: string, name: string) {
    const res = await api.post<InventoryCategoryDto>(`/characters/${slug}/inventory-categories`, { name });
    return res.data;
}

async function patchCategory(slug: string, categoryId: number, body: Partial<Pick<InventoryCategoryDto, "name" | "sortOrder">>) {
    const res = await api.patch<InventoryCategoryDto>(`/characters/${slug}/inventory-categories/${categoryId}`, body);
    return res.data;
}

async function deleteCategory(slug: string, categoryId: number) {
    await api.delete(`/characters/${slug}/inventory-categories/${categoryId}`);
}

async function reorderCategories(slug: string, items: ReorderItem[]) {
    const res = await api.patch<InventoryCategoryDto[]>(`/characters/${slug}/inventory-categories/reorder`, { items });
    return res.data;
}

async function createItem(slug: string, categoryId: number, body: Pick<InventoryContentDto, "name"> & Partial<Pick<InventoryContentDto, "quantity" | "notes">>) {
    const res = await api.post<InventoryContentDto>(`/characters/${slug}/inventory-categories/${categoryId}/items`, body);
    return res.data;
}

async function patchItem(slug: string, categoryId: number, itemId: number, body: Partial<Pick<InventoryContentDto, "name" | "quantity" | "notes" | "sortOrder">>) {
    const res = await api.patch<InventoryContentDto>(`/characters/${slug}/inventory-categories/${categoryId}/items/${itemId}`, body);
    return res.data;
}

async function deleteItem(slug: string, categoryId: number, itemId: number) {
    await api.delete(`/characters/${slug}/inventory-categories/${categoryId}/items/${itemId}`);
}

async function reorderItems(slug: string, categoryId: number, items: ReorderItem[]) {
    const res = await api.patch<InventoryContentDto[]>(`/characters/${slug}/inventory-categories/${categoryId}/items/reorder`, { items });
    return res.data;
}

export default {
    createCategory,
    patchCategory,
    deleteCategory,
    reorderCategories,
    createItem,
    patchItem,
    deleteItem,
    reorderItems,
};
