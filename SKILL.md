---
name: design-codex-theme
description: Design, generate, install, apply, verify, or restore custom Codex Desktop appearance themes from a one-sentence visual brief or a supplied image. Use when users ask to reskin Codex, create a Codex background/theme/skin, turn an image into a Codex theme, install a generated theme, adjust theme colors or light/dark appearance, or return Codex to its native appearance on macOS or Windows.
---

# Design Codex Theme

Turn a short visual brief into an installed Codex Desktop theme. Use HeiGe Codex Skin Studio as CDP runtime; never modify Codex `app.asar`, binaries, signatures, or packaged resources.

## Workflow

1. Infer complete theme spec from user sentence. Do not ask about fields that can be chosen safely:
   - concise theme name
   - `light`, `dark`, or `system` appearance
   - accent, secondary, surface, and text hex colors
   - hero-image concept and focal point
2. Read [references/design-guide.md](references/design-guide.md). Read [references/runtime.md](references/runtime.md) before installing, applying, diagnosing, or restoring.
3. Obtain hero image:
   - If user supplied image, inspect it first and use its absolute local path.
   - Otherwise announce that this skill needs a hero image, then invoke available `$imagegen` skill / gpt-image-2 image-generation tool directly. Do not stop for confirmation.
   - Request 16:9 desktop wallpaper, ideally 2560x1440; no text, watermark, logo, or baked-in UI. Keep main subject on right third and left/center visually quiet.
   - Inspect generated result. If safe area, contrast, or unwanted text fails, edit/regenerate once with image-generation tool. Do not use shell/Python as image editor.
4. Select accessible palette. Ensure surface/text contrast is at least 4.5:1. Prefer colors visibly present in image unless user specified exact colors.
5. Before applying, tell user Codex may close and reopen; current tasks should be saved. This is an update, not a confirmation gate.
6. Resolve `SKILL_ROOT` as absolute directory containing this `SKILL.md`, then run installer with absolute image path:

```bash
node "$SKILL_ROOT/scripts/install-theme.mjs" \
  --image "/absolute/path/hero.png" \
  --name "Theme Name" \
  --appearance dark \
  --accent "#8b5cf6" \
  --secondary "#22d3ee" \
  --surface "#111827" \
  --text "#f8fafc" \
  --preview-focus "72,42" \
  --thumbnail-focus "72,42"
```

On Windows, invoke same `.mjs` file with Node 22+ and Windows paths. Script bootstraps pinned, tested runtime when absent, creates formal distributable theme, patches validated metadata, then uses platform-specific stable apply entry.

7. Verify using read-only status command from [references/runtime.md](references/runtime.md). Never use apply/restart as status check.
8. Report theme name, ID, appearance, palette, installed path, apply result, and status. Show generated hero image when useful.

## Intent rules

- “Design/install/make a theme”: complete design, image generation when needed, installation, application, and verification.
- “Preview/plan only”: add `--dry-run`; do not bootstrap, install, apply, or restart.
- “Install but do not apply”: add `--no-apply`.
- “Change colors”: create replacement from same image/name with new palette; script uses upstream transactional publishing.
- “Native/restore/undo”: use platform restore command in [references/runtime.md](references/runtime.md), warn about restart, then run status.
- “Status/check”: run only status command.

## Guardrails

- Support macOS and Windows only. State upstream Windows Store/MSIX real-device support remains less proven than macOS.
- Require local regular PNG, JPG, JPEG, or WebP under 8 MB. Never upload private images to public hosting.
- Keep CDP port on loopback default `9341`; do not expose it to LAN/public interfaces.
- Reuse installed runtime when valid. Do not update/refresh it unless requested or diagnosis proves incompatibility.
- Preserve source image. Theme installer copies it into theme store.
- Do not install optional pets, unrelated presets, startup persistence, or other extras unless requested.
- If image-generation tool is unavailable and no image exists, ask user to attach one; do not substitute an internet image without permission.

## Scripts

- `scripts/install-theme.mjs`: validate request, ensure runtime, create theme, apply palette/appearance/focus metadata, validate, optionally apply.
- `scripts/bootstrap-runtime.mjs`: install tested HeiGe runtime without applying a theme.
