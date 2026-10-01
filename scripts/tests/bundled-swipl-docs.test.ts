// executable_for TEST-prolog-bundled-quickstart
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PLATFORM_PACKAGES } from "../../packages/swipl/index.js";

const ROOT = path.join(import.meta.dir, "..", "..");
const read = (...parts: string[]) =>
  readFileSync(path.join(ROOT, ...parts), "utf8");

const readme = read("README.md");
const install = read("docs", "install.md");
const quickStart = read("docs-site", "content", "quick-start.md");
const theme = read("docs-site", "theme.ts");

/** The text of one `## ` section, up to the next `## ` heading. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n## ${heading}`);
  expect(start, `${heading} section`).toBeGreaterThan(-1);
  const rest = markdown.slice(start + 1);
  const next = rest.indexOf("\n## ", 3);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("installation guidance says what a user must install", () => {
  test("the README quick start needs no SWI-Prolog install on supported platforms", () => {
    const text = section(readme, "Quick start").split("```")[0];
    expect(text).toContain("SWI-Prolog is bundled");
    expect(text).toMatch(/Linux \(x64 or arm64, glibc 2\.28\+\)/);
    expect(text).toContain("macOS");
    expect(text).toContain("nothing else to install");
    // Manual install is kept, but only for what the bundle does not cover.
    expect(text).toContain("Alpine/musl");
    expect(text).toContain("native Windows");
    expect(text).toContain("install SWI-Prolog 9.0+");
    expect(text).not.toMatch(
      /requires \*\*Node\.js 22\+\*\* and \*\*SWI-Prolog/,
    );
  });

  test("the quick-start page and the landing fine print agree", () => {
    expect(quickStart).toContain("there is nothing else to install");
    expect(quickStart).toContain("Alpine (musl) or native Windows");
    expect(quickStart).toContain("`KIBI_SWIPL`");
    const fine = /<p class="fineprint">([^<]*(?:<[^>]+>[^<]*)*)<\/p>/.exec(
      theme,
    );
    expect(fine?.[1]).toContain("SWI-Prolog is bundled on Linux");
    expect(fine?.[1]).not.toMatch(/Requires Node\.js 22\+ and <code>swipl/);
  });

  test("the installation guide lists every bundled platform package", () => {
    const text = section(install, "Prerequisites");
    for (const entry of Object.values(PLATFORM_PACKAGES)) {
      expect(text, entry.package).toContain(`\`${entry.package}\``);
    }
    expect(text).toContain("glibc 2.28 or newer");
    expect(text).toContain("Alpine and other musl-based Linux");
    expect(text).toContain("native Windows");
  });

  test("the guide documents the lookup order, both overrides, and doctor", () => {
    const text = section(install, "Prerequisites");
    const order = [
      "`KIBI_SWIPL=<absolute path>`",
      "The bundled platform package",
      "`swipl` on your `PATH`",
    ].map((needle) => text.indexOf(needle));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(text).toContain("the bundled build wins");
    expect(text).toContain("`KIBI_SWIPL=system`");
    expect(text).toContain("`kibi doctor`");
    expect(text).toContain("`details.source`");
    expect(text).toContain("`bundled`");
  });

  test("the guide names the ways an install loses the bundle", () => {
    const text = section(install, "Prerequisites");
    expect(text).toContain("--omit=optional");
    expect(text).toContain("--no-optional");
    expect(text).toContain("`supportedArchitectures`");
    expect(text).toContain("npm install --save-dev kibi-swipl-linux-x64-gnu");
  });

  test("manual installation instructions remain for unsupported platforms", () => {
    const text = section(install, "Prerequisites");
    expect(text).toContain("sudo apt-add-repository ppa:swi-prolog/stable");
    expect(text).toContain("brew install swi-prolog");
    expect(text).toContain("Windows");
    expect(text).toContain("WSL");
  });
});

describe("shipped surfaces no longer demand a manual install", () => {
  test("the GitHub workflow templates rely on the bundled runtime", () => {
    for (const file of ["kibi-report.yml", "kibi-badge.yml"]) {
      const template = read("packages", "cli", "templates", "github", file);
      expect(template, file).not.toMatch(/swi-prolog|Install SWI-Prolog/);
      expect(read("docs", "examples", "github", file)).toBe(template);
    }
  });

  test("plugin READMEs and manifests call SWI-Prolog bundled on supported platforms", () => {
    for (const [file, text] of [
      ["packages/claude/README.md", read("packages", "claude", "README.md")],
      ["packages/cursor/README.md", read("packages", "cursor", "README.md")],
      [
        "packages/cursor/.cursor-plugin/plugin.json",
        read("packages", "cursor", ".cursor-plugin", "plugin.json"),
      ],
      [
        ".claude-plugin/marketplace.json",
        read(".claude-plugin", "marketplace.json"),
      ],
      [
        ".cursor-plugin/marketplace.json",
        read(".cursor-plugin", "marketplace.json"),
      ],
    ] as const) {
      expect(text.toLowerCase(), file).toContain("bundled");
      expect(text, file).not.toMatch(/Requires SWI-Prolog 9\+ and/);
      expect(text, file).not.toMatch(/Prerequisite: SWI-Prolog 9\+ and/);
    }
  });
});
