import { afterAll, beforeAll, describe, expect, it } from "vitest";
import api, { publicApi, publicApiOptions } from "../../src/services/api";
import { systemHealth, systemRoot, charactersList } from "../../src/api/generated/sdk.gen";
import auth from "../../src/services/auth.service";
import characters from "../../src/services/character.service";
import notes from "../../src/services/character-notes.service";
import inventory from "../../src/services/inventory-table.service";
import teams from "../../src/services/team.service";
import accounts from "../../src/services/account.service";
import inventions from "../../src/services/invention.service";
import decks from "../../src/services/hearthstone-deck.service";
import { clearStoredTokens, setStoredTokens, toStoredTokens } from "../../src/services/token-storage";
import contract from "../../contracts/openapi.json";

const base = import.meta.env.VITE_TRPG_API_URL;
if (process.env.TRPG_TEST_ISOLATED_API !== "1" || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) {
  throw new Error("Use npm run test:integration to create an isolated local API");
}
const admin = { username: "contract-admin", password: "local-contract-test-password" };
const slug = "contract-hero";
let refreshRequests = 0;

// Node Axios has no browser cookie jar. Keep the real API's rotating cookie in this test harness.
const cookies = publicApi.interceptors.response.use(response => {
  const header = response.headers["set-cookie"]?.[0];
  if (header) publicApi.defaults.headers.common.Cookie = header.split(";", 1)[0];
  return response;
});
const refreshCounter = publicApi.interceptors.request.use(config => {
  if (config.url?.endsWith("/auth/refresh")) refreshRequests++;
  return config;
});

async function login(credentials = admin) {
  const tokens = await auth.login(credentials);
  setStoredTokens(toStoredTokens(tokens));
}

describe("generated frontend SDK against a real isolated FastAPI server", () => {
  beforeAll(async () => {
    const user = await auth.register(admin);
    expect(user.role).toBe("admin");
    await login();
    expect((await auth.me()).username).toBe(admin.username);
    await characters.create({
      slug, name: "Contract Hero", race: "Human", notes: "Initial notes",
      stats: { corps: 50, mental: 50, social: 50 },
    });
  });

  afterAll(async () => {
    await auth.logout();
    clearStoredTokens();
    publicApi.interceptors.response.eject(cookies);
    publicApi.interceptors.request.eject(refreshCounter);
    delete publicApi.defaults.headers.common.Cookie;
  });

  it("serves the exact published contract, health and expected CORS headers", async () => {
    expect((await systemHealth(publicApiOptions)).data).toEqual({ ok: true });
    expect((await systemRoot(publicApiOptions)).data).toEqual({ Hello: "World" });
    expect(await (await fetch(`${base}/openapi.json`)).json()).toEqual(contract);
    const cors = await fetch(`${base}/characters/${slug}`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "authorization,content-type" },
    });
    expect(cors.status).toBe(200);
    expect(cors.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    await expect(charactersList(publicApiOptions)).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("preserves creation acknowledgements, domain mapping, nulls and partial nested updates", async () => {
    const created = await characters.create({ slug: "second-hero", name: "Second", race: "Human",
      stats: { corps: 40, mental: 50, social: 60 } });
    expect(created.status).toBe(201);
    expect(Object.keys(created.data).sort()).toEqual(["id", "name", "ownerUserId", "slug"]);
    await characters.patch(slug, { stats: { corps: 65 } });
    const hero = await characters.getBySlug(slug);
    expect(hero.stats).toEqual({ corps: 65, mental: 50, social: 50 });
    expect(hero.getMaxHp()).toBe(18);
    expect(hero.portraitUrl).toBeUndefined();
    expect(hero.backgroundUrl).toBeNull();
    expect((await characters.list()).map(character => character.slug)).toContain(slug);
  });

  it("supports note create, edit, reorder, duplicate errors and empty delete responses", async () => {
    const initial = (await characters.getBySlug(slug)).noteTabs[0];
    const created = await notes.createNote(slug, { title: "Local notes", content: "First" });
    expect((await notes.patchNote(slug, created.id, { content: "Updated" })).content).toBe("Updated");
    const reordered = await notes.reorderNotes(slug, [
      { id: created.id, sortOrder: 0 }, { id: initial.id, sortOrder: 1 },
    ]);
    expect(reordered[0].id).toBe(created.id);
    await expect(notes.createNote(slug, { title: "Local notes" }))
      .rejects.toMatchObject({ response: { status: 409 } });
    expect(await notes.deleteNote(slug, created.id)).toBeUndefined();
  });

  it("supports inventory categories and items with null fields and 204 deletions", async () => {
    const category = await inventory.createCategory(slug, "Local inventory");
    const item = await inventory.createItem(slug, category.id, { name: "Rope", quantity: 2, notes: "Packed" });
    const updated = await inventory.patchItem(slug, category.id, item.id, { quantity: 0, notes: null });
    expect(updated).toMatchObject({ quantity: 0, notes: null });
    expect((await characters.getBySlug(slug)).inventoryCategories[0].contents[0].id).toBe(item.id);
    expect(await inventory.deleteItem(slug, category.id, item.id)).toBeUndefined();
    expect(await inventory.deleteCategory(slug, category.id)).toBeUndefined();
  });

  it("keeps team roster metadata and membership changes", async () => {
    const created = await teams.create({ name: "Local team" });
    const roster = await teams.addMember(created.data.uuid, slug);
    expect(roster.characters[0]).toMatchObject({ slug, name: "Contract Hero", portraitUrl: null });
    expect((await teams.list()).map(team => team.uuid)).toContain(created.data.uuid);
    expect((await teams.removeMember(created.data.uuid, slug)).characters).toEqual([]);
  });

  it("draws five inventions, preserves references and enforces module activation", async () => {
    expect((await inventions.list()).length).toBeGreaterThanOrEqual(5);
    expect(await inventions.setEnabled(slug, true)).toEqual({ enabled: true });
    const draw = await inventions.draw(slug);
    expect(draw.items).toHaveLength(5);
    expect((await inventions.getState(slug)).items).toEqual(draw.items);
    const created = await inventions.add("Integration-only invention");
    expect(await inventions.remove(created.id)).toBeUndefined();
    await inventions.setEnabled(slug, false);
    await expect(inventions.draw(slug)).rejects.toMatchObject({ response: { status: 403 } });
  });

  it("supports deck variants, composition, draw/reset and real five-card packs", async () => {
    expect(await decks.setEnabled(slug, false)).toEqual({ configured: false, enabled: false });
    expect((await decks.setEnabled(slug, true)).configured).toBe(true);
    const catalog = await decks.searchCards("", 1, 5, "CORE");
    expect(catalog.items.length).toBeGreaterThan(0);
    const composition = await decks.saveComposition(slug, [
      { sourceCardId: catalog.items[0].id, normalCount: 2, goldenCount: 0 },
    ]);
    expect(composition.counts).toEqual({ total: 2, remaining: 2, drawn: 0 });
    expect((await decks.draw(slug)).counts.drawn).toBe(1);
    expect((await decks.reset(slug)).counts.remaining).toBe(2);
    const pack = await decks.openPack(slug, "CORE");
    expect(pack.cards).toHaveLength(5);
    expect((await decks.savePack(slug, pack.cards.map(card => card.id))).counts.total).toBe(7);
  });

  it("keeps account ownership and forbids player-only sessions from administrative operations", async () => {
    const player = { username: "contract-player", password: "local-player-test-password" };
    const account = await accounts.create({ ...player, role: "player" });
    expect((await accounts.list()).some(row => row.id === account.id)).toBe(true);
    await characters.patch(slug, { ownerUserId: account.id });
    try {
      await login(player);
      expect((await auth.me()).role).toBe("player");
      expect((await characters.getBySlug(slug)).ownerUserId).toBe(account.id);
      await expect(inventions.list()).rejects.toMatchObject({ response: { status: 403 } });
    } finally {
      await login();
    }
  });

  it("rotates the real refresh cookie and restores access after concurrent 401s", async () => {
    const previous = publicApi.defaults.headers.common.Cookie;
    setStoredTokens({ accessToken: "expired.invalid", tokenType: "bearer", expiresAt: 0, refreshExpiresAt: 999999 });
    const start = refreshRequests;
    const [hero, roster] = await Promise.all([characters.getBySlug(slug), teams.list()]);
    expect(hero.slug).toBe(slug);
    expect(roster.length).toBeGreaterThan(0);
    expect(refreshRequests - start).toBe(1);
    expect(publicApi.defaults.headers.common.Cookie).not.toBe(previous);
    expect((await auth.me()).username).toBe(admin.username);
    expect(api.defaults.withCredentials).toBe(true);
  });
});
