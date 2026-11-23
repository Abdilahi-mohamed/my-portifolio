import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = resolve(frontendRoot, "..");
const nextCli = join(projectRoot, "node_modules", "next", "dist", "bin", "next");

if (!existsSync(nextCli)) {
  console.error("Next.js is not installed at the project root. Run npm install from the project root first.");
  process.exit(1);
}

const next = spawn(process.execPath, [nextCli, "dev", ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: "inherit",
  windowsHide: true,
});
let shuttingDown = false;

function stop(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (next.exitCode === null && !next.killed) next.kill(signal);
}

next.on("error", (error) => {
  console.error(`Next.js could not be started: ${error.message}`);
  process.exitCode = 1;
});
next.on("exit", (code, signal) => {
  process.exitCode = shuttingDown ? 0 : code ?? (signal ? 1 : 0);
});

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
