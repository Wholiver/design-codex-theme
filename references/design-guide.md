# Codex theme design guide

## Brief to spec

Infer values rather than asking routine questions.

| Brief cue | Appearance | Surface/Text | Image direction |
|---|---|---|---|
| midnight, cyberpunk, space, neon | dark | near-black / near-white | luminous subject, controlled glow |
| paper, cream, studio, minimal | light | warm-white / charcoal | soft texture, restrained detail |
| nature, calm, forest, ocean | system unless explicit | derive from dominant luminance | atmospheric landscape |
| exact brand colors | user choice | preserve readable contrast | use exact accents sparingly |

Use short human name. Installer derives deterministic safe ID from name plus image hash.

## Hero composition

- Target 16:9, ideally 2560x1440.
- Keep subject on right third. Preserve broad low-detail area across left and center for sidebar, editor, dialogs, and text.
- Avoid fine high-contrast detail behind interface content.
- Require: `no text, no watermark, no logo, no UI elements`.
- For generated character/scene art, describe original visual traits rather than embedding interface elements.
- Choose `previewFocus` at subject face/main object. Coordinates are integer percentages: top-left `0,0`, bottom-right `100,100`.
- Usually reuse preview focus for thumbnail focus. Use thumbnail zoom 100 unless distant subject needs 120–180.

Prompt skeleton:

```text
16:9 desktop wallpaper, [style and scene], [main subject] on right third,
generous quiet negative space across left and center, [palette], [lighting],
clean composition, no text, no watermark, no logo, no UI elements
```

## Palette

Provide all four colors:

- `accent`: primary actions and selected states.
- `secondary`: restrained complementary highlight.
- `surface`: panel/dialog base; avoid transparency in manifest.
- `text`: high-contrast foreground.

Require surface/text WCAG contrast ratio >= 4.5:1. For dark themes, keep surface roughly `#0b1020`–`#20283a` and text roughly `#e8eef8`–`#ffffff`. For light themes, keep surface roughly `#f3f5f8`–`#ffffff` and text roughly `#111827`–`#334155`. Exact user colors override style preference, never legibility.

## Quality check

Before installation verify:

- Image is local PNG/JPG/JPEG/WebP and under 8 MB.
- No unwanted text, watermark, logo, baked UI, or unsafe crop.
- Main subject remains visible at 16:9 cover crop.
- Appearance matches image luminance.
- Palette matches brief and passes contrast.

