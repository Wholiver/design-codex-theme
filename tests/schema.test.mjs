import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadThemeDirectory, validateTheme } from "../scripts/runtime/schema.mjs";
import { ONE_PIXEL_PNG, sampleTheme, writeTheme } from "./helpers.mjs";

test("validates complete schema v1", () => {
  const theme = validateTheme(sampleTheme());
  assert.equal(theme.schemaVersion, 1);
  assert.equal(theme.palette.accent, "#8EA7FF");
  assert.equal(theme.background.type, "gradient");
});

test("rejects unsafe ids, CSS colors, and traversal", () => {
  assert.throws(() => validateTheme(sampleTheme({ id: "../bad" })), /id must use/);
  const colorInjection = sampleTheme();
  colorInjection.palette.accent = "red; } body { display:none";
  assert.throws(() => validateTheme(colorInjection), /palette\.accent/);
  const unsafePosition = sampleTheme();
  unsafePosition.background.position = "center; background: red";
  assert.throws(() => validateTheme(unsafePosition), /safe CSS position/);
  const traversal = sampleTheme({
    background: { type: "image", colors: ["#10131A", "#26365B"] },
    assets: { background: "../outside.png" },
  });
  assert.throws(() => validateTheme(traversal), /inside the theme directory/);
});

test("loads PNG assets and rejects extension spoofing", async () => {
  const root = await mkdtemp(join(tmpdir(), "dct-schema-"));
  const valid = join(root, "valid");
  const theme = sampleTheme({
    background: { type: "image", colors: ["#10131A", "#26365B"], position: "center center" },
    assets: { background: "background.png" },
  });
  await writeTheme(valid, theme);
  await writeFile(join(valid, "background.png"), ONE_PIXEL_PNG);
  const loaded = await loadThemeDirectory(valid);
  assert.equal(loaded.assets.background.mime, "image/png");

  const invalid = join(root, "invalid");
  await writeTheme(invalid, theme);
  await writeFile(join(invalid, "background.png"), "not an image");
  await assert.rejects(loadThemeDirectory(invalid), /supported image/);
});
