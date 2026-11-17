import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import i18n from "../../../config/i18n";
import Home from "./Home";
import QuickDice from "./QuickDice";

const context = vi.hoisted(() => ({
  user: { id: 1, username: "gm", role: "admin" } as { id: number; username: string; role: string } | null,
  list: vi.fn(), health: vi.fn(), logout: vi.fn(),
}));
vi.mock("../../../auth/useAuth", () => ({ useAuth: () => ({ user: context.user, isAuthenticated: !!context.user, isInitializing: false, logout: context.logout }) }));
vi.mock("../../../services/team.service", () => ({ default: { list: context.list } }));
vi.mock("../../../api/generated/sdk.gen", () => ({ systemHealth: context.health }));

function renderHome() { return render(<MemoryRouter><Home /></MemoryRouter>); }
function mockRandom(...values: number[]) {
  let index = 0;
  return vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
    (array as Uint32Array)[0] = values[index++] ?? 0;
    return array;
  });
}
beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  context.user = { id: 1, username: "gm", role: "admin" };
  context.list.mockResolvedValue([]);
  context.health.mockResolvedValue({ data: { status: "ok" } });
  context.logout.mockResolvedValue(undefined);
  await i18n.changeLanguage("fr");
});

afterEach(() => vi.useRealTimers());

describe("portal home", () => {
  it("takes authenticated users into their companies and keeps account controls discreet", async () => {
    renderHome();
    expect(screen.getByRole("main", { name: "Table JDR" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrer dans le monde" })).toHaveAttribute("href", "/teams");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("button", { name: "Se déconnecter — gm" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Créer un compte" })).not.toBeInTheDocument();
    expect(context.list).not.toHaveBeenCalled();
    await screen.findByText("Serveur en ligne");
  });

  it("takes guests to login and preserves the registration entry", async () => {
    context.user = null;
    renderHome();
    expect(screen.getByRole("link", { name: "Entrer dans le monde" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/register");
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Se déconnecter/ })).not.toBeInTheDocument();
    expect(context.list).not.toHaveBeenCalled();
    await screen.findByText("Serveur en ligne");
  });

  it("does not turn the portal into a journal or a dashboard", async () => {
    const { container } = renderHome();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lancer le dé" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compagnies" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector(".home-explorer, .home-dice, #camp-explorer")).toBeNull();
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    expect(screen.queryByText("Table JDR")).not.toBeInTheDocument();
    expect(screen.queryByText("Vos aventures commencent de l’autre côté.")).not.toBeInTheDocument();
    expect(screen.queryByText("Bienvenue, gm.")).not.toBeInTheDocument();
    expect(container.querySelector(".language-switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Passer en anglais" })).not.toBeInTheDocument();
    expect(context.list).not.toHaveBeenCalled();
    await screen.findByText("Serveur en ligne");
  });

  it("keeps admin controls out of the player's entry screen", async () => {
    context.user = { id: 2, username: "player", role: "player" };
    renderHome();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrer dans le monde" })).toHaveAttribute("href", "/teams");
    await screen.findByText("Serveur en ligne");
  });

  it("adapts ambience to local time while the page stays open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 3, 17, 59));
    const { container } = renderHome();
    expect(container.querySelector("main")).toHaveClass("portal-home--day");
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(container.querySelector("main")).toHaveClass("portal-home--dusk");
    vi.setSystemTime(new Date(2026, 10, 3, 21));
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(container.querySelector("main")).toHaveClass("portal-home--night");
    expect(screen.getByRole("link", { name: "Entrer dans le monde" })).toHaveAttribute("href", "/teams");
    expect(screen.queryByRole("button", { name: "Nuit" })).not.toBeInTheDocument();
    expect(context.list).not.toHaveBeenCalled();
  });

  it("keeps navigation available even when the health check fails", async () => {
    context.health.mockRejectedValue(new Error("offline"));
    renderHome();
    expect(await screen.findByText("Serveur hors ligne")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrer dans le monde" })).toHaveAttribute("href", "/teams");
    expect(screen.getByRole("link", { name: "Entrer dans le monde" })).not.toHaveAttribute("aria-disabled");
  });

  it("translates the portal and preserves its navigation", async () => {
    context.user = null;
    renderHome();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(screen.getByRole("link", { name: "Enter the world" })).toHaveAttribute("href", "/login");
    expect(screen.queryByText("Your adventures begin on the other side.")).not.toBeInTheDocument();
    expect(screen.queryByText("Votre carnet de campagne")).not.toBeInTheDocument();
  });
});

describe("quick dice", () => {
  it.each([6, 20, 100])("rolls the inclusive minimum and maximum of D%i", (sides) => {
    render(<QuickDice />);
    mockRandom(0, sides - 1);
    fireEvent.click(screen.getByRole("button", { name: `D${sides}` }));
    fireEvent.click(screen.getByRole("button", { name: "Lancer le dé" }));
    expect(screen.getByRole("status")).toHaveTextContent(`Jet 1 : 1 sur un D${sides}`);
    fireEvent.click(screen.getByRole("button", { name: "Lancer le dé" }));
    expect(screen.getByRole("status")).toHaveTextContent(`Jet 2 : ${sides} sur un D${sides}`);
    expect(document.querySelector(".home-dice__number")).toHaveTextContent(String(sides));
  });

  it("rejects biased random values instead of producing an out-of-range roll", () => {
    render(<QuickDice />);
    const random = mockRandom(4294967295, 99);
    fireEvent.click(screen.getByRole("button", { name: "D100" }));
    fireEvent.click(screen.getByRole("button", { name: "Lancer le dé" }));
    expect(screen.getByRole("status")).toHaveTextContent("Jet 1 : 100 sur un D100");
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("keeps five latest results, announces repeated numbers and clears on die changes", () => {
    render(<QuickDice />);
    mockRandom(0, 0, 1, 2, 3, 4);
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole("button", { name: "Lancer le dé" }));
    const history = screen.getByRole("list", { name: "Les cinq derniers jets" });
    expect(within(history).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["5", "4", "3", "2", "1"]);
    fireEvent.click(screen.getByRole("button", { name: "Effacer" }));
    expect(within(history).queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("Prêt à lancer le dé");
    fireEvent.click(screen.getByRole("button", { name: "Lancer le dé" }));
    fireEvent.click(screen.getByRole("button", { name: "D6" }));
    expect(within(history).queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "D6" })).toHaveAttribute("aria-pressed", "true");
  });
});
