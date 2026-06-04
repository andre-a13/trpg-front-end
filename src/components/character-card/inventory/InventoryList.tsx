import React from "react";
import { ChevronLeft, ChevronRight, List, Rows3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SaveStatusReporter } from "../hooks/useSaveStatus";
import InventoryItem from "./inventory-item/InventoryItem";
import Modal, { type ModalHandle } from "../../ui/modal/Modal";

const INVENTORY_ITEMS_PER_PAGE = 5;

type VisibleInventoryItem = {
  item: string;
  index: number;
};

type InventoryListProps = {
  items: string[];
  title: string;
  listId: string;
  ariaLabel: string;
  modalSubtitle: string;
  itemNameLabel: string;
  itemPlaceholder: string;
  emptyLabel: string;
  saveStatus: SaveStatusReporter;
  actions?: React.ReactNode;
  onSaveItems: (updatedItems: string[], shouldRefresh: boolean, change: InventoryListChange) => Promise<boolean>;
};

export type InventoryListChange =
  | { type: "add"; name: string }
  | { type: "rename"; index: number; name: string }
  | { type: "delete"; index: number }
  | { type: "reorder"; fromIndex: number; toIndex: number };

export default function InventoryList({
  items = [],
  title,
  listId,
  ariaLabel,
  modalSubtitle,
  itemNameLabel,
  itemPlaceholder,
  emptyLabel,
  saveStatus,
  actions,
  onSaveItems,
}: InventoryListProps) {
  const { t } = useTranslation();
  const modalRef = React.useRef<ModalHandle>(null);
  const dragIndexRef = React.useRef<number | null>(null);
  const { markUnsaved } = saveStatus;
  const [itemsList, setItemsList] = React.useState<string[]>(items);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [paginationEnabled, setPaginationEnabled] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [draggingIdx, setDraggingIdx] = React.useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = React.useState<number | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(itemsList.length / INVENTORY_ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, pageCount - 1);
  const pageStart = paginationEnabled ? activePage * INVENTORY_ITEMS_PER_PAGE : 0;
  const canReorder = !paginationEnabled || pageCount === 1;

  const visibleItems = React.useMemo<VisibleInventoryItem[]>(() => {
    const pageItems = paginationEnabled
      ? itemsList.slice(pageStart, pageStart + INVENTORY_ITEMS_PER_PAGE)
      : itemsList;

    return pageItems.map((item, index) => ({
      item,
      index: pageStart + index,
    }));
  }, [itemsList, pageStart, paginationEnabled]);

  React.useEffect(() => {
    setItemsList(items);
  }, [items]);

  React.useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount - 1));
  }, [pageCount]);

  const closeAddModal = () => {
    setIsAddOpen(false);
    modalRef.current?.close();
  };

  const resetDragState = () => {
    dragIndexRef.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const saveItems = async (updatedItems: string[], shouldRefresh: boolean, change: InventoryListChange) => {
    const saved = await onSaveItems(updatedItems, shouldRefresh, change);
    setSaveError(saved ? null : t("characterCard.save.failed"));
    return saved;
  };

  const setLastPage = (itemCount: number) => {
    setCurrentPage(Math.max(0, Math.ceil(itemCount / INVENTORY_ITEMS_PER_PAGE) - 1));
  };

  const onDragStart = (event: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDraggingIdx(index);
    event.dataTransfer.effectAllowed = "move";

    try {
      event.dataTransfer.setData("text/plain", String(index));
    } catch {
      return;
    }
  };

  const onDragOverItem = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== index) setDragOverIdx(index);
  };

  const onDropItem = async (event: React.DragEvent, index: number) => {
    event.preventDefault();

    const rawSource = event.dataTransfer.getData("text/plain");
    const sourceIndex = dragIndexRef.current ?? Number(rawSource);
    const isValidSource =
      Number.isInteger(sourceIndex) &&
      sourceIndex >= 0 &&
      sourceIndex < itemsList.length;

    if (!isValidSource || sourceIndex === index) {
      resetDragState();
      return;
    }

    const updatedItems = [...itemsList];
    const [movedItem] = updatedItems.splice(sourceIndex, 1);
    updatedItems.splice(index, 0, movedItem);

    markUnsaved();
    setItemsList(updatedItems);
    resetDragState();
    await saveItems(updatedItems, false, { type: "reorder", fromIndex: sourceIndex, toIndex: index });
  };

  const handleAddSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newItem = formData.get(`new-item-${listId}`)?.toString().trim();

    if (!newItem) return;

    const updatedItems = [...itemsList, newItem];
    markUnsaved();
    setItemsList(updatedItems);
    if (paginationEnabled) setLastPage(updatedItems.length);

    const saved = await saveItems(updatedItems, true, { type: "add", name: newItem });
    if (!saved) return;

    form.reset();
    closeAddModal();
  };

  const updateItemLabel = async (index: number, newName: string) => {
    const trimmedName = newName.trim();

    if (!trimmedName || itemsList[index] === trimmedName) return;

    const updatedItems = itemsList.map((item, itemIndex) =>
      itemIndex === index ? trimmedName : item
    );

    markUnsaved();
    setItemsList(updatedItems);
    await saveItems(updatedItems, true, { type: "rename", index, name: trimmedName });
  };

  const deleteItem = async (index: number) => {
    const updatedItems = itemsList.filter((_, itemIndex) => itemIndex !== index);

    markUnsaved();
    setItemsList(updatedItems);
    await saveItems(updatedItems, true, { type: "delete", index });
  };

  return (
    <section className="ccard-lists" aria-label={ariaLabel}>
      <div>
        <div className="ccard-invHeader">
          <h3 className="ccard-listTitle">{title}</h3>

          <div className="ccard-listActions">
            {actions}
            <button
              type="button"
              className="ccard-addItemBtn"
              aria-haspopup="dialog"
              onClick={() => modalRef.current?.open()}
            >
              + {t("characterCard.inventory.addItem")}
            </button>
          </div>
        </div>

        <div className="ccard-invControls">
          <button
            type="button"
            className={`ccard-pageToggle ${paginationEnabled ? "is-active" : ""}`}
            aria-pressed={paginationEnabled}
            title={paginationEnabled ? t("characterCard.inventory.disablePagination") : t("characterCard.inventory.enablePagination")}
            onClick={() => setPaginationEnabled((enabled) => !enabled)}
          >
            {paginationEnabled ? <List size={15} aria-hidden="true" /> : <Rows3 size={15} aria-hidden="true" />}
          </button>

          {paginationEnabled && itemsList.length > INVENTORY_ITEMS_PER_PAGE && (
            <div className="ccard-invPager" role="navigation" aria-label={t("characterCard.inventory.pagination")}>
              <button
                type="button"
                className="ccard-pageBtn"
                aria-label={t("characterCard.inventory.previousPage")}
                title={t("characterCard.inventory.previousPage")}
                onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                disabled={activePage === 0}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>

              <span className="ccard-pageStatus">
                {activePage + 1}/{pageCount}
              </span>

              <button
                type="button"
                className="ccard-pageBtn"
                aria-label={t("characterCard.inventory.nextPage")}
                title={t("characterCard.inventory.nextPage")}
                onClick={() => setCurrentPage((page) => Math.min(pageCount - 1, page + 1))}
                disabled={activePage >= pageCount - 1}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {saveError && <p className="ccard-invSaveError" role="status">{saveError}</p>}

        <ul className="ccard-list ccard-invList" role="list">
          {itemsList.length > 0 ? (
            visibleItems.map(({ item, index }) => (
              <InventoryItem
                key={`${item}-${index}`}
                name={item}
                onEditContent={(newName) => updateItemLabel(index, newName)}
                onDelete={() => deleteItem(index)}
                draggable={canReorder}
                onDragStart={(event) => onDragStart(event, index)}
                onDragOver={(event) => onDragOverItem(event, index)}
                onDrop={(event) => onDropItem(event, index)}
                onDragEnd={resetDragState}
                isDragging={draggingIdx === index}
                isDragOver={dragOverIdx === index}
              />
            ))
          ) : (
            <li className="ccard-listItem" aria-disabled>
              <em style={{ opacity: 0.7 }}>-- {emptyLabel} --</em>
            </li>
          )}
        </ul>
      </div>

      <Modal
        ref={modalRef}
        onOpen={() => setIsAddOpen(true)}
        onClose={() => setIsAddOpen(false)}
        title={t("characterCard.inventory.addItem")}
        subtitle={modalSubtitle}
        size="sm"
        align="center"
        panelClassName="notes-panel invAdd-panel"
        headerClassName="notes-header invAdd-header"
        titleClassName="notes-title invAdd-title"
        subtitleClassName="invAdd-subtitle"
        footerClassName="notes-actions"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="modal__content invAdd-content">
            <label htmlFor={`new-item-${listId}`} className="modal__label invAdd-label">
              {itemNameLabel}
            </label>

            <input
              type="text"
              id={`new-item-${listId}`}
              name={`new-item-${listId}`}
              className="modal__input invAdd-input"
              placeholder={itemPlaceholder}
              autoFocus
              required
              minLength={1}
              maxLength={50}
              disabled={!isAddOpen}
            />
          </div>

          <div className="modal__footer invAdd-footer">
            <button
              type="button"
              className="btn-add-item-footer"
              onClick={closeAddModal}
            >
              {t("common.actions.cancel")}
            </button>
            <button type="submit" className="btn-add-item-footer">
              {t("common.actions.add")}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
