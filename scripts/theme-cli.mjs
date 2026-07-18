#!/usr/bin/env node
import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PORT, paths, PRODUCT_ID, runtimeRoot } from "./runtime/constants.mjs";
import {
  activeTheme,
  activateTheme,
  atomicJson,
  clearActive,
  ensureLayout,
  installTheme,
  listThemes,
  readJson,
  removeTheme,
} from "./runtime/store.mjs";
import { loadThemeDirectory } from "./runtime/schema.mjs";
import { applyThemeToCodex, removeThemeFromCodex, verifyTheme } from "./runtime/injector.mjs";
import { fetchRendererTargets } from "./runtime/cdp-client.mjs";
import { codexProcessInfo, findCodexApplication, processDebugPorts } from "./runtime/codex-app.mjs";
import {
  detectExternalControllers,
  kickService,
  macServiceDefinition,
  registerService,
  unregisterService,
  windowsServiceDefinition,
} from "./runtime/service.mjs";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

function usage() {
  return `design-codex-theme

Commands:
  install --theme <directory> [--restart]
  apply <theme-id>
  list [--json]
  status [--json]
  restore [--restart]
  remove <theme-id>
  uninstall --purge
  doctor [--json]`;
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) result._.push(value);
    else if (["--restart", "--purge", "--json", "--dry-run"].includes(value)) result[value.slice(2)] = true;
    else {
      const next = argv[++index];
      if (!next || next.startsWith("--")) throw new Error(`${value} requires a value`);
      result[value.slice(2)] = next;
    }
  }
  return result;
}

function assertNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) throw new Error("Node.js 22 or newer is required");
}

function resolveContext(args) {
  const root = resolve(args.root ?? runtimeRoot());
  if (root === parse(root).root || basename(root) !== PRODUCT_ID) {
    throw new Error(`runtime root must end with ${PRODUCT_ID} and cannot be a filesystem root`);
  }
  const port = args.port === undefined ? DEFAULT_PORT : Number(args.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("--port must be between 1024 and 65535");
  return { root, port };
}

async function copyRuntime(root) {
  const target = await ensureLayout(root);
  const source = join(SCRIPT_DIRECTORY, "runtime");
  const temporary = join(root, `.runtime.tmp-${randomUUID()}`);
  const backup = join(root, `.runtime.backup-${randomUUID()}`);
  let retired = false;
  let published = false;
  await cp(source, temporary, { recursive: true, errorOnExist: true, force: false });
  await cp(join(SCRIPT_DIRECTORY, "windows", "windows-task.ps1"), join(temporary, "windows-task.ps1"));
  await access(join(temporary, "controller.mjs"));
  try {
    try { await rename(target.runtime, backup); retired = true; } catch (error) { if (error?.code !== "ENOENT") throw error; }
    await rename(temporary, target.runtime);
    published = true;
    if (retired) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (published) await rm(target.runtime, { recursive: true, force: true }).catch(() => {});
    if (retired) await rename(backup, target.runtime).catch(() => {});
    await rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return target.runtime;
}

async function rendererAvailable(port) {
  try { return (await fetchRendererTargets(port)).length > 0; } catch { return false; }
}

async function externalControllerConflicts(root) {
  const conflicts = await detectExternalControllers({ root });
  const state = await readJson(paths(root).state);
  const processInfo = await codexProcessInfo().catch(() => ({ running: false, commandLines: [] }));
  const ports = processDebugPorts(processInfo);
  const ownedPort = state?.productId === PRODUCT_ID ? state.port : null;
  for (const port of ports) {
    if (port !== ownedPort) conflicts.push({ type: "running-process", port, detail: "Codex Desktop already has an unowned remote-debugging port" });
  }
  return conflicts;
}

async function applyNow(root, port) {
  const loaded = await activeTheme(root);
  if (!loaded || !(await rendererAvailable(port))) return { applied: false, reason: "restart-scheduled" };
  await applyThemeToCodex(port, loaded);
  return { applied: await verifyTheme(port, loaded.theme.id), id: loaded.theme.id };
}

async function installCommand(args) {
  if (!args.theme) throw new Error("install requires --theme <directory>");
  const { root, port } = resolveContext(args);
  const loaded = await loadThemeDirectory(args.theme);
  const conflicts = await externalControllerConflicts(root);
  if (args["dry-run"]) {
    const service = process.platform === "darwin"
      ? macServiceDefinition({ root, nodePath: process.execPath, port })
      : windowsServiceDefinition({ root, nodePath: process.execPath, port });
    return { status: "dry-run", theme: loaded.theme, root, service, installable: conflicts.length === 0, conflicts };
  }
  if (conflicts.length > 0) {
    const error = new Error("another Codex debugging controller was found; disable it or rerun after explicit migration approval");
    error.code = "EXTERNAL_CONTROLLER_CONFLICT";
    error.conflicts = conflicts;
    throw error;
  }

  const target = await ensureLayout(root);
  const previousActive = await readJson(target.active);
  const previousState = await readJson(target.state);
  let serviceRegistered = false;
  await atomicJson(target.transaction, {
    schemaVersion: 1,
    action: "install",
    theme: loaded.theme.id,
    status: "started",
    startedAt: new Date().toISOString(),
  });
  try {
    await copyRuntime(root);
    const installed = await installTheme(args.theme, root);
    await activateTheme(installed.theme.id, root);
    await atomicJson(target.state, {
      schemaVersion: 1,
      productId: PRODUCT_ID,
      status: "installed",
      activeTheme: installed.theme.id,
      port,
      nodePath: process.execPath,
      platform: process.platform,
      updatedAt: new Date().toISOString(),
    });
    await registerService({ root, nodePath: process.execPath, port });
    serviceRegistered = true;
    await kickService({ root, nodePath: process.execPath, port }).catch(() => {});
    if (args.restart && !(await codexProcessInfo()).running) {
      const helper = join(target.runtime, "controller.mjs");
      const child = spawn(process.execPath, [helper, "--root", root, "--port", String(port), "--once", "--restart"], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
    }
    const activation = await applyNow(root, port);
    await atomicJson(target.transaction, {
      schemaVersion: 1,
      action: "install",
      theme: installed.theme.id,
      status: activation.applied ? "verified" : "restart-scheduled",
      completedAt: new Date().toISOString(),
    });
    return {
      status: activation.applied ? "installed-and-verified" : "installed-restart-scheduled",
      theme: installed.theme,
      path: installed.path,
      root,
      restartRequested: Boolean(args.restart),
    };
  } catch (error) {
    if (serviceRegistered) await unregisterService({ root, nodePath: process.execPath, port }).catch(() => {});
    if (previousActive) await atomicJson(target.active, previousActive).catch(() => {});
    else await clearActive(root).catch(() => {});
    if (previousState) await atomicJson(target.state, previousState).catch(() => {});
    else await rm(target.state, { force: true }).catch(() => {});
    await atomicJson(target.transaction, {
      schemaVersion: 1,
      action: "install",
      theme: loaded.theme.id,
      status: "rolled-back",
      error: error.message,
      completedAt: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }
}

async function applyCommand(args) {
  const id = args._[1];
  if (!id) throw new Error("apply requires a theme id");
  const { root, port } = resolveContext(args);
  const state = await readJson(paths(root).state);
  if (state?.productId !== PRODUCT_ID || !state?.nodePath) throw new Error("runtime is not installed; run install first");
  await activateTheme(id, root);
  let kickError = null;
  await kickService({ root, nodePath: state.nodePath, port }).catch((error) => { kickError = error; });
  const activation = await applyNow(root, port);
  if (!activation.applied && kickError) throw kickError;
  return { status: activation.applied ? "applied-and-verified" : "apply-scheduled", id };
}

async function statusCommand(args) {
  const { root, port } = resolveContext(args);
  const target = paths(root);
  const [active, state, themes] = await Promise.all([
    readJson(target.active),
    readJson(target.state),
    listThemes(root),
  ]);
  const cdp = await rendererAvailable(port);
  let verified = false;
  if (cdp && active?.id) verified = await verifyTheme(port, active.id).catch(() => false);
  return { root, activeTheme: active?.id ?? null, installedThemes: themes, runtime: state, cdp, verified };
}

async function restoreCommand(args) {
  const { root, port } = resolveContext(args);
  const target = paths(root);
  const state = await readJson(target.state, {});
  if (state.productId !== PRODUCT_ID) {
    const conflicts = await externalControllerConflicts(root);
    if (conflicts.length > 0) {
      const error = new Error("default appearance cannot be restored by this skill because the active controller is not owned by design-codex-theme");
      error.code = "EXTERNAL_CONTROLLER_CONFLICT";
      error.conflicts = conflicts;
      throw error;
    }
    return { status: "already-default", preservedThemes: true };
  }
  if (await rendererAvailable(port)) await removeThemeFromCodex(port).catch(() => {});
  await clearActive(root);
  await unregisterService({ root, nodePath: state.nodePath ?? process.execPath, port });
  await atomicJson(target.state, {
    ...state,
    schemaVersion: 1,
    productId: PRODUCT_ID,
    status: "restored",
    port,
    nodePath: state.nodePath ?? process.execPath,
    updatedAt: new Date().toISOString(),
  });
  if (args.restart) {
    const helper = join(target.runtime, "controller.mjs");
    await access(helper);
    const child = spawn(state.nodePath ?? process.execPath, [helper, "--root", root, "--port", String(port), "--once", "--restart-native"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  }
  return { status: args.restart ? "restored-restart-scheduled" : "restored", preservedThemes: true };
}

async function uninstallCommand(args) {
  if (!args.purge) throw new Error("uninstall requires --purge");
  const { root, port } = resolveContext(args);
  const state = await readJson(paths(root).state, {});
  if (state.productId !== PRODUCT_ID) throw new Error("refusing to purge runtime without valid ownership state");
  if (await rendererAvailable(port)) await removeThemeFromCodex(port).catch(() => {});
  await unregisterService({ root, nodePath: state.nodePath ?? process.execPath, port });
  await rm(root, { recursive: true, force: true });
  return { status: "uninstalled", purged: true, root };
}

async function doctorCommand(args) {
  const { root, port } = resolveContext(args);
  const checks = {
    node: { ok: Number(process.versions.node.split(".")[0]) >= 22, version: process.version, path: process.execPath },
    platform: { ok: ["darwin", "win32"].includes(process.platform), value: process.platform },
    runtime: { root, state: await readJson(paths(root).state) },
    cdp: { ok: await rendererAvailable(port), port, loopbackOnly: true },
    conflicts: await externalControllerConflicts(root),
  };
  try { checks.codex = { ok: true, path: await findCodexApplication() }; }
  catch (error) { checks.codex = { ok: false, error: error.message }; }
  checks.ok = checks.node.ok && checks.platform.ok && checks.codex.ok && checks.conflicts.length === 0;
  return checks;
}

async function main() {
  assertNode();
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  let result;
  if (command === "install") result = await installCommand(args);
  else if (command === "apply") result = await applyCommand(args);
  else if (command === "list") result = { themes: await listThemes(resolveContext(args).root) };
  else if (command === "status") result = await statusCommand(args);
  else if (command === "restore") result = await restoreCommand(args);
  else if (command === "remove") {
    const id = args._[1];
    if (!id) throw new Error("remove requires a theme id");
    await removeTheme(id, resolveContext(args).root);
    result = { status: "removed", id };
  } else if (command === "uninstall") result = await uninstallCommand(args);
  else if (command === "doctor") result = await doctorCommand(args);
  else if (command === "help" || args.help || !command) {
    process.stdout.write(`${usage()}\n`);
    return;
  } else throw new Error(`unknown command: ${command}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ error: error.message, code: error.code ?? "COMMAND_FAILED", conflicts: error.conflicts ?? undefined }, null, 2)}\n`);
  process.exitCode = 1;
});
