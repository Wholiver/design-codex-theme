import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildInstallExpression, buildRemoveExpression, buildThemeCss } from "../scripts/runtime/css.mjs";
import { sampleTheme } from "./helpers.mjs";

function fakeDocument() {
  const elements = new Map();
  const classes = new Set(["electron-light"]);
  const classList = {
    contains: (value) => classes.has(value),
    toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
  };
  const appendChild = (element) => { elements.set(element.id, element); return element; };
  const createElement = () => ({
    id: "",
    textContent: "",
    setAttribute() {},
    remove() { elements.delete(this.id); },
  });
  return {
    elements,
    document: {
      documentElement: { dataset: {}, classList },
      head: { appendChild },
      body: { appendChild },
      createElement,
      getElementById: (id) => elements.get(id) ?? null,
    },
  };
}

test("builds branded-independent full appearance CSS", () => {
  const theme = sampleTheme();
  theme.typography.ui = "Inter; } body { display:none";
  const css = buildThemeCss(theme);
  assert.match(css, /design-codex-theme-style:midnight-paper/);
  assert.match(css, /--dct-accent: #8EA7FF/);
  assert.doesNotMatch(css, /HeiGe|heige/);
  assert.doesNotMatch(css, /display:none/);
});

test("install expression is idempotent and removal restores appearance", () => {
  const theme = sampleTheme();
  const css = buildThemeCss(theme);
  const fixture = fakeDocument();
  const context = vm.createContext({ document: fixture.document, JSON });
  vm.runInContext(buildInstallExpression(theme, css), context);
  vm.runInContext(buildInstallExpression(theme, css), context);
  assert.equal(fixture.elements.size, 1);
  assert.equal(fixture.document.documentElement.dataset.designCodexTheme, theme.id);
  assert.equal(fixture.document.documentElement.classList.contains("electron-dark"), true);
  vm.runInContext(buildRemoveExpression(), context);
  assert.equal(fixture.elements.size, 0);
  assert.equal(fixture.document.documentElement.classList.contains("electron-light"), true);
});
