import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const viteScript = join(frontendRoot, "node_modules", "vite", "bin", "vite.js");
const appUrl = "http://localhost:5173";
const vite = spawn(
  process.execPath,
  [viteScript, "--host", "localhost", "--strictPort"],
  { cwd: frontendRoot, stdio: "inherit", windowsHide: true },
);
let shuttingDown = false;

function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (vite.exitCode === null && !vite.killed) vite.kill("SIGTERM");
  process.exitCode = exitCode;
}

vite.on("error", (error) => {
  console.error(`The frontend could not be started: ${error.message}`);
  stop(1);
});
vite.on("exit", (code) => {
  if (!shuttingDown) {
    console.error(`The frontend stopped${code === null ? "" : ` with exit code ${code}`}.`);
    stop(code ?? 1);
  }
});
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

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

const deadline = Date.now() + 60_000;
let ready = false;
while (Date.now() < deadline && !shuttingDown && vite.exitCode === null) {
  try {
    const response = await fetch(appUrl);
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    await delay(400);
  }
}

if (!ready && !shuttingDown) {
  console.error("The frontend did not become ready at http://localhost:5173.");
  stop(1);
} else if (ready && process.platform === "win32") {
  const chromePath = findChrome();
  const browser = chromePath
    ? spawn(chromePath, [appUrl], { stdio: "ignore", windowsHide: true })
    : spawn(process.env.ComSpec ?? "cmd.exe", ["/c", "start", "", appUrl], {
      stdio: "ignore",
      windowsHide: true,
    });
  browser.on("error", (error) => {
    console.error(`The browser could not be opened: ${error.message}`);
  });
} else if (ready) {
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const browser = spawn(command, [appUrl], { stdio: "ignore", detached: true });
  browser.on("error", (error) => {
    console.error(`The browser could not be opened: ${error.message}`);
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
