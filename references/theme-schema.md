# Theme schema v1

Every theme directory requires `theme.json`. Asset paths are relative to that directory.

```json
{
  "schemaVersion": 1,
  "id": "midnight-paper",
  "name": "Midnight Paper",
  "description": "Quiet ink and indigo theme",
  "appearance": "dark",
  "palette": {
    "background": "#10131A",
    "foreground": "#F4F0E8",
    "muted": "#A7ACB8",
    "accent": "#8EA7FF",
    "accentForeground": "#10131A",
    "surface": "#171C26",
    "surfaceElevated": "#202838",
    "border": "#39445A",
    "success": "#68C79A",
    "warning": "#E6B85C",
    "danger": "#ED7B84"
  },
  "typography": {
    "ui": "Inter",
    "mono": "JetBrains Mono",
    "scale": 1
  },
  "shape": {
    "radius": 10,
    "panelRadius": 16,
    "borderWidth": 1
  },
  "effects": {
    "surfaceOpacity": 0.82,
    "backgroundDim": 0.28,
    "blur": 18,
    "saturation": 1,
    "shadowOpacity": 0.3,
    "logoOpacity": 0.9,
    "decorationOpacity": 0.25
  },
  "background": {
    "type": "gradient",
    "colors": ["#10131A", "#26365B"],
    "angle": 135,
    "position": "center center"
  },
  "assets": {
    "background": null,
    "logo": null,
    "decoration": null
  }
}
```

## Constraints

- `id`: lowercase letters/digits separated by single hyphens, maximum 64 characters.
- `appearance`: `dark` or `light`.
- Colors: `#RRGGBB` or `#RRGGBBAA` only.
- `background.type`: `solid`, `gradient`, or `image`. Image requires `assets.background`.
- `background.colors`: two to four colors; retained as fallback for image themes.
- `typography.scale`: 0.85–1.25.
- Radii: 0–28 for controls, 0–36 for panels; border width 0–3.
- `surfaceOpacity`: 0.35–1; `backgroundDim`: 0–0.9; blur: 0–40.
- Assets: relative PNG/JPEG/WebP paths, no traversal, maximum 12 MB each.

Use `null` for unused asset slots. Do not add CSS, URLs, JavaScript, or data URLs to manifest.
