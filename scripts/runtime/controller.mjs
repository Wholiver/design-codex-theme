#!/usr/bin/env node
import { appendFile } from "node:fs/promises";
import { activeTheme, atomicJson, ensureLayout, readJson } from "./store.mjs";
import { applyThemeToCodex, verifyTheme } from "./injector.mjs";
import { fetchRendererTargets } from "./cdp-client.mjs";
import { codexProcessInfo, launchCodex, restartCodex } from "./codex-app.mjs";
import { DEFAULT_PORT, paths, runtimeRoot } from "./constants.mjs";

function parseArgs(argv) {
  const result = { once: false, restart: false, restartNative: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--once") result.once = true;
    else if (arg === "--restart") result.restart = true;
    else if (arg === "--restart-native") result.restartNative = true;
    else if (arg === "--root") result.root = argv[++index];
    else if (arg === "--port") result.port = Number(argv[++index]);
    else throw new Error(`unknown controller argument: ${arg}`);
  }
  result.root ??= runtimeRoot();
  result.port ??= DEFAULT_PORT;
  return result;
}

async function log(root, level, message, extra = {}) {
  const target = await ensureLayout(root);
  const line = JSON.stringify({ at: new Date().toISOString(), level, message, ...extra });
  await appendFile(target.controllerLog, `${line}\n`, { mode: 0o600 }).catch(() => {});
}

async function rendererReady(port) {
  try { return (await fetchRendererTargets(port)).length > 0; } catch { return false; }
}

async function waitForRenderer(port, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await rendererReady(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function ensureDebugCodex({ port, force = false }) {
  if (await rendererReady(port)) return true;
  const processInfo = await codexProcessInfo();
  if (!processInfo.running) {
    if (!force) return false;
    await launchCodex({ port });
  } else if (!processInfo.debug || force) {
    await restartCodex({ port });
  }
  return waitForRenderer(port);
}

async function applyActive(args) {
  const loaded = await activeTheme(args.root);
  if (!loaded) return { status: "idle" };
  const ready = await ensureDebugCodex({ port: args.port, force: args.restart });
  args.restart = false;
  if (!ready) return { status: "waiting-for-codex", id: loaded.theme.id };
  let verified = false;
  try { verified = await verifyTheme(args.port, loaded.theme.id); } catch {}
  if (!verified) await applyThemeToCodex(args.port, loaded);
  verified = await verifyTheme(args.port, loaded.theme.id);
  const state = {
    ...(await readJson(paths(args.root).state, {})),
    schemaVersion: 1,
    status: verified ? "applied" : "verification-failed",
    activeTheme: loaded.theme.id,
    port: args.port,
    updatedAt: new Date().toISOString(),
  };
  await atomicJson(paths(args.root).state, state);
  await log(args.root, verified ? "info" : "error", state.status, { theme: loaded.theme.id });
  return state;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.restartNative) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await restartCodex({ port: null });
    return;
  }
  if (args.once) {
    await applyActive(args);
    return;
  }
  await log(args.root, "info", "controller-started", { pid: process.pid, port: args.port });
  let lastRestartAttempt = 0;
  for (;;) {
    try {
      const processInfo = await codexProcessInfo();
      if (processInfo.running && !(await rendererReady(args.port)) && Date.now() - lastRestartAttempt > 15000) {
        args.restart = true;
        lastRestartAttempt = Date.now();
      }
      await applyActive(args);
    } catch (error) {
      await log(args.root, "error", error.message, { code: error.code ?? null });
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
}

main().catch(async (error) => {
  const rootIndex = process.argv.indexOf("--root");
  const root = rootIndex >= 0 ? process.argv[rootIndex + 1] : runtimeRoot();
  await log(root, "fatal", error.message, { code: error.code ?? null });
  process.exitCode = 1;
});
