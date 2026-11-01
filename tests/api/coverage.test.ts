import { expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

async function sourceFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "generated") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(path));
    else if (/\.tsx?$/.test(entry.name)) result.push(path);
  }
  return result;
}

it("keeps API requests in the generated client and allows direct fetch only for signed storage uploads", async () => {
  const root = fileURLToPath(new URL("../../src/", import.meta.url));
  const storageServices = new Set([join(root, "services/character.service.ts"), join(root, "services/team.service.ts")]);
  for (const path of await sourceFiles(root)) {
    const source = await readFile(path, "utf8");
    expect(source, path).not.toMatch(/\b(?:api|publicApi)\.(?:get|post|put|patch|delete)\s*[<(]/);
    if (!storageServices.has(path)) expect(source, path).not.toMatch(/\bfetch\s*\(/);
  }
});
