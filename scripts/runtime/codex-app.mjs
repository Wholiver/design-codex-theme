import { access } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { join, posix, win32 } from "node:path";

const execFileAsync = promisify(execFile);

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function powershell(script) {
  const executable = process.env.SystemRoot
    ? join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
  return execFileAsync(executable, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

export async function codexProcessInfo(platform = process.platform) {
  if (platform === "darwin") {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,command="], { encoding: "utf8" });
    const lines = stdout.split("\n").filter((line) => /\/(ChatGPT|Codex)\.app\/Contents\/MacOS\/(ChatGPT|Codex)(?:\s|$)/.test(line));
    return {
      running: lines.length > 0,
      debug: lines.some((line) => line.includes("--remote-debugging-port=")),
      commandLines: lines.map((line) => line.trim()),
    };
  }
  if (platform === "win32") {
    const { stdout } = await powershell(
      "$p = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -in @('ChatGPT.exe', 'Codex.exe') }; " +
      "@($p | ForEach-Object { @{ pid = $_.ProcessId; commandLine = $_.CommandLine; path = $_.ExecutablePath } }) | ConvertTo-Json -Compress",
    );
    const parsed = stdout.trim() ? JSON.parse(stdout) : [];
    const processes = Array.isArray(parsed) ? parsed : [parsed];
    return {
      running: processes.length > 0,
      debug: processes.some((item) => item.commandLine?.includes("--remote-debugging-port=")),
      commandLines: processes.map((item) => item.commandLine ?? ""),
      executable: processes.find((item) => item.path)?.path ?? null,
    };
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

export function processDebugPorts(processInfo) {
  const ports = new Set();
  for (const commandLine of processInfo?.commandLines ?? []) {
    for (const match of commandLine.matchAll(/--remote-debugging-port=(\d{4,5})(?:\s|$)/g)) {
      const port = Number(match[1]);
      if (port >= 1024 && port <= 65535) ports.add(port);
    }
  }
  return [...ports].sort((a, b) => a - b);
}

export async function findCodexApplication(platform = process.platform) {
  if (process.env.DESIGN_CODEX_APP && await exists(process.env.DESIGN_CODEX_APP)) return process.env.DESIGN_CODEX_APP;
  const candidates = codexAppCandidates({ platform });
  if (platform === "win32") {
    const running = await codexProcessInfo(platform);
    if (running.executable && await exists(running.executable)) return running.executable;
  }
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error(`Codex Desktop application was not found in: ${candidates.join(", ")}`);
}

export function codexAppCandidates({ platform = process.platform, env = process.env, home = env.HOME ?? "" } = {}) {
  if (platform === "darwin") {
    return [
      "/Applications/ChatGPT.app",
      posix.join(home, "Applications", "ChatGPT.app"),
      "/Applications/Codex.app",
      posix.join(home, "Applications", "Codex.app"),
    ];
  }
  if (platform === "win32") {
    const local = env.LOCALAPPDATA ?? win32.join(home, "AppData", "Local");
    const programFiles = env.ProgramFiles ?? "C:\\Program Files";
    return [
      win32.join(local, "Programs", "ChatGPT", "ChatGPT.exe"),
      win32.join(local, "Programs", "Codex", "Codex.exe"),
      win32.join(programFiles, "ChatGPT", "ChatGPT.exe"),
      win32.join(programFiles, "Codex", "Codex.exe"),
    ];
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

export async function quitCodex(platform = process.platform) {
  if (platform === "darwin") {
    await execFileAsync("/usr/bin/osascript", ["-e", "tell application \"ChatGPT\" to quit", "-e", "tell application \"Codex\" to quit"], { encoding: "utf8" }).catch(() => {});
    return;
  }
  if (platform === "win32") {
    await powershell("Get-Process ChatGPT,Codex -ErrorAction SilentlyContinue | Stop-Process").catch(() => {});
    return;
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

export async function waitForCodexExit({ platform = process.platform, timeoutMs = 12000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await codexProcessInfo(platform)).running) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

export async function launchCodex({ platform = process.platform, port = null } = {}) {
  const application = await findCodexApplication(platform);
  const debugArgs = port === null ? [] : ["--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${port}`];
  if (platform === "darwin") {
    const args = ["-na", application];
    if (debugArgs.length) args.push("--args", ...debugArgs);
    const child = spawn("/usr/bin/open", args, { detached: true, stdio: "ignore" });
    child.unref();
    return { application, args: debugArgs };
  }
  if (platform === "win32") {
    const child = spawn(application, debugArgs, { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    return { application, args: debugArgs };
  }
  throw new Error("Codex Desktop themes support macOS and Windows only");
}

export async function restartCodex({ platform = process.platform, port = null } = {}) {
  await quitCodex(platform);
  const exited = await waitForCodexExit({ platform });
  if (!exited) throw new Error("Codex did not exit in time; close it manually and run apply again");
  return launchCodex({ platform, port });
}
