# Runtime and installation reference

Based on [HeiGeAi/heige-codex-skin-studio](https://github.com/HeiGeAi/heige-codex-skin-studio), MIT licensed. Bootstrap defaults to tested commit `770a03ce1f7a52fa2faa72062164e9d18cad4e27` from 2026-07-18.

## Locations

| Purpose | macOS | Windows |
|---|---|---|
| This skill | Directory containing current `SKILL.md`; commonly `~/.codex/skills/design-codex-theme` | Directory containing current `SKILL.md`; commonly `%USERPROFILE%\.codex\skills\design-codex-theme` |
| Runtime | `~/.codex/heige-codex-skin-studio` | `%USERPROFILE%\.codex\heige-codex-skin-studio` |
| User themes | `~/Library/Application Support/HeiGeCodexSkinStudio/themes` | `%APPDATA%\HeiGeCodexSkinStudio\themes` |
| State/logs | `~/Library/Application Support/HeiGeCodexSkinStudio` | `%APPDATA%\HeiGeCodexSkinStudio` |

Runtime uses loopback Chrome DevTools Protocol injection and does not alter Codex application files.

## Theme schema

Required manifest keys: `schemaVersion`, `id`, `name`, `hero`.

This skill also writes:

```json
{
  "appearance": "dark",
  "previewFocus": { "x": 72, "y": 42 },
  "thumbnailFocus": { "x": 72, "y": 42 },
  "thumbnailZoom": 100,
  "colors": {
    "accent": "#8b5cf6",
    "secondary": "#22d3ee",
    "surface": "#111827",
    "text": "#f8fafc"
  }
}
```

`appearance`: `light`, `dark`, or `system`. Focus coordinates: integers 0–100. Thumbnail zoom: integer 100–400. Image must remain inside theme directory.

## Stable lifecycle commands

Applying may restart Codex. Status is read-only.

macOS:

```bash
ROOT="$HOME/.codex/heige-codex-skin-studio"
"$ROOT/scripts/lib/run-cli.zsh" status --port 9341
"$ROOT/scripts/apply.command" "THEME_ID"
"$ROOT/scripts/restore.command"
```

Windows PowerShell:

```powershell
$root = "$HOME\.codex\heige-codex-skin-studio"
& "$root\scripts\windows\controller.ps1" -Action status -Port 9341
& "$root\scripts\windows\apply.ps1" -Theme "THEME_ID" -Port 9341
& "$root\scripts\windows\restore.ps1" -Port 9341
```

Use stable platform entrypoints for apply/restore. Do not invoke Node lifecycle commands directly on Windows.

## Bootstrap behavior

`bootstrap-runtime.mjs`:

1. Reuses valid runtime already at target.
2. Fetches pinned commit into a random temporary directory only when missing.
3. Runs upstream installer with skip-apply flag.
4. Validates installed CLI, then removes temporary checkout.

Pass `--refresh` only when user requests update or diagnosis proves runtime broken. Pass `--ref main` only when intentionally testing latest upstream.

## Recovery

- Apply failure after creation: theme remains installed; rerun platform apply command with reported ID.
- Validation failure: installer restores prior manifest and leaves upstream transactional theme intact.
- User requests official look: run restore command, then status.
- Runtime incompatibility: inspect status/doctor first; do not overwrite application files.
