import assert from "node:assert/strict";
import test from "node:test";
import {
  drawWithInventionCooldown,
  INVENTION_COOLDOWN_MS,
  InventionCooldownError,
  inventionCooldownKey,
  readInventionCooldown,
} from "../src/components/inventions/inventionCooldown.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

test("a successful draw starts 24 hours on completion and survives a reload", async () => {
  const storage = new MemoryStorage();
  let now = 1000;
  const result = await drawWithInventionCooldown(storage, 12, async () => {
    now += 3000;
    return [1, 2, 3, 4, 5];
  }, () => now);
  assert.deepEqual(result.result, [1, 2, 3, 4, 5]);
  assert.equal(result.cooldownEndsAt, now + INVENTION_COOLDOWN_MS);
  const reloaded = new MemoryStorage();
  reloaded.values = new Map(storage.values);
  assert.equal(readInventionCooldown(reloaded, 12), result.cooldownEndsAt);
});

test("an active cooldown prevents the request and leaves other characters independent", async () => {
  const storage = new MemoryStorage();
  await drawWithInventionCooldown(storage, 12, async () => [], () => 1000);
  let called = false;
  await assert.rejects(drawWithInventionCooldown(storage, 12, async () => { called = true; }, () => 2000), InventionCooldownError);
  assert.equal(called, false);
  await drawWithInventionCooldown(storage, 13, async () => [], () => 2000);
});

test("the next draw is allowed exactly at expiry", async () => {
  const storage = new MemoryStorage();
  const first = await drawWithInventionCooldown(storage, 12, async () => [], () => 1000);
  const next = await drawWithInventionCooldown(storage, 12, async () => [42], () => first.cooldownEndsAt);
  assert.deepEqual(next.result, [42]);
  assert.equal(next.cooldownEndsAt, first.cooldownEndsAt + INVENTION_COOLDOWN_MS);
});

test("a failed request does not consume the cooldown, including a previously expired one", async () => {
  const storage = new MemoryStorage();
  for (const previous of [null, "500"]) {
    if (previous === null) storage.removeItem(inventionCooldownKey(12));
    else storage.setItem(inventionCooldownKey(12), previous);
    await assert.rejects(drawWithInventionCooldown(storage, 12, async () => { throw new Error("network"); }, () => 1000), /network/);
    assert.equal(storage.getItem(inventionCooldownKey(12)), previous);
  }
});

test("a pending draw blocks a second request sharing the same localStorage", async () => {
  const storage = new MemoryStorage();
  let complete;
  const pending = drawWithInventionCooldown(storage, 12, () => new Promise((resolve) => { complete = resolve; }), () => 1000);
  await assert.rejects(drawWithInventionCooldown(storage, 12, async () => [], () => 1001), InventionCooldownError);
  complete([1, 2, 3, 4, 5]);
  await pending;
});

test("unavailable storage stops before sending a draw request", async () => {
  let called = false;
  const storage = new MemoryStorage();
  storage.setItem = () => { throw new Error("storage denied"); };
  await assert.rejects(drawWithInventionCooldown(storage, 12, async () => { called = true; }), /storage denied/);
  assert.equal(called, false);
});

test("missing or malformed stored timestamps do not invent a cooldown", () => {
  const storage = new MemoryStorage();
  for (const value of ["", "broken", "NaN", "Infinity", "-500"]) {
    storage.setItem(inventionCooldownKey(12), value);
    assert.equal(readInventionCooldown(storage, 12), 0);
  }
});
