import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import i18n from "../../config/i18n";
import LightBookModule from "./LightBookModule";
import LightWordsCatalogue from "./LightWordsCatalogue";

const api = vi.hoisted(() => ({
  role: "player",
  listWords: vi.fn(), createWord: vi.fn(), unlockWord: vi.fn(), characters: vi.fn(),
}));
vi.mock("../../auth/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: api.role } }) }));
vi.mock("../../services/light-book.service", () => ({ default: api }));
vi.mock("../../services/character.service", () => ({ default: { listAll: api.characters } }));

const dawn = { id: 1, name: "Aurore", description: "Une lueur." };
const guard = { id: 2, name: "Garde", description: "Une protection." };

beforeEach(async () => {
  vi.resetAllMocks();
  api.role = "player";
  await i18n.changeLanguage("fr");
});

function renderCatalogue(path = "/light-words") {
  render(<MemoryRouter initialEntries={[path]}><LightWordsCatalogue /></MemoryRouter>);
}

it("shows the word as a link with a hover definition and opens its exact catalogue page", async () => {
  api.listWords.mockResolvedValue([dawn, ...Array<null>(11).fill(null), guard]);
  render(
    <MemoryRouter initialEntries={["/characters/practitioner"]}>
      <Routes>
        <Route path="/characters/:slug" element={<LightBookModule book={{ slotCount: 3, words: [guard] }} sheetHref="/characters/practitioner" />} />
        <Route path="/light-words" element={<LightWordsCatalogue />} />
      </Routes>
    </MemoryRouter>,
  );
  const known = await screen.findByRole("list", { name: "Mots connus" });
  const link = within(known).getByRole("link", { name: "Garde" });
  expect(link).toHaveAttribute("title", guard.description);
  expect(link).toHaveAttribute("href", "/light-words?word=2&from=%2Fcharacters%2Fpractitioner");
  expect(screen.queryByText(guard.description)).not.toBeInTheDocument();
  expect(screen.queryByText(/emplacements connus/)).not.toBeInTheDocument();

  fireEvent.click(link);
  const page = await screen.findByRole("region", { name: "Page 4" });
  expect(within(page).getByRole("listitem")).toHaveAttribute("aria-current", "true");
  expect(within(page).getByText(guard.description)).toBeVisible();
  expect(screen.getByRole("link", { name: "Retour à la fiche" })).toHaveAttribute("href", "/characters/practitioner#light-book");
  expect(screen.queryByRole("region", { name: "Page 1" })).not.toBeInTheDocument();
});

it("opens the first spread when the requested word is unavailable to the player", async () => {
  api.listWords.mockResolvedValue([dawn, ...Array<null>(8).fill(null)]);
  renderCatalogue("/light-words?word=2");
  const page = await screen.findByRole("region", { name: "Page 1" });
  expect(within(page).getByText("Aurore")).toBeVisible();
  expect(page.querySelector("[aria-current]")).toBeNull();
});

it("preserves known words and masked slots at four entries per page", async () => {
  api.listWords.mockResolvedValue([dawn, null, null, null, null, guard, null, null, null]);
  renderCatalogue();

  const first = await screen.findByRole("region", { name: "Page 1" });
  const second = screen.getByRole("region", { name: "Page 2" });
  expect(within(first).getAllByRole("listitem")).toHaveLength(4);
  expect(within(second).getAllByRole("listitem")).toHaveLength(4);
  expect(within(first).getByText("Aurore")).toBeVisible();
  expect(within(second).getByText("Garde")).toBeVisible();
  expect(screen.getAllByText("???")).toHaveLength(6);
  expect(screen.queryByText("Gérer les mots de pouvoir")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
  expect(within(screen.getByRole("region", { name: "Page 3" })).getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Précédent" }));
  expect(screen.getByRole("region", { name: "Page 1" })).toBeVisible();
});

it("lets the MJ create a global word and unlock it for the chosen character", async () => {
  api.role = "admin";
  api.listWords.mockResolvedValue([]);
  api.characters.mockResolvedValue([{ id: 7, name: "Pratiquant", slug: "practitioner" }]);
  api.createWord.mockResolvedValue(dawn);
  api.unlockWord.mockResolvedValue(undefined);
  renderCatalogue();

  fireEvent.click(await screen.findByText("Gérer les mots de pouvoir"));
  fireEvent.change(screen.getByLabelText("Mot de pouvoir", { selector: "input" }), { target: { value: dawn.name } });
  fireEvent.click(screen.getByRole("button", { name: "Créer le mot" }));
  expect(await screen.findByText("Mot créé dans le catalogue.")).toBeVisible();
  expect(within(screen.getByRole("region", { name: "Page 1" })).getByText("Aurore")).toBeVisible();
  await screen.findByRole("option", { name: "Pratiquant" });
  fireEvent.change(screen.getByLabelText("Personnage", { selector: "select", exact: true }), { target: { value: "practitioner" } });
  fireEvent.click(screen.getByRole("button", { name: "Débloquer pour ce personnage" }));
  expect(await screen.findByText("Mot débloqué pour ce personnage.")).toBeVisible();
  expect(api.unlockWord).toHaveBeenCalledWith("practitioner", dawn.id);
});
