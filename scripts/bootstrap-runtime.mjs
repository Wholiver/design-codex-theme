#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TESTED_RUNTIME_REF = "770a03ce1f7a52fa2faa72062164e9d18cad4e27";
export const RUNTIME_REPOSITORY = "https://github.com/HeiGeAi/heige-codex-skin-studio.git";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? `exit ${code}`})`));
    });
  });
}

async function isFile(path) {
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function windowsPowerShell() {
  const root = process.env.SystemRoot;
  return root
    ? join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
}

export function runtimeRoot() {
  return join(homedir(), ".codex", "heige-codex-skin-studio");
}

export async function ensureRuntime({
  ref = TESTED_RUNTIME_REF,
  refresh = false,
  dryRun = false,
} = {}) {
  const target = runtimeRoot();
  const installedCli = join(target, "src", "cli.mjs");
  if (!refresh && await isFile(installedCli)) {
    return { status: "already-installed", target, ref: null };
  }
  if (!new Set(["darwin", "win32"]).has(process.platform)) {
    throw new Error("Codex Desktop theme runtime supports macOS and Windows only");
  }
  if (dryRun) {
    return { status: "would-install", target, ref, repository: RUNTIME_REPOSITORY };
  }

  const temporary = await mkdtemp(join(tmpdir(), "design-codex-theme-"));
  const source = join(temporary, "source");
  try {
    await run("git", ["init", source]);
    await run("git", ["-C", source, "remote", "add", "origin", RUNTIME_REPOSITORY]);
    await run("git", ["-C", source, "fetch", "--depth", "1", "origin", ref]);
    await run("git", ["-C", source, "checkout", "--detach", "FETCH_HEAD"]);

    const sourceCli = join(source, "src", "cli.mjs");
    if (!await isFile(sourceCli)) throw new Error("Downloaded runtime is missing src/cli.mjs");

    if (process.platform === "darwin") {
      await run("/bin/zsh", [join(source, "scripts", "install.command")], {
        env: { ...process.env, HEIGE_SKIP_APPLY: "1" },
      });
    } else {
      await run(windowsPowerShell(), [
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", join(source, "scripts", "windows", "install.ps1"),
        "-SkipApply",
      ]);
    }

    if (!await isFile(installedCli)) throw new Error("Runtime installer completed without installed CLI");
    return { status: refresh ? "refreshed" : "installed", target, ref };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const result = { ref: TESTED_RUNTIME_REF, refresh: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--refresh") result.refresh = true;
    else if (token === "--dry-run") result.dryRun = true;
    else if (token === "--ref") result.ref = argv[++i];
    else if (token === "--help") result.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!result.ref) throw new Error("--ref requires a value");
  return result;
}

function isMain() {
  return Boolean(process.argv[1])
    && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(resolve(process.argv[1])));
}

if (isMain()) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write("Usage: node bootstrap-runtime.mjs [--ref REF] [--refresh] [--dry-run]\n");
    } else {
      process.stdout.write(`${JSON.stringify(await ensureRuntime(args), null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`design-codex-theme: ${error.message}\n`);
    process.exitCode = 1;
  }
}
