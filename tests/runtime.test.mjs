import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { filterRendererTargets } from "../scripts/runtime/cdp-client.mjs";
import { activateTheme, installTheme, listThemes, removeTheme } from "../scripts/runtime/store.mjs";
import { detectExternalControllers, macServiceDefinition, windowsServiceDefinition } from "../scripts/runtime/service.mjs";
import { codexAppCandidates, processDebugPorts } from "../scripts/runtime/codex-app.mjs";
import { sampleTheme, writeTheme } from "./helpers.mjs";

test("filters CDP targets to loopback Codex main renderer", () => {
  const valid = { type: "page", url: "app://-/index.html", webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/page/1" };
  const targets = filterRendererTargets([
    valid,
    { ...valid, url: "https://example.com" },
    { ...valid, webSocketDebuggerUrl: "ws://192.168.1.2:9222/devtools/page/1" },
    { ...valid, type: "worker" },
  ]);
  assert.deepEqual(targets, [valid]);
});

test("discovers current ChatGPT executable and future Codex bundle names", () => {
  const mac = codexAppCandidates({ platform: "darwin", home: "/Users/test" });
  assert.deepEqual(mac, [
    "/Applications/ChatGPT.app",
    "/Users/test/Applications/ChatGPT.app",
    "/Applications/Codex.app",
    "/Users/test/Applications/Codex.app",
  ]);
  const windows = codexAppCandidates({
    platform: "win32",
    home: "C:\\Users\\test",
    env: { LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local", ProgramFiles: "C:\\Program Files" },
  });
  assert.equal(windows[0], "C:\\Users\\test\\AppData\\Local\\Programs\\ChatGPT\\ChatGPT.exe");
  assert.equal(windows.at(-1), "C:\\Program Files\\Codex\\Codex.exe");
});

test("extracts only valid loopback debugging port arguments from process commands", () => {
  assert.deepEqual(processDebugPorts({ commandLines: [
    "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT --remote-debugging-port=9341",
    "Codex.exe --remote-debugging-port=9222 --other",
    "Codex.exe --remote-debugging-port=80",
  ] }), [9222, 9341]);
});

test("installs, switches, lists, and protects active themes", async () => {
  const root = await mkdtemp(join(tmpdir(), "dct-store-"));
  const first = await writeTheme(join(root, "source-one"));
  const secondTheme = sampleTheme({ id: "cream-paper", name: "Cream Paper", appearance: "light" });
  const second = await writeTheme(join(root, "source-two"), secondTheme);
  const store = join(root, "store");
  await installTheme(first, store);
  await installTheme(second, store);
  await activateTheme("midnight-paper", store);
  assert.deepEqual((await listThemes(store)).map((theme) => theme.id), ["cream-paper", "midnight-paper"]);
  await assert.rejects(removeTheme("midnight-paper", store), /active theme/);
  await assert.rejects(removeTheme("../../outside", store), /invalid theme id/);
  await activateTheme("cream-paper", store);
  await removeTheme("midnight-paper", store);
  assert.deepEqual((await listThemes(store)).map((theme) => theme.id), ["cream-paper"]);
});

test("renders service definitions for paths with spaces and Chinese", () => {
  const root = "/Users/测试 User/.codex/design-codex-theme";
  const mac = macServiceDefinition({ root, nodePath: "/opt/Node 22/bin/node", port: 9333, home: "/Users/测试 User" });
  assert.match(mac.content, /--root/);
  assert.match(mac.content, /测试 User/);
  assert.equal(mac.arguments.at(-1), "9333");
  const windows = windowsServiceDefinition({ root: "C:\\Users\\测试 User\\.codex\\design-codex-theme", nodePath: "C:\\Program Files\\nodejs\\node.exe", port: 9333 });
  assert.equal(windows.port, 9333);
  assert.match(windows.controllerPath, /controller\.mjs$/);
});

test("detects external macOS Codex debugging controllers without touching them", async () => {
  const home = await mkdtemp(join(tmpdir(), "dct-home-"));
  const agents = join(home, "Library", "LaunchAgents");
  await mkdir(agents, { recursive: true });
  await writeFile(join(agents, "external.plist"), "Codex --remote-debugging-port=9222 heige-codex-skin-studio");
  const conflicts = await detectExternalControllers({ root: join(home, ".codex", "design-codex-theme"), platform: "darwin", home });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].name, "external.plist");
});
