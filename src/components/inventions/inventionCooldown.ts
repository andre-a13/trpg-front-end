export const INVENTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type CooldownStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const inventionCooldownKey = (characterId: number) => `trpg-inventions:cooldown:${characterId}`;

export class InventionCooldownError extends Error {}

export function readInventionCooldown(storage: CooldownStorage, characterId: number): number {
  const value = Number(storage.getItem(inventionCooldownKey(characterId)));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function drawWithInventionCooldown<T>(
  storage: CooldownStorage,
  characterId: number,
  draw: () => Promise<T>,
  now: () => number = Date.now,
): Promise<{ result: T; cooldownEndsAt: number }> {
  const key = inventionCooldownKey(characterId);
  const previous = storage.getItem(key);
  if (readInventionCooldown(storage, characterId) > now()) {
    throw new InventionCooldownError("Invention draw is on cooldown");
  }
  // Reserve before the request: double clicks and other tabs see the block.
  // If localStorage is unavailable, fail before changing the persisted draw.
  const reservation = String(now() + INVENTION_COOLDOWN_MS);
  storage.setItem(key, reservation);
  let result: T;
  try {
    result = await draw();
  } catch (error) {
    if (storage.getItem(key) === reservation) {
      if (previous === null) storage.removeItem(key);
      else storage.setItem(key, previous);
    }
    throw error;
  }
  const cooldownEndsAt = now() + INVENTION_COOLDOWN_MS;
  storage.setItem(key, String(cooldownEndsAt));
  return { result, cooldownEndsAt };
}
