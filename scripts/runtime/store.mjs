import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { paths } from "./constants.mjs";
import { loadInstalledTheme, loadThemeDirectory } from "./schema.mjs";

const THEME_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeThemeId(id) {
  if (typeof id !== "string" || id.length > 64 || !THEME_ID.test(id)) {
    const error = new Error("invalid theme id");
    error.code = "THEME_INVALID";
    throw error;
  }
  return id;
}

export async function ensureLayout(root) {
  const target = paths(root);
  await Promise.all([
    mkdir(target.root, { recursive: true, mode: 0o700 }),
    mkdir(target.themes, { recursive: true, mode: 0o700 }),
    mkdir(target.logs, { recursive: true, mode: 0o700 }),
  ]);
  return target;
}

export async function atomicJson(file, value) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.tmp-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  await rename(temporary, file);
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function installTheme(sourceDirectory, root) {
  const source = await loadThemeDirectory(sourceDirectory);
  const target = await ensureLayout(root);
  const destination = join(target.themes, source.theme.id);
  const temporary = join(target.themes, `.${source.theme.id}.tmp-${randomUUID()}`);
  const backup = join(target.themes, `.${source.theme.id}.backup-${randomUUID()}`);
  let retired = false;
  let published = false;
  await cp(source.root, temporary, { recursive: true, errorOnExist: true, force: false });
  await loadInstalledTheme(temporary);
  try {
    try {
      await rename(destination, backup);
      retired = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await rename(temporary, destination);
    published = true;
    if (retired) await rm(backup, { recursive: true, force: true });
    return { theme: source.theme, path: destination };
  } catch (error) {
    if (published) await rm(destination, { recursive: true, force: true }).catch(() => {});
    if (retired) await rename(backup, destination).catch(() => {});
    await rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function activateTheme(id, root) {
  safeThemeId(id);
  const target = paths(root);
  const installed = resolve(target.themes, id);
  const loaded = await loadInstalledTheme(installed);
  if (loaded.theme.id !== id) throw new Error("theme directory and manifest id do not match");
  await atomicJson(target.active, { schemaVersion: 1, id, updatedAt: new Date().toISOString() });
  return loaded;
}

export async function activeTheme(root) {
  const target = paths(root);
  const active = await readJson(target.active);
  if (!active?.id) return null;
  return loadInstalledTheme(join(target.themes, active.id));
}

export async function listThemes(root) {
  const target = paths(root);
  const { readdir } = await import("node:fs/promises");
  let entries;
  try { entries = await readdir(target.themes, { withFileTypes: true }); }
  catch (error) { if (error?.code === "ENOENT") return []; throw error; }
  const themes = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    try {
      const loaded = await loadInstalledTheme(join(target.themes, entry.name));
      themes.push(loaded.theme);
    } catch {
      themes.push({ id: entry.name, invalid: true });
    }
  }
  return themes.sort((a, b) => a.id.localeCompare(b.id));
}

export async function removeTheme(id, root) {
  safeThemeId(id);
  const target = paths(root);
  const active = await readJson(target.active);
  if (active?.id === id) {
    const error = new Error("cannot remove the active theme; restore or apply another theme first");
    error.code = "THEME_ACTIVE";
    throw error;
  }
  await rm(join(target.themes, id), { recursive: true, force: true });
}

export async function clearActive(root) {
  await rm(paths(root).active, { force: true });
}
