---
name: design-codex-theme
description: Design, generate, install, apply, switch, inspect, remove, restore, or uninstall custom Codex Desktop appearance themes from a one-sentence visual brief. Use for Codex themes, skins, backgrounds, colors, typography, panels, buttons, UI appearance, saved theme libraries, returning Codex to its default look, or diagnosing theme installation on macOS and Windows.
---

# Design Codex Theme

Turn a short visual brief into a complete local Codex Desktop theme, then install and verify it. This skill owns a small local injector; never install, clone, or invoke HeiGe Codex Skin Studio.

## Choose workflow

- New theme or redesign: follow **Create and install**.
- Switch to saved theme: run `apply <theme-id>`, then `status --json`.
- List saved themes: run `list --json`.
- Inspect installation: run `status --json`; use `doctor --json` for failures.
- Restore official Codex appearance: follow **Restore**.
- Remove saved inactive theme: run `remove <theme-id>`.
- Delete runtime and every saved theme only after explicit purge request: run `uninstall --purge`.

Run commands from this skill directory:

```bash
node scripts/theme-cli.mjs <command>
```

## Create and install

1. Read [references/design-guide.md](references/design-guide.md) and [references/theme-schema.md](references/theme-schema.md).
2. Infer name, appearance, palette, typography, shape, effects, and composition from user's sentence. Do not ask design questions unless requirements conflict.
3. Decide whether artwork is necessary:
   - For characters, scenery, illustration, photography, branded art, or a specific visual subject, invoke Codex image generation with gpt-image-2. Use `$imagegen`/image generation tool; never draw substitute art with Python.
   - For solid, gradient, paper, glass, grid, terminal, or other procedural styles, use structured theme colors without generating an image.
4. Create temporary theme directory containing `theme.json` plus only referenced PNG, JPEG, or WebP assets. Never place generated files inside Codex application bundle.
5. Validate without mutation:

```bash
node scripts/theme-cli.mjs install --theme <theme-directory> --dry-run
```

6. If user explicitly requested preview, generation, or validation only, report dry-run result and stop here. Otherwise tell user Codex will restart once and continue immediately without requesting another design confirmation:

```bash
node scripts/theme-cli.mjs install --theme <theme-directory> --restart
```

7. After Codex returns, verify:

```bash
node scripts/theme-cli.mjs status --json
```

Success requires matching `activeTheme` and `verified: true`. If restart interrupts current task, installed controller finishes injection and records result; inspect it on next invocation.

## Saved themes

Use exact IDs returned by `list --json`.

```bash
node scripts/theme-cli.mjs apply <theme-id>
node scripts/theme-cli.mjs remove <inactive-theme-id>
```

Applying while Codex already exposes local CDP is immediate. Otherwise installed controller performs one safe restart and reapplies theme.

## Restore

Tell user Codex will restart, then run:

```bash
node scripts/theme-cli.mjs restore --restart
```

This unregisters background controller, removes injected DOM/CSS, and preserves saved themes. Do not use `uninstall --purge` unless user explicitly asks to delete everything.

## Guardrails

- Support macOS and Windows only. Require Node.js 22 or newer.
- Connect only to `127.0.0.1`; inject only renderer URL `app://-/index.html`.
- Never patch Codex application files, download a theme center, or contact a theme marketplace.
- Treat another Codex remote-debugging controller as conflict. Report detected service/task and ask before migration; never delete unowned services.
- Keep all persistent data under `~/.codex/design-codex-theme/`; platform startup registration is described in [references/runtime.md](references/runtime.md).
- Keep asset paths relative, assets under 12 MB, and theme IDs lowercase hyphen-case.
- On failure, run `doctor --json`; preserve transaction log and prior active theme.
