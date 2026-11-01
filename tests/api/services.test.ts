import { afterEach, expect, it, vi } from "vitest";
import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import api from "../../src/services/api";
import characters from "../../src/services/character.service";
import decks from "../../src/services/hearthstone-deck.service";
import Character from "../../src/models/character";
import type { CharacterDetailResponse } from "../../src/api/generated/types.gen";

const initialAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = initialAdapter;
  vi.unstubAllGlobals();
});

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: String(status), headers: new AxiosHeaders() };
}

const hero: CharacterDetailResponse = {
  id: 1, slug: "hero", name: "Hero", race: "Human", portraitUrl: null, backgroundUrl: null,
  ownerUserId: null, ownerUsername: null, stats: { corps: 50, mental: 50, social: 50 },
  skillsPrimary: [], skillsSecondary: [], inventory: [], gold: 0, notes: null,
  current_hp: 15, bonusHealth: 0, invengineerEnabled: false,
  hearthstomancer: { configured: false, enabled: false }, teams: [], inventoryCategories: [],
  noteTabs: [{ id: 1, characterId: 1, title: "Notes", content: "Saved note", sortOrder: 0 }],
};

it("keeps character creation acknowledgements and maps read responses to the domain model", async () => {
  api.defaults.adapter = async config => {
    const path = new URL(config.url!).pathname;
    if (config.method === "post") return response(config, { id: 1, name: "Hero", slug: "hero", ownerUserId: null }, 201);
    if (path === "/characters") {
      const { noteTabs, inventoryCategories, ...summary } = hero;
      void noteTabs; void inventoryCategories;
      return response(config, [summary]);
    }
    return response(config, hero);
  };
  const created = await characters.create({ name: "Hero", slug: "hero", race: "Human", stats: hero.stats });
  expect(created.status).toBe(201);
  expect(created.data).toEqual({ id: 1, name: "Hero", slug: "hero", ownerUserId: null });
  const detail = await characters.getBySlug("hero");
  expect(detail).toBeInstanceOf(Character);
  expect(detail.getMaxHp()).toBe(15);
  expect(detail.portraitUrl).toBeUndefined();
  expect(detail.notes).toBe("Saved note");
  const [summary] = await characters.list();
  expect(summary).toBeInstanceOf(Character);
  expect(summary.noteTabs).toEqual([]);
  expect(summary.inventoryCategories).toEqual([]);
});

it("sends only the edited nested stat in a partial update", async () => {
  let sent: unknown;
  api.defaults.adapter = async config => {
    sent = JSON.parse(config.data);
    return response(config, hero);
  };
  await characters.patch("hero", { stats: { corps: 65 } });
  expect(sent).toEqual({ stats: { corps: 65 } });
});

it("keeps signed S3 transfers outside the authenticated API client", async () => {
  const publicUrl = "https://files.example.test/portrait.webp";
  const requests: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async config => {
    requests.push(config);
    return response(config, config.method === "post" ? {
      upload_url: "https://upload.example.test/signed", object_key: "portrait.webp",
      public_url: publicUrl, expires_in: 900,
    } : hero);
  };
  const put = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", put);
  const file = new File(["image"], "portrait.webp", { type: "image/webp" });
  expect(await characters.uploadPortrait("hero", file)).toBe(publicUrl);
  expect(put).toHaveBeenCalledWith("https://upload.example.test/signed", {
    method: "PUT", headers: { "Content-Type": "image/webp" }, body: file,
  });
  expect(JSON.parse(requests[0].data)).toEqual({ filename: "portrait.webp", content_type: "image/webp", size: file.size });
  expect(JSON.parse(requests[1].data)).toEqual({ portraitUrl: publicUrl });
});

it("preserves the unconfigured deck variant and safely serializes catalogue queries", async () => {
  let query: URL | undefined;
  api.defaults.adapter = async config => {
    query = new URL(config.url!);
    return response(config, query.pathname.endsWith("/hearthstomancer")
      ? { configured: false, enabled: false }
      : { items: [], sets: [], page: 2, pageSize: 24, total: 0 });
  };
  expect(await decks.setEnabled("hero", false)).toEqual({ configured: false, enabled: false });
  await decks.searchCards("a&b é", 2, 24, "CORE");
  expect(query!.searchParams.get("q")).toBe("a&b é");
  expect(query!.searchParams.get("cardSet")).toBe("CORE");
  expect(query!.searchParams.get("page")).toBe("2");
});
