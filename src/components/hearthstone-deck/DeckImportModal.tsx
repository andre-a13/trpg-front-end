import { useState } from "react";
import { Download, FileUp, Search } from "lucide-react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import type { DeckImportPreviewResponse, DeckImportSelection, HearthstoneCardResponse } from "../../api/generated/types.gen";
import type { DeckStateDto } from "../../types/api";
import service from "../../services/hearthstone-deck.service";
import Modal from "../ui/modal/Modal";
import { downloadPendingRows } from "./deck-import-utils";
import "./deck-import.scss";

type Props = { slug: string; onClose: () => void; onImported: (state: DeckStateDto) => void };

function base64File(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export default function DeckImportModal({ slug, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<DeckImportPreviewResponse | null>(null);
  const [links, setLinks] = useState<Record<number, string>>({});
  const [extraCards, setExtraCards] = useState<Record<number, HearthstoneCardResponse[]>>({});
  const [queries, setQueries] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [filename, setFilename] = useState("");

  function failure(caught: unknown) {
    const status = axios.isAxiosError(caught) ? caught.response?.status : undefined;
    setError(t(`hearthstomancer.import.${status === 409 ? "conflict" : status === 403 ? "forbidden" : "failed"}`));
  }

  async function chooseFile(file?: File) {
    setPreview(null);
    setLinks({});
    setExtraCards({});
    setQueries({});
    setCompleted(false);
    setError("");
    setFilename(file?.name ?? "");
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name)) {
      setError(t("hearthstomancer.import.fileError"));
      return;
    }
    setBusy(true);
    try {
      const result = await service.previewImport(slug, { filename: file.name, contentBase64: await base64File(file) });
      setPreview(result);
      setLinks(Object.fromEntries(result.rows.filter(row => row.selectedCardId).map(row => [row.rowNumber, row.selectedCardId!])));
    } catch (caught) { failure(caught); }
    finally { setBusy(false); }
  }

  async function search(rowNumber: number) {
    const query = queries[rowNumber]?.trim();
    if (!query) return;
    setBusy(true);
    setError("");
    try {
      const result = await service.searchCards(query, 1, 20);
      setExtraCards(current => ({ ...current, [rowNumber]: result.items }));
    } catch (caught) { failure(caught); }
    finally { setBusy(false); }
  }

  const selections: DeckImportSelection[] = preview?.rows.flatMap(row =>
    row.source && links[row.rowNumber] ? [{ source: row.source, sourceCardId: links[row.rowNumber] }] : [],
  ) ?? [];
  const pending = preview?.rows.filter(row => !row.source || !links[row.rowNumber]) ?? [];
  const selectedCount = selections.reduce((sum, row) => sum + (row.source.quantity ?? 1), 0);
  const selectedGolden = selections.reduce((sum, row) => sum + (row.source.isGolden ? row.source.quantity ?? 1 : 0), 0);

  async function commit() {
    if (!preview || completed || !selections.length) return;
    setBusy(true);
    setError("");
    try {
      const deck = await service.commitImport(slug, { expectedRevision: preview.revision, selections });
      setCompleted(true);
      onImported(deck);
    } catch (caught) { failure(caught); }
    finally { setBusy(false); }
  }

  return (
    <Modal initialOpen title={t("hearthstomancer.import.title")} size="xl" onClose={onClose}
      closeOnBackdrop={!busy} closeOnEsc={!busy} showCloseButton={!busy} panelClassName="hs-importModal"
      footer={preview ? <div className="hs-import__actions">
        {pending.length > 0 && <button type="button" disabled={busy} onClick={() => downloadPendingRows(pending)}>
          <Download size={16} /> {t("hearthstomancer.import.downloadPending")}
        </button>}
        {!completed && <button className="hs-import__submit" type="button" disabled={busy || !selections.length || preview.rows.some(row => row.status === "invalid")}
          onClick={() => void commit()}>{t("hearthstomancer.import.submit", { count: selectedCount })}</button>}
        <button type="button" disabled={busy} onClick={onClose}>{t("common.actions.close")}</button>
      </div> : undefined}>
      <div className="hs-import" aria-busy={busy}>
        <p>{t("hearthstomancer.import.help")}</p>
        <label className="hs-import__file">
          <FileUp size={22} aria-hidden="true" />
          <span>{t("hearthstomancer.import.chooseFile")}</span>
          <input type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => void chooseFile(event.target.files?.[0])} />
        </label>
        {filename && <p className="hs-import__filename">{filename}</p>}
        {busy && <p role="status">{t("common.loading")}</p>}
        {error && <p className="hs-import__error" role="alert">{error}</p>}
        {preview && <>
          <div className="hs-import__summary" aria-live="polite">
            <strong>{t(completed ? "hearthstomancer.import.completed" : "hearthstomancer.import.summary", { count: selectedCount, golden: selectedGolden })}</strong>
            <span>{t("hearthstomancer.import.pending", { count: pending.length })}</span>
          </div>
          <p>{t("hearthstomancer.import.preserve")}</p>
          <div className="hs-import__rows">
            {preview.rows.map(row => {
              const candidates = [...row.candidates, ...(extraCards[row.rowNumber] ?? [])]
                .filter((card, index, all) => all.findIndex(other => other.id === card.id) === index);
              const chosen = candidates.find(card => card.id === links[row.rowNumber]);
              return <article className={`hs-import__row ${row.source?.isGolden ? "is-golden" : ""}`} key={row.rowNumber}>
                <div className="hs-import__source">
                  <small>{t("hearthstomancer.import.row", { number: row.rowNumber })}</small>
                  <strong>{row.rawName}</strong>
                  {row.source && <span>{t(row.source.isGolden ? "hearthstomancer.counts.golden" : "hearthstomancer.counts.normal", { count: row.source.quantity })}</span>}
                  {row.source && <p>{row.source.cost != null && `${t("hearthstomancer.import.cost")}: ${row.source.cost}. `}
                    {row.source.attack != null && `${row.source.attack}/${row.source.health}. `}{row.source.text}</p>}
                </div>
                {row.source ? <div className="hs-import__match">
                  <label htmlFor={`import-link-${row.rowNumber}`}>{t("hearthstomancer.import.link")}</label>
                  <select id={`import-link-${row.rowNumber}`} value={links[row.rowNumber] ?? ""} disabled={busy || completed}
                    onChange={event => setLinks(current => ({ ...current, [row.rowNumber]: event.target.value }))}>
                    <option value="">{t("hearthstomancer.import.leavePending")}</option>
                    {candidates.map(card => <option value={card.id} key={card.id}>{card.name} · {card.cardSetName}</option>)}
                  </select>
                  <span className={chosen ? "hs-import__linked" : "hs-import__pending"}>
                    {t(`hearthstomancer.import.${chosen ? "linked" : row.status === "missing" ? "missing" : "needsChoice"}`)}
                  </span>
                  {chosen && <details><summary>{t("hearthstomancer.import.catalogueDetails")}</summary>
                    <p>{chosen.name} · {chosen.cardSetName} · {chosen.cost ?? "—"} mana</p><p>{chosen.text}</p>
                  </details>}
                  {!completed && <form className="hs-import__search" onSubmit={event => { event.preventDefault(); void search(row.rowNumber); }}>
                    <input aria-label={t("hearthstomancer.import.searchFor", { name: row.rawName })}
                      placeholder={t("hearthstomancer.import.search")}
                      value={queries[row.rowNumber] ?? ""} disabled={busy}
                      onChange={event => setQueries(current => ({ ...current, [row.rowNumber]: event.target.value }))} />
                    <button type="submit" disabled={busy || !queries[row.rowNumber]?.trim()} aria-label={t("hearthstomancer.import.search")}><Search size={16} /></button>
                  </form>}
                </div> : <p role="alert" className="hs-import__error">{row.error}</p>}
              </article>;
            })}
          </div>
        </>}
      </div>
    </Modal>
  );
}
