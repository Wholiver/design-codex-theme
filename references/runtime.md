# Runtime and installation reference

Read this file for installation, restore, status, or troubleshooting work.

## Persistent locations

Runtime root on both platforms:

```text
~/.codex/design-codex-theme/
├── active.json
├── state.json
├── transaction.json
├── logs/controller.log
├── runtime/
└── themes/<theme-id>/
```

Startup registration:

- macOS: `~/Library/LaunchAgents/com.wholiver.design-codex-theme.plist`
- Windows: current-user Scheduled Task `DesignCodexTheme`

Runtime stores no credentials and makes no remote requests. It connects to loopback CDP only.

## Lifecycle

- `install`: validate and transactionally copy theme/runtime, activate theme, register controller, apply now or schedule restart.
- `apply`: change `active.json`, wake controller, inject immediately when possible.
- `restore`: remove current injection, clear active pointer, unregister controller, preserve library.
- `uninstall --purge`: remove owned registration and entire runtime root. No implicit purge.

Controller waits while Codex is closed. When Codex starts normally, it restarts Codex with loopback remote-debugging arguments, targets only `app://-/index.html`, injects one idempotent style element, then records verification.

## Commands

```bash
node scripts/theme-cli.mjs install --theme <dir> --restart
node scripts/theme-cli.mjs apply <id>
node scripts/theme-cli.mjs list --json
node scripts/theme-cli.mjs status --json
node scripts/theme-cli.mjs restore --restart
node scripts/theme-cli.mjs remove <id>
node scripts/theme-cli.mjs doctor --json
node scripts/theme-cli.mjs uninstall --purge
```

## Troubleshooting

- `EXTERNAL_CONTROLLER_CONFLICT`: another LaunchAgent, Scheduled Task, or running Codex process controls remote debugging. Do not delete it automatically. Ask user to disable it or explicitly approve migration.
- `SERVICE_CONFLICT`: expected service name/path exists but ownership cannot be proven. Preserve it.
- `THEME_INVALID`: fix reported schema, asset path, image signature, or size before installing.
- `restart-scheduled`: installation succeeded; controller will finish after Codex restart.
- `verified: false`: run `doctor --json`, inspect `logs/controller.log`, confirm Node 22 path still exists, then re-run `apply`.

Set `DESIGN_CODEX_APP` only when Codex uses a nonstandard application path. Do not change CDP host away from loopback.
