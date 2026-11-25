import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const CANONICAL_SVG = "assets/logo.svg";
const CANONICAL_PNG = "packages/vscode/icon.png";

const SVG_COPIES = [
  "packages/antigravity/assets/logo.svg",
  "packages/codex/assets/composer-icon.svg",
  "packages/cursor/assets/logo.svg",
  "packages/vscode/icon.svg",
] as const;

const PNG_COPIES = [
  "packages/claude/assets/logo.png",
  "packages/codex/assets/logo.png",
] as const;

describe("harness plugin icon assets", () => {
  test("every bundled SVG icon matches canonical assets/logo.svg", () => {
    const canonical = fs.readFileSync(path.join(repoRoot, CANONICAL_SVG));
    expect(canonical.length).toBeGreaterThan(0);
    for (const relPath of SVG_COPIES) {
      const actual = fs.readFileSync(path.join(repoRoot, relPath));
      expect(
        actual.equals(canonical),
        `${relPath} drifted from ${CANONICAL_SVG}`,
      ).toBe(true);
    }
  });

  test("every bundled PNG icon matches canonical packages/vscode/icon.png", () => {
    const canonical = fs.readFileSync(path.join(repoRoot, CANONICAL_PNG));
    expect(canonical.length).toBeGreaterThan(0);
    for (const relPath of PNG_COPIES) {
      const actual = fs.readFileSync(path.join(repoRoot, relPath));
      expect(
        actual.equals(canonical),
        `${relPath} drifted from ${CANONICAL_PNG}`,
      ).toBe(true);
    }
  });

  test("ZCode marketplace icon URL resolves to the canonical PNG and Claude omits marketplace icon", () => {
    const marketplacePath = path.join(
      repoRoot,
      ".claude-plugin",
      "marketplace.json",
    );
    const marketplace = JSON.parse(
      fs.readFileSync(marketplacePath, "utf8"),
    ) as {
      plugins: Array<{ name: string; icon?: string }>;
    };
    const prefix = "https://raw.githubusercontent.com/Looted/kibi/master/";
    const zcode = marketplace.plugins.find((p) => p.name === "kibi-zcode");
    expect(zcode?.icon).toBe(`${prefix}${CANONICAL_PNG}`);
    expect(fs.existsSync(path.join(repoRoot, CANONICAL_PNG))).toBe(true);

    const claude = marketplace.plugins.find((p) => p.name === "kibi-claude");
    expect(claude?.icon).toBeUndefined();
  });
});
