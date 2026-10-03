import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import i18n from "../../../../config/i18n";
import { FORGE_SKILLS_STORAGE_KEY, FORGE_STORAGE_KEY } from "./storage";
import HearthstoneForge from "./HearthstoneForge";

function renderForge(rolls: number[], skillRolls: number[] = [], chaosRolls: number[] = []) {
  return render(
    <MemoryRouter>
      <HearthstoneForge
        dieRoller={() => rolls.shift() ?? 1}
        skillRoller={() => skillRolls.shift() ?? 50}
        chaosRoller={() => chaosRolls.shift() ?? 6}
        flawPicker={() => "noise"}
      />
    </MemoryRouter>,
  );
}

function fillCard() {
  fireEvent.change(screen.getByLabelText("Nom de la carte"), { target: { value: "Diablotin comptable" } });
  fireEvent.change(screen.getByLabelText(/Type de créature/), { target: { value: "Démon" } });
  fireEvent.change(screen.getByLabelText(/Prodige inscrit sur la carte/), {
    target: { value: "Additionne les dégâts, puis égare la facture." },
  });
  fireEvent.change(screen.getByLabelText("Runologie"), { target: { value: "60" } });
  fireEvent.change(screen.getByLabelText("Art & Calligraphie"), { target: { value: "55" } });
  fireEvent.change(screen.getByLabelText("Gemmologie & Enchantement"), { target: { value: "70" } });
}

function playPhase(continueLabel: string) {
  fireEvent.click(screen.getByRole("radio", { name: /Main soutenue/ }));
  fireEvent.click(screen.getByRole("button", { name: "Actionner la presse" }));
  fireEvent.click(screen.getByRole("button", { name: "Conserver ce score" }));
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

    expect(screen.getByLabelText("Score actuel 0, cible 10")).toBeInTheDocument();
    expect(screen.queryByText(/0\s*\/\s*1\s*\/\s*2|1\s*\/\s*2\s*\/\s*4|2\s*\/\s*4\s*\/\s*6/)).not.toBeInTheDocument();

    playPhase("Poursuivre l'impression");
    playPhase("Poursuivre l'impression");
    playPhase("Achever l'impression");

    fireEvent.click(screen.getByRole("button", { name: "Inspecter le tirage" }));

    expect(screen.getByRole("heading", { name: "La carte tient debout" })).toBeInTheDocument();
    expect(screen.getByText(/Score final : 10 — cible : 10/)).toBeInTheDocument();
    expect(screen.queryByText(/probabilité|chronosphère|sphère de contenance|pince d'inhibition/i)).not.toBeInTheDocument();

    await waitFor(() => {
      const stored = window.localStorage.getItem(FORGE_STORAGE_KEY);
      expect(stored).toContain("Diablotin comptable");
      expect(stored).toContain('"minionType":"Démon"');
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
    fireEvent.click(screen.getByRole("radio", { name: /^Rare/ }));
    fireEvent.click(screen.getByRole("button", { name: "Engager le parchemin" }));

    playPhase("Poursuivre l'impression");
    playPhase("Poursuivre l'impression");
    playPhase("Achever l'impression");
    fireEvent.click(screen.getByRole("button", { name: "Inspecter le tirage" }));

    expect(screen.getByRole("heading", { name: "La carte refuse de choisir" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /La garder avec son caractère/ }));

    expect(screen.getByText(/vacarme impossible à dissimuler/)).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(FORGE_STORAGE_KEY)).toContain('"flaw":"noise"'));
  });

  it("shows the phase score and applies a successful skill retouch", () => {
    renderForge([3, 3, 3], [50]);

    fireEvent.click(screen.getByRole("button", { name: /Allumer la presse/ }));
    fillCard();
    fireEvent.click(screen.getByRole("radio", { name: /^Rare/ }));
    fireEvent.click(screen.getByRole("button", { name: "Engager le parchemin" }));

    fireEvent.click(screen.getByRole("radio", { name: /Main soutenue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Actionner la presse" }));
    expect(screen.getByText("Score de la phase").parentElement).toHaveTextContent("2");
    expect(screen.getByLabelText("Score actuel 2, cible 7")).toBeInTheDocument();
    expect(screen.getByText("Réduire")).toBeInTheDocument();
    expect(screen.getByText("Augmenter")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Modifier de \+1, seuil 60/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lancer le test de compétence" }));
    expect(screen.getByText(/Retouche réussie/)).toBeInTheDocument();
    expect(screen.getByText(/score de 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Poursuivre l'impression" }));
    playPhase("Poursuivre l'impression");
    playPhase("Achever l'impression");
    fireEvent.click(screen.getByRole("button", { name: "Inspecter le tirage" }));

    expect(screen.getByRole("heading", { name: "La carte tient debout" })).toBeInTheDocument();
  });

  it("lets the player freely choose a correction after a 01–05 critical success", () => {
    renderForge([3], [5]);

    fireEvent.click(screen.getByRole("button", { name: /Allumer la presse/ }));
    fillCard();
    fireEvent.click(screen.getByRole("button", { name: "Engager le parchemin" }));
    fireEvent.click(screen.getByRole("radio", { name: /Main soutenue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Actionner la presse" }));
    fireEvent.click(screen.getByRole("radio", { name: /Modifier de \+1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lancer le test de compétence" }));

    expect(screen.getByText(/Succès critique/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+3" }));
    expect(screen.getByText(/score de 5/)).toBeInTheDocument();
  });

  it("shows the common gem bonus in the retouch threshold", () => {
    renderForge([3]);

    fireEvent.click(screen.getByRole("button", { name: /Allumer la presse/ }));
    fillCard();
    expect(screen.getByText(/Stable à ±1 de la cible/)).toBeInTheDocument();
    expect(screen.getByText(/Modificateur appliqué aux tests de retouche : \+10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Engager le parchemin" }));
    fireEvent.click(screen.getByRole("radio", { name: /Main soutenue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Actionner la presse" }));

    expect(screen.getByRole("radio", { name: /Modifier de \+1, seuil 70/ })).toBeInTheDocument();
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

  it("returns to a prefilled design when retrying the same card and remembers skills", async () => {
    renderForge([1, 1, 1]);

    fireEvent.click(screen.getByRole("button", { name: /Allumer la presse/ }));
    fillCard();

    await waitFor(() => expect(window.localStorage.getItem(FORGE_SKILLS_STORAGE_KEY)).toContain('"runology":60'));

    fireEvent.click(screen.getByRole("button", { name: "Engager le parchemin" }));
    playPhase("Poursuivre l'impression");
    playPhase("Poursuivre l'impression");
    playPhase("Achever l'impression");
    fireEvent.click(screen.getByRole("button", { name: "Inspecter le tirage" }));
    fireEvent.click(screen.getByRole("button", { name: "Retenter la même carte" }));

    expect(screen.getByRole("heading", { name: "Composez la carte" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de la carte")).toHaveValue("Diablotin comptable");
    expect(screen.getByLabelText(/Type de créature/)).toHaveValue("Démon");
    expect(screen.getByLabelText("Runologie")).toHaveValue(60);
  });

  it("loads remembered skills and only prints a creature type when one is provided", () => {
    window.localStorage.setItem(FORGE_SKILLS_STORAGE_KEY, JSON.stringify({
      version: 1,
      skills: { runology: 64, artCalligraphy: 58, gemologyEnchantment: 72 },
    }));
    const { container } = renderForge([]);

    fireEvent.click(screen.getByRole("button", { name: /Allumer la presse/ }));
    expect(screen.getByLabelText("Runologie")).toHaveValue(64);
    expect(container.querySelector(".forge-card__type")).toBeNull();

    fireEvent.change(screen.getByLabelText(/Type de créature/), { target: { value: "Bête" } });
    expect(container.querySelector(".forge-card__type")).toHaveTextContent("Bête");
  });
});

