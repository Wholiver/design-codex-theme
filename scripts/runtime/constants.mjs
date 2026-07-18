import { homedir } from "node:os";
import { join } from "node:path";

export const PRODUCT_ID = "design-codex-theme";
export const SERVICE_LABEL = "com.wholiver.design-codex-theme";
export const WINDOWS_TASK_NAME = "DesignCodexTheme";
export const STYLE_ID = "design-codex-theme-style";
export const LOGO_ID = "design-codex-theme-logo";
export const DECORATION_ID = "design-codex-theme-decoration";
export const MAIN_RENDERER_URL = "app://-/index.html";
export const DEFAULT_PORT = 9222;
export const MAX_ASSET_BYTES = 12 * 1024 * 1024;

export function runtimeRoot(env = process.env) {
  return env.DESIGN_CODEX_THEME_HOME
    ? env.DESIGN_CODEX_THEME_HOME
    : join(homedir(), ".codex", PRODUCT_ID);
}

export function paths(root = runtimeRoot()) {
  return {
    root,
    runtime: join(root, "runtime"),
    themes: join(root, "themes"),
    active: join(root, "active.json"),
    state: join(root, "state.json"),
    logs: join(root, "logs"),
    controllerLog: join(root, "logs", "controller.log"),
    transaction: join(root, "transaction.json"),
  };
}
