import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { paths, PRODUCT_ID, SERVICE_LABEL, WINDOWS_TASK_NAME } from "./constants.mjs";

const execFileAsync = promisify(execFile);

function xml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function macServiceDefinition({ root, nodePath, port, home = process.env.HOME }) {
  const target = paths(root);
  const plist = join(home, "Library", "LaunchAgents", `${SERVICE_LABEL}.plist`);
  const argumentsList = [nodePath, join(target.runtime, "controller.mjs"), "--root", root, "--port", String(port)];
  const argumentXml = argumentsList.map((value) => `    <string>${xml(value)}</string>`).join("\n");
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${SERVICE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${argumentXml}
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>${xml(target.controllerLog)}</string>
  <key>StandardErrorPath</key><string>${xml(target.controllerLog)}</string>
</dict>
</plist>
`;
  return { type: "launch-agent", label: SERVICE_LABEL, path: plist, content, arguments: argumentsList };
}

export function windowsServiceDefinition({ root, nodePath, port }) {
  const target = paths(root);
  return {
    type: "scheduled-task",
    name: WINDOWS_TASK_NAME,
    nodePath,
    controllerPath: join(target.runtime, "controller.mjs"),
    root,
    port,
    scriptPath: join(target.runtime, "windows-task.ps1"),
  };
}

async function powershellPath() {
  return process.env.SystemRoot
    ? join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
}

async function runWindowsTask(definition, action) {
  const executable = await powershellPath();
  const args = [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", definition.scriptPath,
    "-Action", action,
    "-TaskName", definition.name,
    "-NodePath", definition.nodePath,
    "-ControllerPath", definition.controllerPath,
    "-Root", definition.root,
    "-Port", String(definition.port),
  ];
  const { stdout } = await execFileAsync(executable, args, { encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024 });
  return stdout.trim() ? JSON.parse(stdout) : { ok: true };
}

export async function registerService({ root, nodePath = process.execPath, port, platform = process.platform, dryRun = false }) {
  await access(nodePath);
  if (platform === "darwin") {
    const definition = macServiceDefinition({ root, nodePath, port });
    if (dryRun) return definition;
    await mkdir(dirname(definition.path), { recursive: true });
    try {
      const existing = await readFile(definition.path, "utf8");
      if (!existing.includes(PRODUCT_ID) || !existing.includes(SERVICE_LABEL)) {
        const error = new Error(`LaunchAgent conflict at ${definition.path}`);
        error.code = "SERVICE_CONFLICT";
        throw error;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await writeFile(definition.path, definition.content, { mode: 0o600 });
    const domain = `gui/${process.getuid()}`;
    await execFileAsync("/bin/launchctl", ["bootout", domain, definition.path]).catch(() => {});
    await execFileAsync("/bin/launchctl", ["bootstrap", domain, definition.path]);
    return definition;
  }
  if (platform === "win32") {
    const definition = windowsServiceDefinition({ root, nodePath, port });
    return dryRun ? definition : runWindowsTask(definition, "Install");
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

export async function unregisterService({ root, nodePath = process.execPath, port, platform = process.platform, dryRun = false }) {
  if (platform === "darwin") {
    const definition = macServiceDefinition({ root, nodePath, port });
    if (dryRun) return definition;
    try {
      const existing = await readFile(definition.path, "utf8");
      if (!existing.includes(PRODUCT_ID) || !existing.includes(SERVICE_LABEL)) {
        const error = new Error(`refusing to remove unowned LaunchAgent at ${definition.path}`);
        error.code = "SERVICE_CONFLICT";
        throw error;
      }
      await execFileAsync("/bin/launchctl", ["bootout", `gui/${process.getuid()}`, definition.path]).catch(() => {});
      await rm(definition.path, { force: true });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    return { removed: true, type: definition.type };
  }
  if (platform === "win32") {
    const definition = windowsServiceDefinition({ root, nodePath, port });
    return dryRun ? definition : runWindowsTask(definition, "Remove");
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

export async function kickService({ root, nodePath = process.execPath, port, platform = process.platform, dryRun = false }) {
  if (platform === "darwin") {
    if (dryRun) return { type: "launch-agent", action: "kickstart", label: SERVICE_LABEL };
    await execFileAsync("/bin/launchctl", ["kickstart", "-k", `gui/${process.getuid()}/${SERVICE_LABEL}`]);
    return { kicked: true };
  }
  if (platform === "win32") {
    const definition = windowsServiceDefinition({ root, nodePath, port });
    return dryRun ? { type: definition.type, action: "start" } : runWindowsTask(definition, "Start");
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

export async function detectExternalControllers({ root, platform = process.platform, home = process.env.HOME } = {}) {
  if (process.env.DESIGN_CODEX_THEME_ALLOW_EXTERNAL === "1") return [];
  if (platform === "darwin") {
    const directory = join(home, "Library", "LaunchAgents");
    let entries = [];
    try { entries = await readdir(directory); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    const conflicts = [];
    for (const name of entries.filter((value) => value.endsWith(".plist") && value !== `${SERVICE_LABEL}.plist`)) {
      const file = join(directory, name);
      const content = await readFile(file, "utf8").catch(() => "");
      if (/(Codex|ChatGPT)/i.test(content) && /remote-debugging-port|heige-codex-skin-studio|HeiGeCodex/i.test(content)) {
        conflicts.push({ type: "launch-agent", name, path: file });
      }
    }
    return conflicts;
  }
  if (platform === "win32") {
    const executable = await powershellPath();
    const script = `$items = Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -ne '${WINDOWS_TASK_NAME}' -and (($_.Actions.Execute + ' ' + $_.Actions.Arguments) -match 'Codex|ChatGPT') -and (($_.Actions.Arguments) -match 'remote-debugging-port|heige-codex-skin-studio') }; @($items | ForEach-Object { @{ type='scheduled-task'; name=$_.TaskName } }) | ConvertTo-Json -Compress`;
    const { stdout } = await execFileAsync(executable, ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true });
    if (!stdout.trim()) return [];
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return [];
}
