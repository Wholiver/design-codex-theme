import { lstat, readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { MAX_ASSET_BYTES } from "./constants.mjs";

const REQUIRED_COLORS = [
  "background",
  "foreground",
  "muted",
  "accent",
  "accentForeground",
  "surface",
  "surfaceElevated",
  "border",
  "success",
  "warning",
  "danger",
];
const HEX_COLOR = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const THEME_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const CSS_POSITION = /^(left|center|right|top|bottom|(?:100|[0-9]{1,2})%)(\s+(left|center|right|top|bottom|(?:100|[0-9]{1,2})%))?$/;

function fail(message) {
  const error = new Error(message);
  error.code = "THEME_INVALID";
  throw error;
}

function object(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${field} must be an object`);
  return value;
}

function number(value, field, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    fail(`${field} must be between ${min} and ${max}`);
  }
  return value;
}

function text(value, field, max = 120) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    fail(`${field} must be a non-empty string no longer than ${max} characters`);
  }
  return value.trim();
}

function color(value, field) {
  if (typeof value !== "string" || !HEX_COLOR.test(value)) fail(`${field} must be #RRGGBB or #RRGGBBAA`);
  return value.toUpperCase();
}

function optionalAsset(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = text(value, field, 180).replaceAll("\\", "/");
  if (isAbsolute(normalized) || normalized.split("/").includes("..")) fail(`${field} must stay inside the theme directory`);
  if (!IMAGE_EXTENSIONS.has(extname(normalized).toLowerCase())) fail(`${field} must be PNG, JPG, JPEG, or WebP`);
  return normalized;
}

export function validateTheme(input) {
  const source = object(input, "theme");
  if (source.schemaVersion !== 1) fail("schemaVersion must be 1");
  const id = text(source.id, "id", 64);
  if (!THEME_ID.test(id)) fail("id must use lowercase letters, digits, and single hyphens");
  const appearance = source.appearance;
  if (appearance !== "dark" && appearance !== "light") fail("appearance must be dark or light");

  const paletteInput = object(source.palette, "palette");
  const palette = {};
  for (const key of REQUIRED_COLORS) palette[key] = color(paletteInput[key], `palette.${key}`);

  const typographyInput = object(source.typography, "typography");
  const shapeInput = object(source.shape, "shape");
  const effectsInput = object(source.effects, "effects");
  const backgroundInput = object(source.background, "background");
  if (!["solid", "gradient", "image"].includes(backgroundInput.type)) {
    fail("background.type must be solid, gradient, or image");
  }

  const colors = backgroundInput.colors === undefined
    ? [palette.background, palette.surface]
    : backgroundInput.colors;
  if (!Array.isArray(colors) || colors.length < 2 || colors.length > 4) {
    fail("background.colors must contain 2 to 4 colors");
  }

  const theme = {
    schemaVersion: 1,
    id,
    name: text(source.name, "name", 80),
    description: source.description ? text(source.description, "description", 240) : "",
    appearance,
    palette,
    typography: {
      ui: text(typographyInput.ui, "typography.ui", 120),
      mono: text(typographyInput.mono, "typography.mono", 120),
      scale: number(typographyInput.scale ?? 1, "typography.scale", 0.85, 1.25),
    },
    shape: {
      radius: number(shapeInput.radius, "shape.radius", 0, 28),
      panelRadius: number(shapeInput.panelRadius, "shape.panelRadius", 0, 36),
      borderWidth: number(shapeInput.borderWidth ?? 1, "shape.borderWidth", 0, 3),
    },
    effects: {
      surfaceOpacity: number(effectsInput.surfaceOpacity, "effects.surfaceOpacity", 0.35, 1),
      backgroundDim: number(effectsInput.backgroundDim, "effects.backgroundDim", 0, 0.9),
      blur: number(effectsInput.blur, "effects.blur", 0, 40),
      saturation: number(effectsInput.saturation ?? 1, "effects.saturation", 0.5, 1.8),
      shadowOpacity: number(effectsInput.shadowOpacity, "effects.shadowOpacity", 0, 0.6),
      logoOpacity: number(effectsInput.logoOpacity ?? 0.9, "effects.logoOpacity", 0, 1),
      decorationOpacity: number(effectsInput.decorationOpacity ?? 0.3, "effects.decorationOpacity", 0, 1),
    },
    background: {
      type: backgroundInput.type,
      colors: colors.map((value, index) => color(value, `background.colors[${index}]`)),
      angle: number(backgroundInput.angle ?? 135, "background.angle", 0, 360),
      position: typeof backgroundInput.position === "string"
        ? text(backgroundInput.position, "background.position", 40)
        : "center center",
    },
    assets: {
      background: optionalAsset(source.assets?.background, "assets.background"),
      logo: optionalAsset(source.assets?.logo, "assets.logo"),
      decoration: optionalAsset(source.assets?.decoration, "assets.decoration"),
    },
  };

  if (theme.background.type === "image" && !theme.assets.background) {
    fail("assets.background is required when background.type is image");
  }
  if (!CSS_POSITION.test(theme.background.position)) fail("background.position is not a safe CSS position");
  return theme;
}

function detectImageMime(buffer, file) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  fail(`${file} does not contain a supported image`);
}

export async function loadThemeDirectory(directory) {
  const root = resolve(directory);
  const manifestPath = resolve(root, "theme.json");
  if (relative(root, manifestPath).startsWith("..")) fail("invalid theme directory");
  if ((await lstat(manifestPath)).isSymbolicLink()) fail("theme.json must not be a symbolic link");
  const theme = validateTheme(JSON.parse(await readFile(manifestPath, "utf8")));
  const assets = {};
  for (const [slot, asset] of Object.entries(theme.assets)) {
    if (!asset) continue;
    const absolute = resolve(root, asset);
    if (relative(root, absolute).startsWith("..")) fail(`assets.${slot} escapes the theme directory`);
    if ((await lstat(absolute)).isSymbolicLink()) fail(`assets.${slot} must not be a symbolic link`);
    const info = await stat(absolute);
    if (!info.isFile() || info.size === 0 || info.size > MAX_ASSET_BYTES) {
      fail(`assets.${slot} must be a non-empty file no larger than ${MAX_ASSET_BYTES} bytes`);
    }
    const bytes = await readFile(absolute);
    assets[slot] = { path: absolute, mime: detectImageMime(bytes, asset), bytes };
  }
  return { root, theme, assets };
}

export async function loadInstalledTheme(directory) {
  return loadThemeDirectory(directory);
}
