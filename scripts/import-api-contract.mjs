import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    source: { type: "string" },
    "backend-sha": { type: "string" },
  },
});
if (!values.source) throw new Error("Provide --source <backend contracts/openapi.json>");
if (values["backend-sha"] && !/^[0-9a-f]{40}$/.test(values["backend-sha"])) {
  throw new Error("--backend-sha must be an immutable 40-character Git commit SHA");
}
const bytes = await readFile(values.source);
const schema = JSON.parse(bytes);
if (!schema.openapi?.startsWith("3.1.") || !schema.paths || !schema.components) {
  throw new Error("Expected an OpenAPI 3.1 document with paths and components");
}
const directory = new URL("../contracts/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("openapi.json", directory), bytes);
await writeFile(new URL("source.json", directory), JSON.stringify({
  repository: "andre-a13/trpg_python_backend",
  revision: values["backend-sha"] ?? null,
  source: values["backend-sha"] ? "commit" : "working-tree",
  sha256: createHash("sha256").update(bytes).digest("hex"),
}, null, 2) + "\n");
console.log("Imported API contract. Run npm run api:generate.");
