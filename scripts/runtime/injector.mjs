import { buildInstallExpression, buildRemoveExpression, buildThemeCss } from "./css.mjs";
import { CdpSession, fetchRendererTargets } from "./cdp-client.mjs";

async function evaluateTargets(port, expression, options = {}) {
  const targets = await fetchRendererTargets(port, options);
  if (targets.length === 0) throw new Error("Codex main renderer is not available on CDP loopback");
  const results = [];
  for (const target of targets) {
    const session = await new CdpSession(target.webSocketDebuggerUrl, options).open();
    try {
      results.push(await session.evaluate(expression));
    } finally {
      session.close();
    }
  }
  return results;
}

export async function applyThemeToCodex(port, loaded, options = {}) {
  const css = buildThemeCss(loaded.theme, loaded.assets);
  const expression = buildInstallExpression(loaded.theme, css, loaded.assets);
  return evaluateTargets(port, expression, options);
}

export async function removeThemeFromCodex(port, options = {}) {
  return evaluateTargets(port, buildRemoveExpression(), options);
}

export async function verifyTheme(port, id, options = {}) {
  const expression = `(() => ({
    id: document.documentElement.dataset.designCodexTheme || null,
    style: document.getElementById("design-codex-theme-style")?.textContent?.includes("design-codex-theme-style:${id}") || false
  }))()`;
  const results = await evaluateTargets(port, expression, options);
  return results.every((value) => value?.id === id && value?.style === true);
}
