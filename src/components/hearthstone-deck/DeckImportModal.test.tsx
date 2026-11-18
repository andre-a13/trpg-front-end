import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import i18n from "../../config/i18n";
import type { DeckImportPreviewResponse, HearthstoneCardResponse } from "../../api/generated/types.gen";
import DeckImportModal from "./DeckImportModal";
import { pendingRowsCsv } from "./deck-import-utils";

const api = vi.hoisted(() => ({ previewImport: vi.fn(), commitImport: vi.fn(), searchCards: vi.fn() }));
vi.mock("../../services/hearthstone-deck.service", () => ({ default: api }));

const card: HearthstoneCardResponse = {
  id: "CS2_029", name: "Boule de feu", cost: 4, attack: null, health: null, durability: null,
  text: "Inflige 6 points de dégâts.", cardType: "SPELL", rarity: "FREE", cardClass: "MAGE",
  tribe: null, spellSchool: null, cardSet: "CORE", cardSetName: "Fondamental", illustrationUrl: "https://example.com/card.webp", renderUrl: "https://example.com/card.png",
};
const preview: DeckImportPreviewResponse = {
  revision: 7, totalCount: 3, goldenCount: 2, rows: [
    { rowNumber: 2, rawName: "Boule de feu", rawValues: [], status: "matched", selectedCardId: card.id, candidates: [card],
      source: { rowNumber: 2, name: "Boule de feu", quantity: 1, isGolden: false, cost: 1, text: "Effet JDR" } },
    { rowNumber: 3, rawName: "Une variante", rawValues: [], status: "suggested", selectedCardId: null, candidates: [card],
      source: { rowNumber: 3, name: "Une variante", quantity: 1, isGolden: true, text: "Autre effet" } },
    { rowNumber: 4, rawName: "Givrix", rawValues: [], status: "missing", selectedCardId: null, candidates: [],
      source: { rowNumber: 4, name: "Givrix", quantity: 1, isGolden: true, cost: 3, attack: 3, health: 3, text: "Revient dans le deck" } },
  ],
};

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("fr");
  api.previewImport.mockResolvedValue(preview);
  api.commitImport.mockResolvedValue({ counts: { total: 2 } });
});

async function loadFile() {
  const input = screen.getByLabelText(/Choisir le fichier du deck/);
  fireEvent.change(input, { target: { files: [new File(["Boule de feu;1"], "deck.csv", { type: "text/csv" })] } });
  await screen.findByText("Givrix");
}

it("preselects exact links, requires choosing suggestions, preserves sheet data and prevents replay", async () => {
  const imported = vi.fn();
  render(<DeckImportModal slug="hero" onClose={vi.fn()} onImported={imported} />);
  await loadFile();
  expect(screen.getByLabelText("Carte du catalogue à relier", { selector: "select#import-link-2" })).toHaveValue(card.id);
  expect(document.querySelector("#import-link-3")).toHaveValue("");
  fireEvent.change(document.querySelector("#import-link-3")!, { target: { value: card.id } });
  fireEvent.click(screen.getByRole("button", { name: "Ajouter 2 exemplaire(s) au deck" }));
  await screen.findByText("2 exemplaire(s) ajouté(s), dont 1 doré(s)");
  expect(api.commitImport).toHaveBeenCalledWith("hero", { expectedRevision: 7, selections: [
    { source: preview.rows[0].source, sourceCardId: card.id }, { source: preview.rows[1].source, sourceCardId: card.id },
  ] });
  expect(imported).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: /Ajouter .* au deck/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Exporter les cartes en attente" })).toBeInTheDocument();
});

it("keeps pending golden card quantities and effects in a reusable CSV", () => {
  const csv = pendingRowsCsv([preview.rows[2]]);
  expect(csv).toContain('"Givrix";"1";"";"3";"3/3";"Revient dans le deck";"";"Oui"');
  expect(csv).toContain('"Dorée"');
  expect(pendingRowsCsv([{ ...preview.rows[2], source: null, rawValues: ["=DANGER", "2"] }])).toContain('"\'=DANGER";"2"');
});

it("shows a conflict without claiming success or losing unresolved rows", async () => {
  const imported = vi.fn();
  api.commitImport.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
  render(<DeckImportModal slug="hero" onClose={vi.fn()} onImported={imported} />);
  await loadFile();
  fireEvent.click(screen.getByRole("button", { name: "Ajouter 1 exemplaire(s) au deck" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Le deck a changé depuis l’aperçu");
  expect(imported).not.toHaveBeenCalled();
  expect(screen.getByText("Givrix")).toBeInTheDocument();
});

it("rejects unsupported files before contacting the API", async () => {
  render(<DeckImportModal slug="hero" onClose={vi.fn()} onImported={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/Choisir le fichier du deck/), {
    target: { files: [new File(["x"], "deck.pdf")] },
  });
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Choisissez un fichier"));
  expect(api.previewImport).not.toHaveBeenCalled();
});
