import React from "react";
import { Check, FileText, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./notes.scss";
import { Modal, type ModalHandle } from "../../ui/modal/Modal";
import characterService from "../../../services/character.service";
import characterNotesService from "../../../services/character-notes.service";
import type { CharacterNoteDto } from "../../../types/api";
import type { SaveStatusReporter } from "../hooks/useSaveStatus";

const FALLBACK_NOTE_ID = -1;
const FALLBACK_NOTE_TITLE = "Notes";

type NotesProps = {
  slug: string;
  notes: string;
  noteTabs?: CharacterNoteDto[];
  variant?: "button" | "panel";
  saveStatus?: SaveStatusReporter;
  refresh?: () => void;
  editable?: boolean;
};

const sortTabs = (tabs: CharacterNoteDto[]) => (
  [...tabs].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
);

const normalizeTabs = (noteTabs: CharacterNoteDto[] | undefined, notes: string): CharacterNoteDto[] => {
  const sorted = sortTabs(noteTabs ?? []);
  if (sorted.length > 0) return sorted;

  return [{
    id: FALLBACK_NOTE_ID,
    characterId: 0,
    title: FALLBACK_NOTE_TITLE,
    content: notes ?? "",
    sortOrder: 0,
  }];
};

export const Notes: React.FC<NotesProps> = ({
  slug,
  notes,
  noteTabs,
  variant = "button",
  saveStatus,
  refresh,
  editable = false,
}) => {
  const { t } = useTranslation();
  const modalRef = React.useRef<ModalHandle>(null);
  const initialTabs = React.useMemo(() => normalizeTabs(noteTabs, notes), [noteTabs, notes]);
  const [tabs, setTabs] = React.useState<CharacterNoteDto[]>(initialTabs);
  const [activeId, setActiveId] = React.useState<number | null>(initialTabs[0]?.id ?? null);
  const [text, setText] = React.useState(initialTabs[0]?.content ?? "");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isEditorActive, setIsEditorActive] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [draggingId, setDraggingId] = React.useState<number | null>(null);
  const [dragOverId, setDragOverId] = React.useState<number | null>(null);
  const initialRef = React.useRef(initialTabs[0]?.content ?? "");
  const dragIndexRef = React.useRef<number | null>(null);
  const timer = React.useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeId) ?? tabs[0],
    [activeId, tabs],
  );

  const runSave = React.useCallback(async <T,>(operation: () => Promise<T>) => {
    if (saveStatus) return saveStatus.runSave(operation);
    return operation();
  }, [saveStatus]);

  const clearSaveTimer = React.useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const resetTabDrag = React.useCallback(() => {
    dragIndexRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  React.useEffect(() => {
    const nextTabs = normalizeTabs(noteTabs, notes);
    setTabs(nextTabs);
    setActiveId((currentId) => (
      nextTabs.some((tab) => tab.id === currentId) ? currentId : nextTabs[0]?.id ?? null
    ));
    setSaveError(null);
    setIsAdding(false);
    setEditingId(null);
  }, [slug, noteTabs, notes]);

  React.useEffect(() => {
    const nextText = activeTab?.content ?? "";
    setText(nextText);
    initialRef.current = nextText;
    clearSaveTimer();
  }, [activeTab?.content, activeTab?.id, clearSaveTimer]);

  React.useEffect(() => {
    return () => clearSaveTimer();
  }, [clearSaveTimer]);

  const saveTabContent = React.useCallback(
    async (tab: CharacterNoteDto, payload: string) => {
      if (!editable) return true;
      try {
        if (tab.id === FALLBACK_NOTE_ID) {
          await runSave(() => characterService.patch(slug, { notes: payload }));
          setTabs((currentTabs) => currentTabs.map((item) => (
            item.id === tab.id ? { ...item, content: payload } : item
          )));
        } else {
          const saved = await runSave(() => characterNotesService.patchNote(slug, tab.id, { content: payload }));
          setTabs((currentTabs) => currentTabs.map((item) => (
            item.id === saved.id ? saved : item
          )));
        }

        initialRef.current = payload;
        setSaveError(null);
        return true;
      } catch (e) {
        console.error("Failed to save notes:", e);
        setSaveError(t("characterCard.save.failed"));
        return false;
      }
    },
    [editable, runSave, slug, t],
  );

  const flushActiveNote = React.useCallback(async () => {
    clearSaveTimer();
    if (!editable) return true;
    if (!activeTab || text === initialRef.current) return true;
    return saveTabContent(activeTab, text);
  }, [activeTab, clearSaveTimer, editable, saveTabContent, text]);

  React.useEffect(() => {
    if (!editable || !isEditorActive || !activeTab) return;
    clearSaveTimer();

    timer.current = window.setTimeout(() => {
      if (text !== initialRef.current) {
        void saveTabContent(activeTab, text);
      }
    }, 800);

    return () => clearSaveTimer();
  }, [activeTab, clearSaveTimer, editable, isEditorActive, saveTabContent, text]);

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void flushActiveNote();
    }
  };

  const selectTab = async (tabId: number) => {
    if (tabId === activeId) return;
    await flushActiveNote();
    setActiveId(tabId);
  };

  const createTab: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!editable) return;
    const title = newTitle.trim();
    if (!title) return;

    await flushActiveNote();
    saveStatus?.markUnsaved();
    try {
      const created = await runSave(() => characterNotesService.createNote(slug, { title, content: "" }));
      setTabs((currentTabs) => sortTabs([...currentTabs.filter((tab) => tab.id !== FALLBACK_NOTE_ID), created]));
      setActiveId(created.id);
      setNewTitle("");
      setIsAdding(false);
      setSaveError(null);
      refresh?.();
    } catch (error) {
      console.error("Failed to create note tab:", error);
      setSaveError(t("characterCard.save.failed"));
    }
  };

  const saveTabTitle = async (tab: CharacterNoteDto) => {
    const title = editingTitle.trim();
    if (!editable) return;
    if (!title || title === tab.title) {
      setEditingId(null);
      setEditingTitle("");
      return;
    }

    if (tab.id === FALLBACK_NOTE_ID) {
      setEditingId(null);
      setEditingTitle("");
      return;
    }

    saveStatus?.markUnsaved();
    try {
      const updated = await runSave(() => characterNotesService.patchNote(slug, tab.id, { title }));
      setTabs((currentTabs) => sortTabs(currentTabs.map((item) => (
        item.id === updated.id ? updated : item
      ))));
      setEditingId(null);
      setEditingTitle("");
      setSaveError(null);
      refresh?.();
    } catch (error) {
      console.error("Failed to rename note tab:", error);
      setSaveError(t("characterCard.save.failed"));
    }
  };

  const deleteTab = async (tab: CharacterNoteDto) => {
    if (tabs.length <= 1 || tab.id === FALLBACK_NOTE_ID) return;
    if (!editable) return;
    const confirmed = window.confirm(t("characterCard.notes.confirmDeleteTab", { title: tab.title }));
    if (!confirmed) return;

    await flushActiveNote();
    const previousTabs = tabs;
    const tabIndex = tabs.findIndex((item) => item.id === tab.id);
    const nextTabs = tabs.filter((item) => item.id !== tab.id);
    saveStatus?.markUnsaved();
    setTabs(nextTabs);
    if (activeId === tab.id) {
      setActiveId(nextTabs[Math.max(0, tabIndex - 1)]?.id ?? nextTabs[0]?.id ?? null);
    }

    try {
      await runSave(() => characterNotesService.deleteNote(slug, tab.id));
      setSaveError(null);
      refresh?.();
    } catch (error) {
      console.error("Failed to delete note tab:", error);
      setTabs(previousTabs);
      setSaveError(t("characterCard.save.failed"));
    }
  };

  const reorderTabs = async (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= tabs.length || toIndex >= tabs.length) return;
    if (!editable) return;
    if (fromIndex === toIndex || tabs[fromIndex].id === FALLBACK_NOTE_ID) return;

    await flushActiveNote();
    const previousTabs = tabs;
    const reorderedTabs = [...tabs];
    const [movedTab] = reorderedTabs.splice(fromIndex, 1);
    reorderedTabs.splice(toIndex, 0, movedTab);
    const payload = reorderedTabs.map((tab, index) => ({ id: tab.id, sortOrder: index }));

    saveStatus?.markUnsaved();
    setTabs(reorderedTabs.map((tab, index) => ({ ...tab, sortOrder: index })));

    try {
      const saved = await runSave(() => characterNotesService.reorderNotes(slug, payload));
      setTabs(sortTabs(saved));
      setSaveError(null);
      refresh?.();
    } catch (error) {
      console.error("Failed to reorder note tabs:", error);
      setTabs(previousTabs);
      setSaveError(t("characterCard.save.failed"));
    } finally {
      resetTabDrag();
    }
  };

  const startTabDrag = (event: React.DragEvent, index: number) => {
    const tab = tabs[index];
    if (!editable) return;
    if (!tab || tab.id === FALLBACK_NOTE_ID || editingId === tab.id) return;

    dragIndexRef.current = index;
    setDraggingId(tab.id);
    event.dataTransfer.effectAllowed = "move";

    try {
      event.dataTransfer.setData("text/plain", String(index));
    } catch {
      return;
    }
  };

  const dragOverTab = (event: React.DragEvent, index: number) => {
    if (dragIndexRef.current === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const tab = tabs[index];
    if (tab && dragOverId !== tab.id) setDragOverId(tab.id);
  };

  const dropTab = async (event: React.DragEvent, index: number) => {
    event.preventDefault();

    const rawSource = event.dataTransfer.getData("text/plain");
    const sourceIndex = dragIndexRef.current ?? Number(rawSource);
    const isValidSource =
      Number.isInteger(sourceIndex) &&
      sourceIndex >= 0 &&
      sourceIndex < tabs.length;

    if (!isValidSource || sourceIndex === index) {
      resetTabDrag();
      return;
    }

    await reorderTabs(sourceIndex, index);
  };

  const beginRename = (tab: CharacterNoteDto) => {
    setEditingId(tab.id);
    setEditingTitle(tab.title);
  };

  const tabControls = (
    <div className="notes-tabs" role="tablist" aria-label={t("characterCard.notes.tabs")}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab?.id;
        const isEditing = editingId === tab.id;
        const isPersisted = tab.id !== FALLBACK_NOTE_ID;
        const isDragging = draggingId === tab.id;
        const isDragOver = dragOverId === tab.id;

        return (
          <div
            key={tab.id}
            className={`notes-tabItem ${isActive ? "is-active" : ""} ${isDragging ? "is-dragging" : ""} ${isDragOver ? "is-drag-over" : ""}`}
            onDragOver={(event) => dragOverTab(event, index)}
            onDrop={(event) => void dropTab(event, index)}
            onDragEnd={resetTabDrag}
          >
            {isEditing ? (
              <form
                className="notes-renameForm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveTabTitle(tab);
                }}
              >
                <input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onBlur={() => void saveTabTitle(tab)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setEditingId(null);
                      setEditingTitle("");
                    }
                  }}
                  maxLength={100}
                  autoFocus
                />
                <button type="submit" title={t("common.actions.save")} aria-label={t("common.actions.save")}>
                  <Check size={14} aria-hidden="true" />
                </button>
              </form>
            ) : (
              <>
                {editable && isPersisted && (
                  <span
                    className="notes-tabGrip"
                    draggable
                    title={t("characterCard.notes.reorderTab")}
                    aria-label={t("characterCard.notes.reorderTab")}
                    role="button"
                    tabIndex={0}
                    onDragStart={(event) => startTabDrag(event, index)}
                  >
                    <GripVertical size={13} aria-hidden="true" />
                  </span>
                )}
                <button
                  type="button"
                  className="notes-tab"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => void selectTab(tab.id)}
                  title={tab.title}
                >
                  <span>{tab.title}</span>
                </button>
                {editable && (
                  <div className="notes-tabActions">
                    <button
                      type="button"
                      title={t("characterCard.notes.renameTab")}
                      aria-label={t("characterCard.notes.renameTab")}
                      disabled={!isPersisted}
                      onClick={() => beginRename(tab)}
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={t("characterCard.notes.deleteTab")}
                      aria-label={t("characterCard.notes.deleteTab")}
                      disabled={!isPersisted || tabs.length <= 1}
                      onClick={() => void deleteTab(tab)}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {editable && isAdding ? (
        <form className="notes-addForm" onSubmit={createTab}>
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder={t("characterCard.notes.newTabTitle")}
            maxLength={100}
            autoFocus
          />
          <button type="submit" title={t("common.actions.create")} aria-label={t("common.actions.create")}>
            <Check size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            title={t("common.actions.cancel")}
            aria-label={t("common.actions.cancel")}
            onClick={() => {
              setIsAdding(false);
              setNewTitle("");
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </form>
      ) : editable ? (
        <button
          type="button"
          className="notes-addTab"
          title={t("characterCard.notes.addTab")}
          aria-label={t("characterCard.notes.addTab")}
          onClick={() => setIsAdding(true)}
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );

  const editor = (
    <div className="notes-moduleEditor">
      {tabControls}
      <textarea
        className={`notes-textarea ${variant === "panel" ? "notes-textarea--module" : ""}`}
        placeholder={t("characterCard.notes.placeholder")}
        value={text}
        readOnly={!editable}
        aria-label={activeTab ? t("characterCard.notes.editorLabel", { title: activeTab.title }) : t("characterCard.notes.title")}
        onFocus={() => setIsEditorActive(true)}
        onBlur={() => {
          setIsEditorActive(false);
          void flushActiveNote();
        }}
        onChange={(e) => {
          if (!editable) return;
          saveStatus?.markUnsaved();
          setText(e.target.value);
        }}
        onKeyDown={onEditorKeyDown}
      />
      {saveError && <p className="notes-saveError" role="status">{saveError}</p>}
    </div>
  );

  const modalId = `notes-${slug}`;
  const titleId = `notes-title-${slug}`;

  if (variant === "panel") {
    return editor;
  }

  return (
    <>
      <button
        type="button"
        className="btn notes-open"
        title={t("characterCard.modules.notes")}
        aria-haspopup="dialog"
        aria-controls={modalId}
        aria-label={t("characterCard.notes.open")}
        onClick={() => modalRef.current?.open()}
      >
        <FileText size={17} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <Modal
        ref={modalRef}
        id={modalId}
        labelledBy={titleId}
        title={t("characterCard.notes.title")}
        headerClassName="notes-header"
        titleClassName="notes-title"
        size="lg"
        showCloseButton
        ariaLabel={t("characterCard.notes.title")}
        closeOnBackdrop
        onOpen={() => setIsEditorActive(true)}
        onClose={() => {
          setIsEditorActive(false);
          void flushActiveNote();
        }}
        panelClassName="notes-panel"
      >
        {editor}
      </Modal>
    </>
  );
};

export default Notes;
