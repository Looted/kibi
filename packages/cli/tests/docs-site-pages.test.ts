import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// executable_for TEST-docs-site-pages
// The published site is rendered from this repository's docs and fails closed
// on a broken internal link. Project Pages publishes it beside the health report.

const repoRoot = path.resolve(import.meta.dir, "../../..");

function runDocsSite(out: string) {
  return spawnSync("bun", ["docs-site/build.ts", "--out", out], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("documentation site pages", () => {
  test("renders repository docs beside the health report and fails on a broken internal link", () => {
    const out = mkdtempSync(path.join(tmpdir(), "kibi-docs-site-"));
    try {
      const built = runDocsSite(out);
      expect(built.status).toBe(0);
      const index = readFileSync(path.join(out, "index.html"), "utf8");
      expect(index).toContain("Say what the software should do.");
      const workflow = readFileSync(
        path.join(repoRoot, ".github/workflows/proof.yml"),
        "utf8",
      );
      // The site owns the Pages root; the report is namespaced beside it.
      expect(workflow).toContain("bun run docs:site -- --out pages\n");
      expect(workflow.indexOf("--out pages\n")).toBeLessThan(
        workflow.indexOf("mkdir -p pages/kibi-report"),
      );
      expect(index).toContain('href="kibi-report/"');
      // Former /docs/ URLs keep resolving to the same page at the root.
      const legacy = readFileSync(
        path.join(out, "docs/guide/install.html"),
        "utf8",
      );
      expect(legacy).toContain('url=../../guide/install.html"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }

    const source = path.join(repoRoot, "docs-site/content/welcome.md");
    const original = readFileSync(source, "utf8");
    const brokenOut = mkdtempSync(
      path.join(tmpdir(), "kibi-docs-site-broken-"),
    );
    try {
      writeFileSync(source, `${original}\n\n[missing](does-not-exist.md)\n`);
      const broken = runDocsSite(brokenOut);
      expect(broken.status).toBe(1);
      const output = `${broken.stdout}\n${broken.stderr}`;
      expect(output).toContain("Broken documentation links");
      expect(output).toContain("does-not-exist.md");
    } finally {
      writeFileSync(source, original);
      rmSync(brokenOut, { recursive: true, force: true });
    }
  });
});
