import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("README is bilingual, emoji-free, and documents both installers", async () => {
  const readme = await readFile("README.md", "utf8");
  assert.match(readme, /## 中文/);
  assert.match(readme, /## English/);
  assert.match(readme, /npx skills add Wholiver\/design-codex-theme/);
  assert.match(readme, /skills\.sh\/Wholiver\/design-codex-theme\/design-codex-theme/);
  assert.doesNotMatch(readme, /\p{Extended_Pictographic}/u);
});

test("skill package stays independent from upstream runtime", async () => {
  const skill = await readFile("SKILL.md", "utf8");
  assert.match(skill, /^---\r?\nname: design-codex-theme\r?\ndescription:/);
  assert.doesNotMatch(skill, /git clone|bootstrap-runtime|install-theme\.mjs/);
  const cli = await readFile("scripts/theme-cli.mjs", "utf8");
  assert.doesNotMatch(cli, /github\.com|git clone|theme center/i);
});
