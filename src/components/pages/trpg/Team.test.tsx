import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import i18n from "../../../config/i18n";
import type { TeamDto } from "../../../types/api";
import Team from "./Team";

const context = vi.hoisted(() => ({
  user: { id: 1, username: "gm", role: "admin" as "admin" | "player" },
  manage: true,
  getTeam: vi.fn(), listCharacters: vi.fn(), patchCharacter: vi.fn(),
}));
vi.mock("../../../auth/useAuth", () => ({ useAuth: () => ({ user: context.user }) }));
vi.mock("../../../admin/useAdminControls", () => ({
  useAdminControls: () => ({ isAdmin: context.user.role === "admin", manageCharactersEnabled: context.manage }),
}));
vi.mock("../../../services/team.service", () => ({ default: { getByUuid: context.getTeam } }));
vi.mock("../../../services/character.service", () => ({
  default: { list: context.listCharacters, patch: context.patchCharacter },
}));

const roster: TeamDto = {
  uuid: "team-1", name: "Les Veilleurs", illustrationUrl: null,
  characters: [
    { id: 1, slug: "aria", name: "Aria", race: "Elfe", portraitUrl: null, ownerUserId: 2, current_hp: 12, max_hp: 15 },
    { id: 2, slug: "borin", name: "Borin", race: "Humain", portraitUrl: null, ownerUserId: 3, current_hp: 5, max_hp: 20 },
    { id: 3, slug: "cerys", name: "Cerys", race: "Halfeline", portraitUrl: null, ownerUserId: 4, current_hp: 0, max_hp: 10 },
  ],
};

function patchResponse(slug: string, hp: number) {
  const member = roster.characters.find((character) => character.slug === slug)!;
  return { data: {
    ...member, current_hp: hp, bonusHealth: 0,
    stats: { corps: (member.max_hp - 5) * 5, mental: 50, social: 50 },
    skillsPrimary: [], skillsSecondary: [], inventory: [], gold: 0, notes: null,
    ownerUsername: null, backgroundUrl: null, teams: [], invengineerEnabled: false,
    hearthstomancer: { configured: false, enabled: false },
  } };
}

function renderTeam() {
  return render(<MemoryRouter initialEntries={["/teams/team-1"]}>
    <Routes><Route path="/teams/:uuid" element={<Team />} /></Routes>
  </MemoryRouter>);
}

async function card(name = "Aria") {
  return within(await screen.findByRole("article", { name }));
}

describe("team health dashboard", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    context.user = { id: 1, username: "gm", role: "admin" };
    context.manage = true;
    context.getTeam.mockResolvedValue(structuredClone(roster));
    context.listCharacters.mockResolvedValue([]);
    context.patchCharacter.mockImplementation(async (slug: string, body: { current_hp: number }) => patchResponse(slug, body.current_hp));
    await i18n.changeLanguage("fr");
  });

  it("shows the whole roster, real HP ranges, states and character links", async () => {
    renderTeam();
    expect(await screen.findByRole("heading", { name: "Points de vie de l’équipe" })).toBeInTheDocument();
    expect(screen.getByText("17 / 45 PV dans l’équipe")).toBeInTheDocument();
    expect(screen.getByText("2 blessé(s)")).toBeInTheDocument();
    expect(screen.getByText("1 hors combat")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(3);
    expect((await card()).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "12");
    expect((await card()).getByRole("progressbar")).toHaveAttribute("aria-valuemax", "15");
    expect((await card("Borin")).getByText("État critique")).toBeInTheDocument();
    expect((await card("Cerys")).getByText("Hors combat")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aria" })).toHaveAttribute("href", "/characters/aria");
    expect(context.getTeam).toHaveBeenCalledTimes(1);
    expect(context.patchCharacter).not.toHaveBeenCalled();
  });

  it("allows a player to edit their own character and keeps teammates read-only", async () => {
    context.user = { id: 2, username: "player", role: "player" };
    renderTeam();
    expect((await card()).getByRole("button", { name: "Retirer 1 PV à Aria" })).toBeEnabled();
    expect((await card("Borin")).queryAllByRole("button")).toHaveLength(0);
    expect((await card("Borin")).getByText("Consultation seule")).toBeInTheDocument();
    expect(context.listCharacters).not.toHaveBeenCalled();
  });

  it("respects the administrator's disabled editing mode", async () => {
    context.manage = false;
    renderTeam();
    expect((await card()).queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByText("Consultation seule")).toHaveLength(3);
  });

  it("accepts rapid clicks immediately and saves them in order without disabling controls", async () => {
    let finish!: (value: ReturnType<typeof patchResponse>) => void;
    context.patchCharacter.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    renderTeam();
    const aria = await card();
    const damage = aria.getByRole("button", { name: "Retirer 5 PV à Aria" });
    fireEvent.click(damage);
    fireEvent.click(damage);
    expect(context.patchCharacter).toHaveBeenCalledTimes(1);
    expect(context.patchCharacter).toHaveBeenCalledWith("aria", { current_hp: 7 });
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(aria.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Aria" })).toHaveAttribute("aria-busy", "true");
    expect(damage).toBeEnabled();
    expect(aria.getByRole("spinbutton")).toBeEnabled();
    expect((await card("Borin")).getByRole("button", { name: "Rendre 1 PV à Borin" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Actualiser les PV" })).toBeEnabled();
    await act(async () => { finish(patchResponse("aria", 7)); });
    expect(context.patchCharacter).toHaveBeenCalledTimes(2);
    expect(context.patchCharacter).toHaveBeenLastCalledWith("aria", { current_hp: 2 });
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByRole("article", { name: "Aria" })).toHaveAttribute("aria-busy", "false");
    expect(aria.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps the latest clicked HP visible while an earlier save finishes", async () => {
    let finishFirst!: (value: ReturnType<typeof patchResponse>) => void;
    let finishSecond!: (value: ReturnType<typeof patchResponse>) => void;
    context.patchCharacter
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve; }));
    renderTeam();
    const aria = await card();
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
    await act(async () => { finishFirst(patchResponse("aria", 11)); });
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
    expect(context.patchCharacter).toHaveBeenLastCalledWith("aria", { current_hp: 9 });
    await act(async () => { finishSecond(patchResponse("aria", 9)); });
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
  });

  it("rolls back a failed queued save to the last confirmed HP", async () => {
    let finishFirst!: (value: ReturnType<typeof patchResponse>) => void;
    let failSecond!: (reason: Error) => void;
    context.patchCharacter
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { failSecond = reject; }));
    renderTeam();
    const aria = await card();
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    await act(async () => { finishFirst(patchResponse("aria", 11)); });
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
    await act(async () => { failSecond(new Error("offline")); });
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "11");
    expect(aria.getByRole("alert")).toHaveTextContent("Les PV n’ont pas été enregistrés");
    expect(context.patchCharacter).toHaveBeenCalledTimes(2);
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    await waitFor(() => expect(screen.getByRole("article", { name: "Aria" })).toHaveAttribute("aria-busy", "false"));
    expect(context.patchCharacter).toHaveBeenLastCalledWith("aria", { current_hp: 10 });
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");
  });

  it("lets refresh wait for saves without blocking the editing controls", async () => {
    let finish!: (value: ReturnType<typeof patchResponse>) => void;
    context.patchCharacter.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    renderTeam();
    const aria = await card();
    const refreshed = structuredClone(roster);
    refreshed.characters[0].current_hp = 11;
    context.getTeam.mockResolvedValue(refreshed);
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    fireEvent.click(screen.getByRole("button", { name: "Actualiser les PV" }));
    expect(context.getTeam).toHaveBeenCalledTimes(1);
    expect(aria.getByRole("button", { name: "Retirer 1 PV à Aria" })).toBeEnabled();
    await act(async () => { finish(patchResponse("aria", 11)); });
    expect(context.getTeam).toHaveBeenCalledTimes(2);
    expect((await card()).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "11");
  });

  it("waits for another character's newly started save before refreshing", async () => {
    const finishes: Record<string, (value: ReturnType<typeof patchResponse>) => void> = {};
    context.patchCharacter.mockImplementation((slug: string) => new Promise((resolve) => { finishes[slug] = resolve; }));
    renderTeam();
    const aria = await card();
    const borin = await card("Borin");
    const refreshed = structuredClone(roster);
    refreshed.characters[0].current_hp = 11;
    refreshed.characters[1].current_hp = 6;
    context.getTeam.mockResolvedValue(refreshed);
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    fireEvent.click(screen.getByRole("button", { name: "Actualiser les PV" }));
    fireEvent.click(borin.getByRole("button", { name: "Rendre 1 PV à Borin" }));
    await act(async () => { finishes.aria(patchResponse("aria", 11)); });
    expect(context.getTeam).toHaveBeenCalledTimes(1);
    await act(async () => { finishes.borin(patchResponse("borin", 6)); });
    expect(context.getTeam).toHaveBeenCalledTimes(2);
    expect((await card("Borin")).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "6");
  });

  it("clamps damage to zero and healing to the maximum", async () => {
    const team = structuredClone(roster);
    team.characters[0].current_hp = 2;
    team.characters[1].current_hp = 19;
    context.getTeam.mockResolvedValue(team);
    renderTeam();
    const aria = await card();
    fireEvent.click(aria.getByRole("button", { name: "Retirer 5 PV à Aria" }));
    await waitFor(() => expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0"));
    expect(context.patchCharacter).toHaveBeenCalledWith("aria", { current_hp: 0 });
    expect(aria.getByRole("button", { name: "Retirer 1 PV à Aria" })).toBeDisabled();
    const borin = await card("Borin");
    fireEvent.click(borin.getByRole("button", { name: "Rendre 5 PV à Borin" }));
    await waitFor(() => expect(borin.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20"));
    expect(context.patchCharacter).toHaveBeenCalledWith("borin", { current_hp: 20 });
    expect(borin.getByRole("button", { name: "Rendre 1 PV à Borin" })).toBeDisabled();
  });

  it("validates custom amounts and uses the value supplied by the user", async () => {
    renderTeam();
    const aria = await card();
    const amount = aria.getByRole("spinbutton", { name: "Variation de PV pour Aria" });
    const damage = aria.getByRole("button", { name: "Dégâts" });
    const heal = aria.getByRole("button", { name: "Soins" });
    for (const value of ["", "0", "-2", "2.5", "10000"]) {
      fireEvent.change(amount, { target: { value } });
      expect(damage).toBeDisabled();
      expect(heal).toBeDisabled();
    }
    fireEvent.change(amount, { target: { value: "7" } });
    fireEvent.click(damage);
    await waitFor(() => expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5"));
    expect(context.patchCharacter).toHaveBeenCalledWith("aria", { current_hp: 5 });
    expect((await card("Borin")).getByRole("spinbutton")).toHaveValue(1);
  });

  it("keeps confirmed HP on a save failure and allows retrying", async () => {
    context.patchCharacter.mockRejectedValueOnce(new Error("offline"));
    renderTeam();
    const aria = await card();
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    expect(await aria.findByRole("alert")).toHaveTextContent("Les PV n’ont pas été enregistrés");
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "12");
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    await waitFor(() => expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "11"));
    expect(aria.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps both saves when different characters complete out of order", async () => {
    const finishes: Record<string, (value: ReturnType<typeof patchResponse>) => void> = {};
    context.patchCharacter.mockImplementation((slug: string) => new Promise((resolve) => { finishes[slug] = resolve; }));
    renderTeam();
    const aria = await card();
    const borin = await card("Borin");
    fireEvent.click(aria.getByRole("button", { name: "Retirer 1 PV à Aria" }));
    fireEvent.click(borin.getByRole("button", { name: "Rendre 1 PV à Borin" }));
    await act(async () => { finishes.borin(patchResponse("borin", 6)); });
    await act(async () => { finishes.aria(patchResponse("aria", 11)); });
    expect(aria.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "11");
    expect(borin.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "6");
  });

  it("refreshes the team snapshot without modifying any character", async () => {
    renderTeam();
    await card();
    const refreshed = structuredClone(roster);
    refreshed.characters[0].current_hp = 9;
    context.getTeam.mockResolvedValue(refreshed);
    fireEvent.click(screen.getByRole("button", { name: "Actualiser les PV" }));
    await waitFor(() => expect(screen.getByRole("progressbar", { name: "Points de vie de Aria" })).toHaveAttribute("aria-valuenow", "9"));
    expect(context.getTeam).toHaveBeenCalledTimes(2);
    expect(context.patchCharacter).not.toHaveBeenCalled();
  });

  it("keeps the existing empty-team state", async () => {
    context.getTeam.mockResolvedValue({ ...roster, characters: [] });
    renderTeam();
    await screen.findByRole("heading", { name: "Les Veilleurs" });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Points de vie de l’équipe" })).not.toBeInTheDocument();
  });
});
