import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, open, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const backend = resolve(root, "../trpg-backend");
const python = join(backend, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
const cache = join(root, "node_modules/.cache/trpg-api");
await mkdir(cache, { recursive: true });
const directory = await mkdtemp(join(cache, "integration-"));
const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const { port } = socket.address();
await new Promise(resolve => socket.close(resolve));
const apiUrl = `http://127.0.0.1:${port}`;
const logPath = join(directory, "backend.log");
const log = await open(logPath, "w");
const service = spawn(python, ["-B", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
  "--port", String(port), "--log-level", "warning", "--no-access-log"], {
  cwd: backend,
  windowsHide: true,
  stdio: ["ignore", log.fd, log.fd],
  env: {
    ...process.env,
    DATABASE_URL: `sqlite+aiosqlite:///${join(directory, "test.db").replaceAll("\\", "/")}`,
    AUTH_TOKEN_SECRET: randomBytes(32).toString("hex"),
    DB_SNAPSHOT_ON_SHUTDOWN: "false",
    ALLOW_FIRST_USER_REGISTRATION: "true",
    REFRESH_TOKEN_COOKIE_SECURE: "false",
    CORS_ORIGINS: "http://localhost:5173",
  },
});
let spawnError;
const serviceClosed = new Promise(resolve => service.once("close", resolve));
service.on("error", error => { spawnError = error; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 75; attempt++) {
    if (spawnError) throw spawnError;
    if (service.exitCode !== null) throw new Error("Local API exited during startup");
    try {
      const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for migrations and server startup. */ }
    await delay(200);
  }
  if (!ready) throw new Error("Local API did not become ready within 15 seconds");
  console.log(`Isolated API ready at ${apiUrl}; temporary SQLite database: ${directory}`);
  const tests = spawn(process.execPath, [join(root, "node_modules/vitest/vitest.mjs"), "run",
    "--config", "vitest.integration.config.ts"], {
    cwd: root, windowsHide: true, stdio: "inherit",
    env: { ...process.env, VITE_TRPG_API_URL: apiUrl, TRPG_TEST_ISOLATED_API: "1" },
  });
  const [code] = await once(tests, "exit");
  if (code !== 0) throw new Error(`Integration tests failed (exit ${code})`);
} catch (error) {
  console.error(await readFile(logPath, "utf8"));
  throw error;
} finally {
  if (service.pid && service.exitCode === null && !spawnError) {
    if (process.platform === "win32") {
      const stop = spawn("taskkill.exe", ["/PID", String(service.pid), "/T", "/F"], {
        windowsHide: true, stdio: "ignore",
      });
      await once(stop, "exit");
    } else {
      service.kill("SIGTERM");
    }
    await Promise.race([serviceClosed, delay(5000, undefined, { ref: false })]);
  }
  await log.close();
  console.log(`Local API stopped. Test artifacts: ${directory}`);
}
