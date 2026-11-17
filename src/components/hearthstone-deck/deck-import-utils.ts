import type { DeckImportPreviewRow } from "../../api/generated/types.gen";

export function pendingRowsCsv(rows: DeckImportPreviewRow[]): string {
  const quote = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    // Keep downloaded text inert when opened in spreadsheet applications.
    return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
  };
  const header = ["Carte (FR)", "Quantité", "Type", "Coût", "Stats (ATQ/PV)", "Effet (résumé)", "Illustration", "Dorée"];
  const data = rows.map(row => {
    const source = row.source;
    if (!source) return row.rawValues;
    return [source?.name ?? row.rawName, source?.quantity ?? "", source?.cardType, source?.cost,
      source?.attack != null ? `${source.attack}/${source.health}` : "", source?.text, source?.illustrationUrl, source?.isGolden ? "Oui" : "Non"];
  });
  return "\uFEFF" + [header, ...data].map(row => row.map(quote).join(";")).join("\r\n") + "\r\n";
}

export function downloadPendingRows(rows: DeckImportPreviewRow[]) {
  const url = URL.createObjectURL(new Blob([pendingRowsCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "cartes-a-recreer.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
