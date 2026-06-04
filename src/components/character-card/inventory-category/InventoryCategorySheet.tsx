import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InventoryCategoryDto } from "../../../types/api";
import inventoryTableService from "../../../services/inventory-table.service";
import type { SaveStatusReporter } from "../hooks/useSaveStatus";
import InventoryList, { type InventoryListChange } from "../inventory/InventoryList";
import "./inventory-category.scss";

type InventoryCategorySheetProps = {
    slug: string;
    category: InventoryCategoryDto;
    saveStatus: SaveStatusReporter;
    refresh: () => void;
};

const sortItems = (category: InventoryCategoryDto) => (
    [...(category.contents ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
);

export default function InventoryCategorySheet({
    slug,
    category,
    saveStatus,
    refresh,
}: InventoryCategorySheetProps) {
    const { t } = useTranslation();
    const { markUnsaved, runSave } = saveStatus;
    const [name, setName] = React.useState(category.name);
    const [editingName, setEditingName] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setName(category.name);
        setEditingName(false);
        setSaveError(null);
    }, [category]);

    const saveCategoryName = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setName(category.name);
            setEditingName(false);
            return;
        }

        if (trimmedName === category.name) {
            setEditingName(false);
            return;
        }

        markUnsaved();
        try {
            await runSave(() => inventoryTableService.patchCategory(slug, category.id, { name: trimmedName }));
            setSaveError(null);
            setEditingName(false);
            refresh();
        } catch (error) {
            console.error("Failed to rename inventory category:", error);
            setName(category.name);
            setSaveError(t("characterCard.save.failed"));
        }
    };

    const deleteCategory = async () => {
        const confirmed = window.confirm(t("characterCard.customInventory.confirmDeleteCategory", { name: category.name }));
        if (!confirmed) return;

        markUnsaved();
        try {
            await runSave(() => inventoryTableService.deleteCategory(slug, category.id));
            setSaveError(null);
            refresh();
        } catch (error) {
            console.error("Failed to delete inventory category:", error);
            setSaveError(t("characterCard.save.failed"));
        }
    };

    const saveCategoryItems = async (_updatedItems: string[], shouldRefresh: boolean, change: InventoryListChange) => {
        const currentItems = sortItems(category);

        try {
            if (change.type === "add") {
                await runSave(() => inventoryTableService.createItem(slug, category.id, {
                    name: change.name,
                    quantity: 1,
                }));
            }

            if (change.type === "rename") {
                const item = currentItems[change.index];
                if (item) {
                    await runSave(() => inventoryTableService.patchItem(slug, category.id, item.id, { name: change.name }));
                }
            }

            if (change.type === "delete") {
                const item = currentItems[change.index];
                if (item) {
                    await runSave(() => inventoryTableService.deleteItem(slug, category.id, item.id));
                }
            }

            if (change.type === "reorder") {
                const reorderedItems = [...currentItems];
                const [movedItem] = reorderedItems.splice(change.fromIndex, 1);
                reorderedItems.splice(change.toIndex, 0, movedItem);
                await runSave(() => inventoryTableService.reorderItems(
                    slug,
                    category.id,
                    reorderedItems.map((item, index) => ({ id: item.id, sortOrder: index })),
                ));
            }

            setSaveError(null);
            if (shouldRefresh) refresh();
            return true;
        } catch (error) {
            console.error("Failed to save category inventory items:", error);
            refresh();
            return false;
        }
    };

    const categoryActions = (
        <div className="inventory-category__actions">
            {editingName ? (
                <input
                    className="inventory-category__nameInput"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            saveCategoryName();
                        }
                        if (event.key === "Escape") {
                            setName(category.name);
                            setEditingName(false);
                        }
                    }}
                    onBlur={saveCategoryName}
                    autoFocus
                />
            ) : (
                <button type="button" title={t("common.actions.edit")} onClick={() => setEditingName(true)}>
                    <Pencil size={15} aria-hidden="true" />
                </button>
            )}
            <button type="button" title={t("common.actions.delete")} onClick={deleteCategory}>
                <Trash2 size={15} aria-hidden="true" />
            </button>
        </div>
    );

    return (
        <>
            {saveError && <p className="inventory-category__error" role="status">{saveError}</p>}
            <InventoryList
                items={sortItems(category).map((item) => item.name)}
                title={category.name}
                listId={`${slug}-category-${category.id}`}
                ariaLabel={category.name}
                modalSubtitle={category.name}
                itemNameLabel={t("characterCard.inventory.itemName")}
                itemPlaceholder={t("characterCard.inventory.itemPlaceholder")}
                emptyLabel={t("characterCard.inventory.empty")}
                saveStatus={saveStatus}
                actions={categoryActions}
                onSaveItems={saveCategoryItems}
            />
        </>
    );
}
