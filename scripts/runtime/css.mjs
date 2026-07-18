import { DECORATION_ID, LOGO_ID, STYLE_ID } from "./constants.mjs";

function hexRgb(hex) {
  const value = hex.slice(1, 7);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function rgba(hex, alpha) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function cssString(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

function fontStack(value, fallback) {
  const safe = value.replace(/[{};:<>]/g, "").trim();
  return `${cssString(safe)}, ${fallback}`;
}

function assetUrl(asset) {
  if (!asset) return "none";
  return `url(${cssString(`data:${asset.mime};base64,${asset.bytes.toString("base64")}`)})`;
}

export function buildThemeCss(theme, assets = {}) {
  const p = theme.palette;
  const background = theme.background.type === "image"
    ? assetUrl(assets.background)
    : theme.background.type === "gradient"
      ? `linear-gradient(${theme.background.angle}deg, ${theme.background.colors.join(", ")})`
      : "none";
  const shadow = `0 18px 55px ${rgba(p.background, theme.effects.shadowOpacity)}`;
  const surface = rgba(p.surface, theme.effects.surfaceOpacity);
  const elevated = rgba(p.surfaceElevated, Math.min(1, theme.effects.surfaceOpacity + 0.08));

  return `/* ${STYLE_ID}:${theme.id} */
:root {
  --dct-background: ${p.background};
  --dct-foreground: ${p.foreground};
  --dct-muted: ${p.muted};
  --dct-accent: ${p.accent};
  --dct-accent-foreground: ${p.accentForeground};
  --dct-surface: ${surface};
  --dct-surface-elevated: ${elevated};
  --dct-border: ${p.border};
  --dct-success: ${p.success};
  --dct-warning: ${p.warning};
  --dct-danger: ${p.danger};
  --dct-radius: ${theme.shape.radius}px;
  --dct-panel-radius: ${theme.shape.panelRadius}px;
  --dct-border-width: ${theme.shape.borderWidth}px;
  --dct-ui-font: ${fontStack(theme.typography.ui, "-apple-system, BlinkMacSystemFont, sans-serif")};
  --dct-mono-font: ${fontStack(theme.typography.mono, "ui-monospace, SFMono-Regular, monospace")};
}

html, body, #root {
  background: transparent !important;
  color: var(--dct-foreground) !important;
  font-family: var(--dct-ui-font) !important;
  font-size: calc(100% * ${theme.typography.scale}) !important;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background-color: var(--dct-background);
  background-image: ${background};
  background-position: ${theme.background.position};
  background-size: cover;
  background-repeat: no-repeat;
  filter: saturate(${theme.effects.saturation});
}

body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: ${rgba(p.background, theme.effects.backgroundDim)};
}

#root > div,
[data-radix-scroll-area-viewport] {
  background: transparent !important;
}

aside, nav, [data-slot="sidebar"], [class*="sidebar"] {
  background: var(--dct-surface) !important;
  border-color: var(--dct-border) !important;
  backdrop-filter: blur(${theme.effects.blur}px) !important;
}

main, section, article,
[role="dialog"], [data-radix-popper-content-wrapper] > div,
[class*="card"], [class*="panel"] {
  border-color: var(--dct-border) !important;
}

[role="dialog"], [data-radix-popper-content-wrapper] > div,
[class*="popover"], [class*="menu-content"] {
  background: var(--dct-surface-elevated) !important;
  border: var(--dct-border-width) solid var(--dct-border) !important;
  border-radius: var(--dct-panel-radius) !important;
  box-shadow: ${shadow} !important;
  backdrop-filter: blur(${Math.min(40, theme.effects.blur + 6)}px) !important;
}

button, [role="button"], input, textarea, select {
  border-radius: var(--dct-radius) !important;
  border-color: var(--dct-border) !important;
  color: var(--dct-foreground) !important;
}

button:hover, [role="button"]:hover,
[data-state="active"], [aria-selected="true"] {
  background-color: ${rgba(p.accent, theme.appearance === "dark" ? 0.18 : 0.12)} !important;
}

button[data-variant="primary"], button[type="submit"],
[class*="primary"]:not([class*="text"]) {
  background-color: var(--dct-accent) !important;
  color: var(--dct-accent-foreground) !important;
}

input, textarea, select, pre, code {
  background-color: ${rgba(p.surfaceElevated, 0.84)} !important;
}

pre, code, kbd, samp {
  font-family: var(--dct-mono-font) !important;
}

a, [data-link], .text-accent-foreground {
  color: var(--dct-accent) !important;
}

.text-muted-foreground, [class*="text-muted"] {
  color: var(--dct-muted) !important;
}

* {
  scrollbar-color: ${rgba(p.accent, 0.55)} transparent;
}

#${LOGO_ID} {
  position: fixed;
  top: 12px;
  right: 54px;
  width: 30px;
  height: 30px;
  z-index: 2147483000;
  pointer-events: none;
  background: ${assetUrl(assets.logo)} center / contain no-repeat;
  opacity: ${theme.effects.logoOpacity};
}

#${DECORATION_ID} {
  position: fixed;
  right: 24px;
  bottom: 20px;
  width: min(32vw, 420px);
  height: min(32vh, 340px);
  z-index: 0;
  pointer-events: none;
  background: ${assetUrl(assets.decoration)} right bottom / contain no-repeat;
  opacity: ${theme.effects.decorationOpacity};
}
`;
}

export function buildInstallExpression(theme, css, assets = {}) {
  const data = {
    styleId: STYLE_ID,
    logoId: LOGO_ID,
    decorationId: DECORATION_ID,
    themeId: theme.id,
    appearance: theme.appearance,
    css,
    showLogo: Boolean(assets.logo),
    showDecoration: Boolean(assets.decoration),
  };
  return `(() => {
    const data = ${JSON.stringify(data)};
    const root = document.documentElement;
    if (!root.dataset.dctPreviousAppearance) {
      root.dataset.dctPreviousAppearance = JSON.stringify({
        dark: root.classList.contains("electron-dark"),
        light: root.classList.contains("electron-light")
      });
    }
    root.classList.toggle("electron-dark", data.appearance === "dark");
    root.classList.toggle("electron-light", data.appearance === "light");
    root.dataset.designCodexTheme = data.themeId;
    let style = document.getElementById(data.styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = data.styleId;
      (document.head || root).appendChild(style);
    }
    style.textContent = data.css;
    for (const [id, visible] of [[data.logoId, data.showLogo], [data.decorationId, data.showDecoration]]) {
      let element = document.getElementById(id);
      if (visible && !element) {
        element = document.createElement("div");
        element.id = id;
        element.setAttribute("aria-hidden", "true");
        document.body.appendChild(element);
      } else if (!visible && element) element.remove();
    }
    return { installed: true, id: data.themeId, styleBytes: data.css.length };
  })()`;
}

export function buildRemoveExpression() {
  return `(() => {
    for (const id of ${JSON.stringify([STYLE_ID, LOGO_ID, DECORATION_ID])}) document.getElementById(id)?.remove();
    const root = document.documentElement;
    try {
      const previous = JSON.parse(root.dataset.dctPreviousAppearance || "null");
      if (previous) {
        root.classList.toggle("electron-dark", Boolean(previous.dark));
        root.classList.toggle("electron-light", Boolean(previous.light));
      }
    } catch {}
    delete root.dataset.dctPreviousAppearance;
    delete root.dataset.designCodexTheme;
    return { removed: true };
  })()`;
}
