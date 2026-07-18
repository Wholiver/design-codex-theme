# Codex theme design guide

Use this guide only when creating or revising a theme.

## Translate one sentence into a system

Extract five decisions without asking follow-up questions:

1. Mood: calm, playful, cinematic, minimal, retro, technical, organic.
2. Appearance: dark or light. Choose from expected reading comfort, not background art alone.
3. Anchor color: one accent used for focus, links, selected rows, and primary buttons.
4. Surface model: opaque, translucent glass, paper, terminal, or layered cards.
5. Imagery: none, background, small logo, decoration, or a combination.

Create short hyphen-case ID and human name. Avoid product names, trademarks, or pretending generated marks are official.

## Palette

- Keep foreground/background contrast at least 4.5:1 for normal text.
- Keep muted text readable; target at least 3:1 against primary surface.
- Choose `accentForeground` for direct contrast on accent-filled buttons.
- Separate `surface` and `surfaceElevated` enough for dialogs to remain visible.
- Keep border quieter than text but visible over both surfaces.
- Give success, warning, and danger distinct hues; do not derive all three from accent.

## Composition

- Preserve center-left reading area. Put strong subjects near right third or outer edges.
- Assume background uses `cover`; important content must survive 16:10 and 16:9 crops.
- Prefer low-frequency detail behind code and conversations.
- Use `backgroundDim` and translucent surfaces to control busy artwork.
- Logo and decoration are optional fixed, pointer-free overlays. Keep opacity restrained.

## When to generate an image

Call Codex image generation with gpt-image-2 when user requests a recognizable subject, illustration, photographic atmosphere, mascot, landscape, object, or custom visual identity. Ask for no text, no watermark, no application UI, and safe edge cropping.

Do not generate an image for gradients, plain colors, paper grain approximated by CSS, grids, terminal looks, or minimal glass themes. Structured CSS stays sharper and lighter.

## Quality check

- Theme JSON passes dry-run validation.
- Images are local PNG/JPEG/WebP, valid by file signature, and no larger than 12 MB each.
- Theme has no unintended text, watermark, fake Codex logo, or baked-in UI.
- Foreground, muted text, accent buttons, inputs, dialogs, and code blocks remain readable.
- Theme does not depend on theme-center menus or remote URLs.
