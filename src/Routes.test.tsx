import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AppRoutes from "./Routes";
import i18n from "./config/i18n";
import Character from "./models/character";
import type { LightBookResponse } from "./api/generated/types.gen";
import { authDestination, characterPath, characterToolReturn, withOrigin } from "./components/navigation/navigationPaths";
import type { CharacterDto, UserRole } from "./types/api";

const api = vi.hoisted(() => ({
  user: null as { id: number; username: string; role: UserRole } | null,
  manage: false,
  login: vi.fn(), logout: vi.fn(), register: vi.fn(), setManage: vi.fn(),
  getCharacter: vi.fn(), listCharacters: vi.fn(), createCharacter: vi.fn(),
  teams: vi.fn(), team: vi.fn(), createTeam: vi.fn(), deck: vi.fn(), book: vi.fn(), words: vi.fn(),
  accounts: vi.fn(), inventions: vi.fn(), bookSettings: vi.fn(),
}));

vi.mock("./auth/useAuth", () => ({ useAuth: () => ({
  user: api.user, isAuthenticated: !!api.user, isInitializing: false,
  login: api.login, logout: api.logout, register: api.register,
}) }));
vi.mock("./admin/useAdminControls", () => ({ useAdminControls: () => ({
  isAdmin: api.user?.role === "admin", manageCharactersEnabled: api.manage, setManageCharactersEnabled: api.setManage,
}) }));
vi.mock("./services/character.service", () => ({ default: { getBySlug: api.getCharacter, list: api.listCharacters, listAll: api.listCharacters, create: api.createCharacter } }));
vi.mock("./services/team.service", () => ({ default: { list: api.teams, getByUuid: api.team, create: api.createTeam } }));
vi.mock("./services/hearthstone-deck.service", () => ({ default: { getDeck: api.deck } }));
vi.mock("./services/light-book.service", () => ({ default: { get: api.book, listWords: api.words, listSettings: api.bookSettings } }));
vi.mock("./services/account.service", () => ({ default: { list: api.accounts } }));
vi.mock("./services/invention.service", () => ({ default: { list: api.inventions } }));
vi.mock("./api/generated/sdk.gen", async (importOriginal) => ({
  ...await importOriginal<typeof import("./api/generated/sdk.gen")>(),
  systemHealth: vi.fn().mockResolvedValue({ data: { ok: true } }),
}));

const player = { id: 1, username: "player", role: "player" } as const;
const admin = { id: 2, username: "mj", role: "admin" } as const;
const dawn = { id: 1, name: "Aurore", description: "Une lueur." };
const member = { id: 1, slug: "aria", name: "Aria", race: "Elfe", ownerUserId: player.id, portraitUrl: null, current_hp: 12, max_hp: 15 };
const company = { uuid: "origin-team", name: "Les Veilleurs", illustrationUrl: null, characters: [member] };
const heroData: CharacterDto = {
  ...member, backgroundUrl: null, bonusHealth: 0, gold: 0, notes: null, ownerUsername: player.username,
  stats: { corps: 50, mental: 50, social: 50 }, skillsPrimary: [], skillsSecondary: [], inventory: [], invengineerEnabled: false,
  teams: [{ uuid: "first-team", name: "Autre compagnie", illustrationUrl: null }, company],
  hearthstomancer: { configured: true, enabled: true },
};
const hero = new Character(heroData);

function LocationProbe() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="route">{`${pathname}${search}${hash}`}</output>;
}

function visit(path: string) {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /><LocationProbe /></MemoryRouter>);
}

function pageLink(name: string) {
  return within(screen.getByRole("navigation", { name: "Navigation de la page" })).getByRole("link", { name });
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  localStorage.clear();
  api.user = player;
  api.manage = false;
  api.login.mockImplementation(async () => { api.user = player; });
  api.getCharacter.mockResolvedValue(hero);
  api.listCharacters.mockResolvedValue([hero]);
  api.teams.mockResolvedValue([company]);
  api.team.mockResolvedValue(company);
  api.deck.mockResolvedValue({ configured: true, enabled: true, revision: 0, counts: { total: 0, remaining: 0, drawn: 0 }, definitions: [], drawnCards: [], undoablePlay: null, permissions: { canManage: false, canActivate: false } });
  api.book.mockResolvedValue({ slotCount: 3, words: [dawn] });
  api.words.mockResolvedValue([dawn]);
  api.accounts.mockResolvedValue([]);
  api.inventions.mockResolvedValue([]);
  api.bookSettings.mockResolvedValue({});
  await i18n.changeLanguage("fr");
});

afterEach(() => vi.restoreAllMocks());

it("returns from the selected word to the exact character module and the originating company", async () => {
  visit(`/teams/${company.uuid}`);
  fireEvent.click(await screen.findByRole("link", { name: "Aria" }));
  fireEvent.click(await screen.findByRole("link", { name: "Aurore" }));
  expect(await screen.findByText("Une lueur.")).toBeVisible();
  expect(screen.queryByRole("navigation", { name: "Navigation JDR" })).not.toBeInTheDocument();
  const sheet = characterPath("aria", `/teams/${company.uuid}`, "light-book");
  expect(pageLink("Retour à la fiche")).toHaveAttribute("href", sheet);
  fireEvent.click(pageLink("Retour à la fiche"));
  await waitFor(() => expect(document.activeElement).toHaveAttribute("id", "light-book"));
  expect(screen.getByTestId("route")).toHaveTextContent(sheet);
  fireEvent.click(pageLink("Retour à la compagnie"));
  expect(await screen.findByRole("heading", { name: company.name })).toBeVisible();
  expect(screen.getByTestId("route")).toHaveTextContent(`/teams/${company.uuid}`);
});

it("lets the player open the deck from the sheet and return to the deck module", async () => {
  visit(characterPath("aria", `/teams/${company.uuid}`));
  const characterNavigation = screen.getByRole("navigation", { name: "Navigation de la page" });
  fireEvent.click(await within(characterNavigation).findByRole("link", { name: "Ouvrir le deck" }));
  const sheet = characterPath("aria", `/teams/${company.uuid}`, "deck");
  expect(pageLink("Retour à la fiche")).toHaveAttribute("href", sheet);
  fireEvent.click(pageLink("Retour à la fiche"));
  await waitFor(() => expect(document.activeElement).toHaveAttribute("id", "deck"));
  expect(pageLink("Retour à la compagnie")).toHaveAttribute("href", `/teams/${company.uuid}`);
});

it("recovers from a directly opened deck through the sheet when the deck is unavailable", async () => {
  api.deck.mockRejectedValue(new Error("offline"));
  visit("/characters/aria/deck");
  expect(pageLink("Retour à la fiche")).toHaveAttribute("href", "/characters/aria#deck");
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(pageLink("Retour à la fiche")).toHaveAttribute("href", "/characters/aria#deck");
  fireEvent.click(pageLink("Retour à la fiche"));
  const parent = await waitFor(() => pageLink("Retour à la compagnie"));
  expect(parent).toHaveAttribute("href", "/teams/first-team");
  fireEvent.click(parent);
  expect(pageLink("Revenir aux compagnies")).toHaveAttribute("href", "/teams");
});

it("preserves the requested word and character through login and the registration link", async () => {
  api.user = null;
  const target = withOrigin("/light-words?word=1", characterPath("aria", `/teams/${company.uuid}`));
  visit(target);
  fireEvent.click(await screen.findByRole("link", { name: "Créer un compte" }));
  fireEvent.click(await screen.findByRole("link", { name: "Connexion" }));
  fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: "player" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "mot-de-passe-local" } });
  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
  expect(await screen.findByText("Une lueur.")).toBeVisible();
  expect(pageLink("Retour à la fiche")).toHaveAttribute("href", characterPath("aria", `/teams/${company.uuid}`, "light-book"));
  expect(screen.getByTestId("route")).toHaveTextContent(target);
});

it("finds an unassigned character and returns to the same directory page", async () => {
  const unassigned = new Character({ ...heroData, teams: [] });
  api.getCharacter.mockResolvedValue(unassigned);
  api.listCharacters.mockResolvedValue([unassigned]);
  api.listCharacters.mockResolvedValueOnce(Array.from({ length: 25 }, (_, index) =>
    new Character({ ...heroData, id: 10 + index, slug: `hero-${index}`, name: `Héros ${index}`, teams: [] }),
  ));
  visit("/teams");
  fireEvent.click(await screen.findByRole("link", { name: "Personnages" }));
  fireEvent.click(await screen.findByRole("link", { name: "Suivant" }));
  fireEvent.click(await screen.findByRole("link", { name: "Aria" }));
  expect(pageLink("Retour aux personnages")).toHaveAttribute("href", "/characters?page=2");
  fireEvent.click(pageLink("Retour aux personnages"));
  expect(await screen.findByRole("link", { name: "Aria" })).toBeVisible();
  expect(api.listCharacters).toHaveBeenCalledWith({ limit: 25, offset: 24 });
  fireEvent.click(pageLink("Revenir aux compagnies"));
  expect(await screen.findByRole("heading", { name: "Compagnies" })).toBeVisible();
});

it("opens the Forge only from the character workflow and preserves its origin through the Printer", async () => {
  visit("/teams");
  fireEvent.click(await screen.findByRole("link", { name: company.name }));
  expect(await screen.findByRole("heading", { name: company.name })).toBeVisible();
  expect(screen.queryByRole("link", { name: /Forge|Atelier Hearthstone/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Aria" }));
  const banner = within(screen.getByRole("navigation", { name: "Navigation de la page" }));
  fireEvent.click(await banner.findByRole("link", { name: /^Forge$/ }));
  fireEvent.click(within(screen.getByRole("main")).getByRole("link", { name: "Imprimerie" }));
  expect(await screen.findByRole("heading", { name: "Impression Hearthstone" })).toBeVisible();
  fireEvent.click(within(screen.getByRole("main")).getByRole("link", { name: "Forge" }));
  expect(screen.getByTestId("route")).toHaveTextContent("/hearthstone-forge");
  const back = screen.getByRole("link", { name: "Retour à la fiche" });
  expect(back).toHaveAttribute("href", characterPath("aria", `/teams/${company.uuid}`, "deck"));
  fireEvent.click(back);
  await waitFor(() => expect(document.activeElement).toHaveAttribute("id", "deck"));
  expect(pageLink("Retour à la compagnie")).toHaveAttribute("href", `/teams/${company.uuid}`);
});

it("keeps the directory and home reachable when companies fail to load", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.teams.mockRejectedValue(new Error("offline"));
  visit("/teams");
  expect(await screen.findByRole("alert")).toHaveTextContent("Une erreur est survenue pendant le chargement des compagnies.");
  expect(screen.getByRole("link", { name: "Personnages" })).toHaveAttribute("href", "/characters");
  expect(screen.queryByRole("link", { name: /Forge|Atelier Hearthstone/ })).not.toBeInTheDocument();
  expect(pageLink("Revenir à l'accueil")).toHaveAttribute("href", "/");
});

it.each([true, false])("hides Forge and an empty Livre saint when Hearthstomancy is inactive (configured %s)", async (configured) => {
  api.getCharacter.mockResolvedValue(new Character({ ...heroData, hearthstomancer: { configured, enabled: false } }));
  api.book.mockResolvedValue({ slotCount: 0, words: [] });
  await act(async () => visit("/characters/aria"));
  expect(screen.getByRole("heading", { name: "Aria" })).toBeVisible();
  expect(api.book).toHaveBeenCalledOnce();
  expect(screen.queryByRole("link", { name: "Forge" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Mots de pouvoir" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Livre saint" })).not.toBeInTheDocument();
});

it("shows both shortcuts to the GM for an eligible character without sheet edit mode", async () => {
  api.user = admin;
  api.book.mockResolvedValue({ slotCount: 2, words: [] });
  await act(async () => visit("/characters/aria"));
  expect(pageLink("Forge")).toBeVisible();
  expect(pageLink("Mots de pouvoir")).toBeVisible();
  expect(screen.getByText("Aucun mot débloqué.")).toBeVisible();
});

it("checks the book before showing its link and preserves known words at zero slots", async () => {
  let complete!: (book: LightBookResponse) => void;
  api.book.mockReturnValue(new Promise<LightBookResponse>((resolve) => { complete = resolve; }));
  visit("/characters/aria");
  expect(await screen.findByRole("heading", { name: "Aria" })).toBeVisible();
  expect(screen.queryByRole("link", { name: "Mots de pouvoir" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Livre saint" })).not.toBeInTheDocument();
  complete({ slotCount: 0, words: [dawn] });
  expect(await screen.findByRole("link", { name: "Aurore" })).toBeVisible();
  expect(pageLink("Mots de pouvoir")).toBeVisible();
  expect(api.book).toHaveBeenCalledOnce();
});

it("keeps character-only shortcuts hidden when a teammate views an eligible character", async () => {
  api.user = { ...player, id: 3 };
  await act(async () => visit("/characters/aria"));
  expect(screen.getByRole("heading", { name: "Aria" })).toBeVisible();
  expect(pageLink("Ouvrir le deck")).toBeVisible();
  expect(screen.queryByRole("link", { name: "Forge" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Mots de pouvoir" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Livre saint" })).not.toBeInTheDocument();
  expect(api.book).not.toHaveBeenCalled();
});

it("retries an unavailable book before showing the shortcut and rejects a private result", async () => {
  api.book.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ slotCount: null, words: [] });
  visit("/characters/aria");
  const retry = await screen.findByRole("button", { name: /Livre saint.*Réessayer/ });
  expect(screen.queryByRole("link", { name: "Mots de pouvoir" })).not.toBeInTheDocument();
  await act(async () => fireEvent.click(retry));
  expect(api.book).toHaveBeenCalledTimes(2);
  expect(retry).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Mots de pouvoir" })).not.toBeInTheDocument();
});

it("provides a recovery route for unknown pages and hides admin destinations from players", async () => {
  visit("/page/inconnue");
  expect(screen.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Revenir aux compagnies" }));
  expect(await screen.findByRole("heading", { name: "Compagnies" })).toBeVisible();
});

it("links admin creation forms back to the dashboard even before saving", async () => {
  api.user = admin;
  api.manage = true;
  visit("/dashboard");
  fireEvent.click(screen.getByRole("link", { name: "Nouveau personnage" }));
  expect(screen.getByRole("heading", { name: "Créer un personnage" })).toBeVisible();
  fireEvent.click(pageLink("Retour au dashboard"));
  fireEvent.click(screen.getByRole("link", { name: "Nouvelle compagnie" }));
  expect(screen.getByRole("heading", { name: "Créer une compagnie" })).toBeVisible();
  expect(pageLink("Retour au dashboard")).toHaveAttribute("href", "/dashboard");
  fireEvent.click(pageLink("Retour au dashboard"));
  fireEvent.click(screen.getByRole("link", { name: "Revenir à l'accueil" }));
  expect(screen.getByRole("link", { name: "Dashboard" })).toBeVisible();
});

it("opens the created team in context and lets the MJ start another form", async () => {
  api.user = admin;
  api.manage = true;
  api.createTeam.mockResolvedValue({ data: company });
  visit(withOrigin("/teams/create", "/dashboard"));
  const name = screen.getByLabelText("Nom", { exact: true });
  fireEvent.change(name, { target: { value: company.name } });
  fireEvent.click(screen.getByRole("button", { name: "Créer" }));
  const open = await screen.findByRole("link", { name: "Ouvrir la compagnie" });
  expect(open).toHaveAttribute("href", withOrigin(`/teams/${company.uuid}`, "/dashboard"));
  fireEvent.click(screen.getByRole("button", { name: "En créer une autre" }));
  expect(name).toHaveFocus();
  expect(screen.queryByRole("link", { name: "Ouvrir la compagnie" })).not.toBeInTheDocument();
});

it("returns from the standalone catalogue to the portal where the player can sign out", async () => {
  api.logout.mockImplementation(async () => { api.user = null; });
  visit("/light-words");
  fireEvent.click(pageLink("Revenir à l'accueil"));
  fireEvent.click(screen.getByRole("button", { name: "Se déconnecter — player" }));
  await waitFor(() => expect(screen.getByTestId("route").textContent).toBe("/"));
  expect(api.logout).toHaveBeenCalledOnce();
  expect(await screen.findByRole("link", { name: "Créer un compte" })).toBeVisible();
});

it("rejects external return destinations and a deck return for a different character", () => {
  expect(authDestination("https://elsewhere.example/path")).toBe("/teams");
  expect(authDestination("/register/?next=/login")).toBe("/teams");
  expect(characterToolReturn("?from=%2Fcharacters%2Faria", false, "deck", "borin")).toBeNull();
});

it("preserves a legacy character slug in the return from character tools", () => {
  const sheet = characterPath("Éclat ancien", "/characters?page=2");
  const { search } = new URL(withOrigin("/light-words", sheet), "https://trpg.invalid");
  expect(characterToolReturn(search, false, "light-book")).toBe(`${sheet}#light-book`);
  expect(characterToolReturn(search, false, "deck", "Éclat ancien")).toBe(`${sheet}#deck`);
});
