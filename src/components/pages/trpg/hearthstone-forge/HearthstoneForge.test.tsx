import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import i18n from "../../../../config/i18n";
import { FORGE_STORAGE_KEY } from "./storage";
import HearthstoneForge from "./HearthstoneForge";

function renderForge(rolls: number[]) {
  return render(
    <MemoryRouter>
      <HearthstoneForge dieRoller={() => rolls.shift() ?? 1} flawPicker={() => "noise"} />
    </MemoryRouter>,
  );
}

function fillCard() {
  fireEvent.change(screen.getByLabelText("Nom de la créature"), { target: { value: "Diablotin comptable" } });
  fireEvent.change(screen.getByLabelText(/Prodige inscrit sur la carte/), {
    target: { value: "Additionne les dégâts, puis égare la facture." },
  });
}

function playPhase(continueLabel: string) {
  fireEvent.click(screen.getByRole("radio", { name: /Main soutenue/ }));
  fireEvent.click(screen.getByRole("button", { name: "Actionner la presse" }));
  fireEvent.click(screen.getByRole("button", { name: continueLabel }));
}

describe("HearthstoneForge", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("fr");
  });

  it("completes a stable ritual and stores the card", async () => {
    renderForge([5, 5, 3]);

    fireEvent.click(screen.getByRole("button", { name: /Allumer la presse/ }));
    fillCard();
    fireEvent.click(screen.getByRole("button", { name: "Engager le parchemin" }));

    playPhase("Poursuivre le rituel");
    playPhase("Poursuivre le rituel");
    playPhase("Sceller l'œuvre");

    fireEvent.click(screen.getByRole("button", { name: "Rompre le sceau" }));

    expect(screen.getByRole("heading", { name: "La carte tient debout" })).toBeInTheDocument();
    expect(screen.queryByText(/cible|probabilité|chronosphère|sphère de contenance|pince d'inhibition/i)).not.toBeInTheDocument();

    await waitFor(() => {
      const stored = window.localStorage.getItem(FORGE_STORAGE_KEY);
      expect(stored).toContain("Diablotin comptable");
    });

    fireEvent.click(screen.getByRole("button", { name: "Voir dans le cabinet" }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Retirer du cabinet" }));

    await waitFor(() => expect(window.localStorage.getItem(FORGE_STORAGE_KEY)).not.toContain("Diablotin comptable"));
    expect(confirm).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });

  it("asks for a dramatic choice before storing an unstable card", async () => {
    renderForge([3, 3, 3]);

    fireEvent.click(screen.getByRole("button", { name: /Allumer la presse/ }));
    fillCard();
    fireEvent.click(screen.getByLabelText("Rare"));
    fireEvent.click(screen.getByRole("button", { name: "Engager le parchemin" }));

    playPhase("Poursuivre le rituel");
    playPhase("Poursuivre le rituel");
    playPhase("Sceller l'œuvre");
    fireEvent.click(screen.getByRole("button", { name: "Rompre le sceau" }));

    expect(screen.getByRole("heading", { name: "La carte refuse de choisir" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /La garder avec son caractère/ }));

    expect(screen.getByText(/vacarme impossible à dissimuler/)).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(FORGE_STORAGE_KEY)).toContain('"flaw":"noise"'));
  });

  it("keeps working in memory when browser storage is full", async () => {
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    } as unknown as Storage;

    render(
      <MemoryRouter>
        <HearthstoneForge storage={failingStorage} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/reste visible pour cette session/);
  });
});

