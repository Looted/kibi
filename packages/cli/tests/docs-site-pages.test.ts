import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// executable_for TEST-docs-site-pages
// The published site is rendered from this repository's docs and fails closed
// on a broken internal link. Project Pages publishes it beside the health report.

const repoRoot = path.resolve(import.meta.dir, "../../..");

function runDocsSite(out: string, extra: string[] = []) {
  // Builds under test never inherit the Pages website ID.
  const { KIBI_UMAMI_WEBSITE_ID: _ignored, ...env } = process.env;
  return spawnSync("bun", ["docs-site/build.ts", "--out", out, ...extra], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
}

describe("documentation site pages", () => {
  test("every install entry point quotes the same agent setup prompt", async () => {
    // Loaded at runtime: docs-site/ sits outside this package's tsconfig rootDir.
    const { AGENT_SETUP_PROMPT } = (await import(
      path.join(repoRoot, "docs-site/catalog.ts")
    )) as { AGENT_SETUP_PROMPT: string };
    for (const file of [
      "README.md",
      "docs/install.md",
      "docs-site/content/quick-start.md",
    ]) {
      const text = readFileSync(path.join(repoRoot, file), "utf8");
      expect(text, file).toContain(
        `\`\`\`prompt\n${AGENT_SETUP_PROMPT}\n\`\`\``,
      );
      // Manual installation stays available, but behind a toggle.
      expect(text, file).toContain("<summary>Manual installation</summary>");
    }
  });

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
      // The agent setup prompt is the selected tab; manual installs follow it.
      const tabs = [
        ...index.matchAll(/class="pm-tab"[^>]*data-pm="([a-z]+)"/g),
      ];
      expect(tabs.map((match) => match[1])).toEqual([
        "agent",
        "npm",
        "pnpm",
        "yarn",
      ]);
      expect(index).toMatch(/id="pm-tab-agent"[^>]*aria-selected="true"/);
      const agentPanel =
        /id="pm-panel-agent"[^>]*>[\s\S]*?<code>([\s\S]*?)<\/code>/.exec(index);
      expect(agentPanel?.[1]).toContain("kibi skills load kibi-bootstrap");
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

  test("builds without analytics by default and loads Umami scoped to the published host when given a website ID", () => {
    const id = "197fb489-cdd4-4d95-ae8a-119dc6422a45";
    const plain = mkdtempSync(path.join(tmpdir(), "kibi-docs-site-plain-"));
    const out = mkdtempSync(path.join(tmpdir(), "kibi-docs-site-analytics-"));
    try {
      expect(runDocsSite(plain).status).toBe(0);
      const plainIndex = readFileSync(path.join(plain, "index.html"), "utf8");
      expect(plainIndex).not.toContain("cloud.umami.is");
      expect(plainIndex).not.toContain("Umami analytics");

      expect(runDocsSite(out, ["--umami-website-id", id]).status).toBe(0);
      const tag = `<script defer src="https://cloud.umami.is/script.js" data-website-id="${id}" data-domains="looted.github.io" data-do-not-track="true" data-performance="true"></script>`;
      for (const page of [
        "index.html",
        "guide/quick-start.html",
        "reference/cli.html",
      ]) {
        const html = readFileSync(path.join(out, page), "utf8");
        expect(html.split(tag).length - 1, page).toBe(1);
        expect(html, page).toContain('data-umami-event="github-click"');
      }
      const index = readFileSync(path.join(out, "index.html"), "utf8");
      expect(index).toContain(
        'href="guide/quick-start.html" data-umami-event="cta-click" data-umami-event-target="install"',
      );
      // Copy and tab clicks report through the client script, which stays a no-op without Umami.
      expect(index).toContain('track("install-copy", { method: panel })');
      expect(index).toContain('track("install-tab"');

      const workflow = readFileSync(
        path.join(repoRoot, ".github/workflows/proof.yml"),
        "utf8",
      );
      expect(workflow).toContain(`KIBI_UMAMI_WEBSITE_ID: ${id}\n`);

      const invalid = runDocsSite(out, ["--umami-website-id", '"><script>']);
      expect(invalid.status).toBe(1);
      expect(invalid.stderr).toContain("Invalid Umami website ID");
    } finally {
      rmSync(plain, { recursive: true, force: true });
      rmSync(out, { recursive: true, force: true });
    }
  });
});
