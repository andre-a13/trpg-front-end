import { expect, it, vi } from "vitest";
import { charactersList } from "../api/generated/sdk.gen";
import type { CharacterSummaryResponse } from "../api/generated/types.gen";
import characterService from "./character.service";

vi.mock("../api/generated/sdk.gen", () => ({ charactersList: vi.fn() }));

it("fetches later character pages for management screens", async () => {
    const rows = Array.from({ length: 51 }, (_, index): CharacterSummaryResponse => ({
        id: index + 1,
        slug: `hero-${index + 1}`,
        name: `Hero ${index + 1}`,
        race: "Humain",
        stats: { corps: 50, mental: 50, social: 50 },
        backgroundUrl: null,
        portraitUrl: null,
        ownerUserId: null,
        ownerUsername: null,
        notes: null,
        bonusHealth: 0,
        current_hp: 15,
        gold: 0,
        invengineerEnabled: false,
        skillsPrimary: [],
        skillsSecondary: [],
        inventory: [],
        teams: [],
        hearthstomancer: { configured: false, enabled: false },
    }));
    const list = vi.mocked(charactersList);
    list.mockResolvedValueOnce({ data: rows.slice(0, 50) } as Awaited<ReturnType<typeof charactersList>>);
    list.mockResolvedValueOnce({ data: rows.slice(50) } as Awaited<ReturnType<typeof charactersList>>);

    const characters = await characterService.listAll();

    expect(characters).toHaveLength(51);
    expect(characters[50]?.slug).toBe("hero-51");
    expect(list).toHaveBeenNthCalledWith(1, expect.objectContaining({ query: { limit: 50, offset: 0 } }));
    expect(list).toHaveBeenNthCalledWith(2, expect.objectContaining({ query: { limit: 50, offset: 50 } }));
});
