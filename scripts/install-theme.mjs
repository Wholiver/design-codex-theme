#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { ensureRuntime, runtimeRoot, TESTED_RUNTIME_REF } from "./bootstrap-runtime.mjs";

const execFile = promisify(execFileCallback);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function usage() {
  return `Usage: node install-theme.mjs --image ABSOLUTE_PATH --name NAME [options]

Options:
  --appearance light|dark|system
  --accent HEX --secondary HEX --surface HEX --text HEX
  --preview-focus X,Y --thumbnail-focus X,Y --thumbnail-zoom 100..400
  --port 9341 --no-apply --no-bootstrap --dry-run --runtime-ref REF`;
}

function parseArgs(argv) {
  const booleans = new Set(["no-apply", "no-bootstrap", "dry-run", "help"]);
  const values = new Set([
    "image", "name", "appearance", "accent", "secondary", "surface", "text",
    "preview-focus", "thumbnail-focus", "thumbnail-zoom", "port", "runtime-ref",
  ]);
  const args = { port: 9341, "runtime-ref": TESTED_RUNTIME_REF };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) throw new Error(`Unexpected positional argument: ${token}`);
    const key = token.slice(2);
    if (booleans.has(key)) args[key] = true;
    else if (values.has(key)) {
      if (i + 1 >= argv.length) throw new Error(`${token} requires a value`);
      args[key] = argv[++i];
    } else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function parseFocus(value, label) {
  if (value === undefined) return undefined;
  const match = /^(\d{1,3}),(\d{1,3})$/.exec(value);
  if (!match) throw new Error(`${label} must be X,Y integers from 0 through 100`);
  const focus = { x: Number(match[1]), y: Number(match[2]) };
  if (focus.x > 100 || focus.y > 100) throw new Error(`${label} must be X,Y integers from 0 through 100`);
  return focus;
}

async function validate(args) {
  if (args.help) return;
  if (!args.image || !args.name) throw new Error("--image and --name are required");
  if (!isAbsolute(args.image)) throw new Error("--image must be an absolute path");
  const info = await stat(args.image).catch(() => null);
  if (!info?.isFile()) throw new Error("--image must point to a regular file");
  if (!IMAGE_EXTENSIONS.has(extname(args.image).toLowerCase())) {
    throw new Error("--image must be PNG, JPG, JPEG, or WebP");
  }
  if (info.size > 8 * 1024 * 1024) throw new Error("--image exceeds upstream 8 MB limit");
  if (!args.name.trim() || args.name.length > 80) throw new Error("--name must contain 1 through 80 characters");
  if (args.appearance && !new Set(["light", "dark", "system"]).has(args.appearance)) {
    throw new Error("--appearance must be light, dark, or system");
  }
  for (const key of ["accent", "secondary", "surface", "text"]) {
    if (args[key] !== undefined && !HEX.test(args[key])) throw new Error(`--${key} must be a valid CSS hex color`);
  }
  parseFocus(args["preview-focus"], "--preview-focus");
  parseFocus(args["thumbnail-focus"], "--thumbnail-focus");
  if (args["thumbnail-zoom"] !== undefined) {
    const zoom = Number(args["thumbnail-zoom"]);
    if (!Number.isInteger(zoom) || zoom < 100 || zoom > 400) {
      throw new Error("--thumbnail-zoom must be an integer from 100 through 400");
    }
  }
  const port = Number(args.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("--port must be an integer from 1024 through 65535");
  args.port = port;
}

function userThemesRoot() {
  if (process.platform === "win32") {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "HeiGeCodexSkinStudio", "themes");
  }
  return join(homedir(), "Library", "Application Support", "HeiGeCodexSkinStudio", "themes");
}

async function runCli(root, cliArgs) {
  let result;
  if (process.platform === "darwin") {
    result = await execFile("/bin/zsh", [join(root, "scripts", "lib", "run-cli.zsh"), ...cliArgs], {
      encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
    });
  } else if (process.platform === "win32") {
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 22) throw new Error("Windows theme creation requires Node.js 22 or newer");
    result = await execFile(process.execPath, [join(root, "src", "cli.mjs"), ...cliArgs], {
      encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
    });
  } else throw new Error("Codex Desktop themes support macOS and Windows only");
  return JSON.parse(result.stdout);
}

async function patchManifest(root, created, args) {
  const expectedRoot = resolve(userThemesRoot());
  const themePath = resolve(created.path ?? "");
  if (dirname(themePath) !== expectedRoot || relative(expectedRoot, themePath).startsWith("..")) {
    throw new Error("Upstream CLI returned theme path outside user theme store");
  }
  const manifestPath = join(themePath, "theme.json");
  await access(manifestPath, fsConstants.R_OK | fsConstants.W_OK);
  const original = await readFile(manifestPath);
  const manifest = JSON.parse(original.toString("utf8"));
  const suppliedColors = Object.fromEntries(
    ["accent", "secondary", "surface", "text"]
      .filter((key) => args[key] !== undefined)
      .map((key) => [key, args[key]]),
  );
  manifest.colors = { ...manifest.colors, ...suppliedColors };
  if (args.appearance) manifest.appearance = args.appearance;
  const previewFocus = parseFocus(args["preview-focus"], "--preview-focus");
  const thumbnailFocus = parseFocus(args["thumbnail-focus"], "--thumbnail-focus");
  if (previewFocus) manifest.previewFocus = previewFocus;
  if (thumbnailFocus) manifest.thumbnailFocus = thumbnailFocus;
  if (args["thumbnail-zoom"] !== undefined) manifest.thumbnailZoom = Number(args["thumbnail-zoom"]);

  const transaction = randomUUID();
  const temporary = join(themePath, `.theme.json.tmp-${transaction}`);
  const backup = join(themePath, `.theme.json.backup-${transaction}`);
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  let originalRetired = false;
  let replacementPublished = false;
  try {
    await rename(manifestPath, backup);
    originalRetired = true;
    await rename(temporary, manifestPath);
    replacementPublished = true;
    const themes = await runCli(root, ["list"]);
    if (!Array.isArray(themes) || !themes.some((theme) => theme.id === created.id)) {
      throw new Error("Updated theme failed upstream schema validation");
    }
    await rm(backup, { force: true });
    return manifest;
  } catch (error) {
    if (replacementPublished) await rm(manifestPath, { force: true }).catch(() => {});
    if (originalRetired) await rename(backup, manifestPath).catch(() => {});
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function windowsPowerShell() {
  const systemRoot = process.env.SystemRoot;
  return systemRoot
    ? join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
}

async function applyTheme(root, id, port) {
  if (process.platform === "darwin") {
    const { stdout } = await execFile("/bin/zsh", [join(root, "scripts", "apply.command"), id], {
      encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
    });
    return stdout.trim();
  }
  if (process.platform === "win32") {
    const { stdout } = await execFile(windowsPowerShell(), [
      "-NoProfile", "-ExecutionPolicy", "Bypass",
      "-File", join(root, "scripts", "windows", "apply.ps1"),
      "-Theme", id, "-Port", String(port),
    ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    return stdout.trim();
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  await validate(args);
  if (args["dry-run"]) {
    process.stdout.write(`${JSON.stringify({
      status: "dry-run",
      image: args.image,
      name: args.name,
      runtime: runtimeRoot(),
      runtimeRef: args["runtime-ref"],
      wouldApply: !args["no-apply"],
    }, null, 2)}\n`);
    return;
  }

  if (args["no-bootstrap"]) {
    await access(join(runtimeRoot(), "src", "cli.mjs"), fsConstants.R_OK);
  } else {
    await ensureRuntime({ ref: args["runtime-ref"] });
  }
  const root = runtimeRoot();
  const created = await runCli(root, ["create", "--image", args.image, "--name", args.name]);
  const manifest = await patchManifest(root, created, args);
  const applied = args["no-apply"] ? null : await applyTheme(root, created.id, args.port);
  process.stdout.write(`${JSON.stringify({
    status: applied === null ? "installed" : "installed-and-applied",
    id: created.id,
    path: created.path,
    manifest,
    applyOutput: applied,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`design-codex-theme: ${error.message}\n`);
  process.exitCode = 1;
});
