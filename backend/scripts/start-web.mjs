import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(backendRoot, "..");
const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";
const children = [];
let shuttingDown = false;

function startApp(label, appDirectory, args) {
  const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : npm;
  const commandArgs = isWindows
    ? ["/d", "/s", "/c", `${npm} ${args.join(" ")}`]
    : args;
  const child = spawn(command, commandArgs, {
    cwd: resolve(projectRoot, appDirectory),
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.error(`${label} stopped${code === null ? "" : ` with exit code ${code}`}.`);
    stopApps(code ?? 1);
  });
  return child;
}

function stopApps(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), 4000).unref();
}

function findChrome() {
  const installRoots = [
    process.env.PROGRAMFILES,
    process.env["PROGRAMFILES(X86)"],
    process.env.ProgramW6432,
    process.env.LOCALAPPDATA,
  ].filter(Boolean);

  return installRoots
    .map((root) => join(root, "Google", "Chrome", "Application", "chrome.exe"))
    .find((chromePath) => existsSync(chromePath));
}

process.on("SIGINT", () => stopApps(0));
process.on("SIGTERM", () => stopApps(0));

startApp("Backend", "backend", ["run", "dev"]);
startApp("Frontend", "frontend", [
  "run",
  "dev",
  "--",
  "--host",
  "localhost",
  "--strictPort",
]);

const appUrl = "http://localhost:5173";
const deadline = Date.now() + 60_000;
let ready = false;
while (Date.now() < deadline && !shuttingDown) {
  try {
    const [api, site] = await Promise.all([
      fetch("http://127.0.0.1:4000/api/health"),
      fetch(appUrl),
    ]);
    if (api.ok && site.ok) {
      ready = true;
      break;
    }
  } catch {
  }
  await delay(400);
}

if (!ready || shuttingDown) {
  if (!shuttingDown) {
    console.error("The portfolio did not start. Check that ports 4000 and 5173 are available.");
    stopApps(1);
  }
} else if (isWindows) {
  const chromePath = findChrome();
  if (chromePath) {
    console.log(`Portfolio is ready at ${appUrl}. Opening Chrome...`);
    const browser = spawn(chromePath, [appUrl], {
      stdio: "ignore",
      windowsHide: true,
    });
    browser.on("error", (error) => {
      console.error(`Chrome could not be opened: ${error.message}`);
    });
  } else {
    console.error("Chrome was not found in the standard Windows install locations.");
  }
} else {
  console.log(`Portfolio is ready at ${appUrl}. Opening your default browser...`);
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const browser = spawn(command, [appUrl], { stdio: "ignore", detached: true });
  browser.on("error", (error) => {
    console.error(`Browser could not be opened: ${error.message}`);
  });
  browser.unref();
}

if (!shuttingDown) {
  await new Promise((resolveExit) => {
    const check = setInterval(() => {
      if (shuttingDown) {
        clearInterval(check);
        resolveExit();
      }
    }, 250);
  });
}
