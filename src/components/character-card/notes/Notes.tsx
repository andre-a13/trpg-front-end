import React from "react";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./notes.scss";
import { Modal, type ModalHandle } from "../../ui/modal/Modal";
import characterService from "../../../services/character.service";
import type { SaveStatusReporter } from "../hooks/useSaveStatus";

type NotesProps = {
  slug: string;
  notes: string;
  variant?: "button" | "panel";
  saveStatus?: SaveStatusReporter;
};

export const Notes: React.FC<NotesProps> = ({ slug, notes, variant = "button", saveStatus }) => {
  const { t } = useTranslation();
  const modalRef = React.useRef<ModalHandle>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [text, setText] = React.useState(notes ?? "");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const initialRef = React.useRef(notes ?? "");
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setText(notes ?? "");
    initialRef.current = notes ?? "";
    setSaveError(null);
  }, [slug, notes]);

  const save = React.useCallback(
    async (payload: string) => {
      try {
        if (saveStatus) {
          await saveStatus.runSave(() => characterService.patch(slug, { notes: payload }));
        } else {
          await characterService.patch(slug, { notes: payload });
        }
        initialRef.current = payload;
        setSaveError(null);
      } catch (e) {
        console.error("Failed to save notes:", e);
        setSaveError(t("characterCard.save.failed"));
      }
    },
    [saveStatus, slug, t]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(() => {
      if (text !== initialRef.current) save(text);
    }, 800) as unknown as number;

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [text, isOpen, save]);

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save(text);
    }
  };

  const modalId = `notes-${slug}`;
  const titleId = `notes-title-${slug}`;

  if (variant === "panel") {
    return (
      <div className="notes-moduleEditor">
        <textarea
          className="notes-textarea notes-textarea--module"
          placeholder={t("characterCard.notes.placeholder")}
          value={text}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setIsOpen(false);
            if (text !== initialRef.current) save(text);
          }}
          onChange={(e) => setText(e.target.value)}
          onInput={() => saveStatus?.markUnsaved()}
          onKeyDown={onEditorKeyDown}
        />
        {saveError && <p className="notes-saveError" role="status">{saveError}</p>}
      </div>
    );
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
        onOpen={() => setIsOpen(true)}
        onClose={() => {
          setIsOpen(false);
          if (text !== initialRef.current) save(text);
        }}
        panelClassName="notes-panel"
      >
        <textarea
          className="notes-textarea"
          placeholder={t("characterCard.notes.modalPlaceholder")}
          value={text}
          onChange={(e) => {
            saveStatus?.markUnsaved();
            setText(e.target.value);
          }}
          onKeyDown={onEditorKeyDown}
          autoFocus
        />
        {saveError && <p className="notes-saveError" role="status">{saveError}</p>}
      </Modal>
    </>
  );
};

export default Notes;
