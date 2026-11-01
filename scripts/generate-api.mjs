import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@hey-api/openapi-ts";
import config from "../openapi-ts.config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const input = resolve(root, config.input);
const destination = resolve(root, config.output);
const metadata = JSON.parse(await readFile(resolve(root, "contracts/source.json"), "utf8"));
const hash = createHash("sha256").update(await readFile(input)).digest("hex");
if (metadata.sha256 !== hash) throw new Error("Contract provenance mismatch. Run api:import.");

async function files(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = {};
  for (const entry of entries) {
    const path = join(directory, entry.name);
    const name = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(result, await files(path, name + "/"));
    else result[name] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  return result;
}

const check = process.argv.includes("--check");
const cache = resolve(root, "node_modules/.cache/trpg-api");
if (check) await mkdir(cache, { recursive: true });
const temporary = check ? await mkdtemp(join(cache, "check-")) : null;
try {
  await createClient({ ...config, input, output: temporary ?? destination });
  if (check) {
    const [expected, actual] = await Promise.all([files(temporary), files(destination)]);
    const paths = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    const changed = [...paths].filter(path => expected[path] !== actual[path]);
    if (changed.length) throw new Error(`Generated client is stale: ${changed.join(", ")}. Run api:generate.`);
    console.log("Generated API client is up to date.");
  }
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
