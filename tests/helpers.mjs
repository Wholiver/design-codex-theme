import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function sampleTheme(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "midnight-paper",
    name: "Midnight Paper",
    description: "Quiet ink and indigo theme",
    appearance: "dark",
    palette: {
      background: "#10131A",
      foreground: "#F4F0E8",
      muted: "#A7ACB8",
      accent: "#8EA7FF",
      accentForeground: "#10131A",
      surface: "#171C26",
      surfaceElevated: "#202838",
      border: "#39445A",
      success: "#68C79A",
      warning: "#E6B85C",
      danger: "#ED7B84",
    },
    typography: { ui: "Inter", mono: "JetBrains Mono", scale: 1 },
    shape: { radius: 10, panelRadius: 16, borderWidth: 1 },
    effects: {
      surfaceOpacity: 0.82,
      backgroundDim: 0.28,
      blur: 18,
      saturation: 1,
      shadowOpacity: 0.3,
      logoOpacity: 0.9,
      decorationOpacity: 0.25,
    },
    background: { type: "gradient", colors: ["#10131A", "#26365B"], angle: 135, position: "center center" },
    assets: { background: null, logo: null, decoration: null },
    ...overrides,
  };
}

export async function writeTheme(directory, theme = sampleTheme()) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "theme.json"), `${JSON.stringify(theme, null, 2)}\n`);
  return directory;
}

export const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
