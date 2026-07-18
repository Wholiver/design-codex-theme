import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { writeTheme } from "./helpers.mjs";

const execFileAsync = promisify(execFile);
const cli = resolve("scripts", "theme-cli.mjs");

test("CLI dry-run validates theme and renders service without persistent writes", async () => {
  const home = await mkdtemp(join(tmpdir(), "dct-cli-home-"));
  const theme = await writeTheme(join(home, "source theme"));
  const root = join(home, ".codex", "design-codex-theme");
  const { stdout } = await execFileAsync(process.execPath, [cli, "install", "--theme", theme, "--root", root, "--dry-run"], {
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
  });
  const result = JSON.parse(stdout);
  assert.equal(result.status, "dry-run");
  assert.equal(result.theme.id, "midnight-paper");
  assert.match(JSON.stringify(result.service), /design-codex-theme/);
});

test("CLI rejects broad or unowned runtime roots before destructive commands", async () => {
  const home = await mkdtemp(join(tmpdir(), "dct-cli-guard-"));
  const unsafe = join(home, "unsafe-root");
  await assert.rejects(
    execFileAsync(process.execPath, [cli, "uninstall", "--purge", "--root", unsafe], {
      env: { ...process.env, HOME: home, USERPROFILE: home },
      encoding: "utf8",
    }),
    (error) => /runtime root must end with design-codex-theme/.test(error.stderr),
  );
});
