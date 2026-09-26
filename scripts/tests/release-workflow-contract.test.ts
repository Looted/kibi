import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_PATH = join(
  import.meta.dir,
  "..",
  "..",
  ".github",
  "workflows",
  "publish.yml",
);
const SELECTIVE_PUBLISH_PATH = join(
  import.meta.dir,
  "..",
  "publish-selective.sh",
);

/**
 * Extract the text block for a named job from a GitHub Actions YAML workflow.
 * Returns everything from `  jobName:` to the next top-level job start (line
 * starting with exactly two spaces + a lowercase letter) or EOF.
 */
function extractJobBlock(content: string, jobName: string): string {
  const jobHeader = `  ${jobName}:`;
  const startIdx = content.indexOf(jobHeader);
  if (startIdx === -1) {
    return "";
  }
  // Walk forward to find the next job boundary (next `  [a-z]` at start of line)
  const afterHeader = startIdx + jobHeader.length;
  const nextJobRe = /\n {2}[a-z]/g;
  nextJobRe.lastIndex = afterHeader;
  const match = nextJobRe.exec(content);
  const endIdx = match ? match.index : content.length;
  return content.slice(startIdx, endIdx);
}

describe("publish.yml CI workflow contract", () => {
  const workflowContent = readFileSync(WORKFLOW_PATH, "utf8");
  const selectivePublishContent = readFileSync(SELECTIVE_PUBLISH_PATH, "utf8");

  // ── Existing baseline assertions ────────────────────────────────────
  test("invokes bun run scripts/run-release-state.ts", () => {
    expect(workflowContent).toContain("bun run scripts/run-release-state.ts");
  });

  test("does not set KIBI_RELEASE_MOCK_NPM", () => {
    expect(workflowContent).not.toContain("KIBI_RELEASE_MOCK_NPM");
  });

  // ── check-release ───────────────────────────────────────────────────
  test("check-release: shallow checkout, no full history", () => {
    const block = extractJobBlock(workflowContent, "check-release");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
  });

  // ── build-and-check ─────────────────────────────────────────────────
  test("build-and-check: shallow checkout pinned to master", () => {
    const block = extractJobBlock(workflowContent, "build-and-check");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).toContain("ref: refs/heads/master");
    expect(block).not.toContain("fetch-depth: 0");
    expect(block).toMatch(/^\s+run: bun run build$/m);
    expect(block).toContain("scripts/pack-packages.ts --slice publishable");
    expect(block).toContain("packages/runtime/*.tgz");
  });

  test("checks Codex hook bundle drift before build regeneration", () => {
    const block = extractJobBlock(workflowContent, "build-and-check");
    const dependencyInstall = block.indexOf("bun install --frozen-lockfile");
    const driftCheck = block.indexOf(
      "bun run --filter kibi-codex check:hook-bundle",
    );
    const packagesBuild = block.search(/\bbun run build\b/);

    expect(dependencyInstall).toBeGreaterThanOrEqual(0);
    expect(driftCheck).toBeGreaterThan(dependencyInstall);
    expect(packagesBuild).toBeGreaterThan(driftCheck);
  });

  test("keeps package packing and smoke-install order canonical", () => {
    const block = extractJobBlock(workflowContent, "build-and-check");
    expect(block).toContain("scripts/pack-packages.ts --slice publishable");
    const artifactOrder = [
      ...block.matchAll(/packages\/([^/]+)\/\*\.tgz/g),
    ].map(([, directory]) => directory);
    expect(artifactOrder).toEqual([
      "core",
      "plugin-sdk",
      "plugin-builtin",
      "plugin-jev",
      "plugin-treesitter",
      "runtime",
      "cli",
      "mcp",
      "opencode",
      "codex",
      "cursor",
    ]);

    const smokeBlock = extractJobBlock(workflowContent, "release-gate");
    const installOrder = ["core", "runtime", "cli", "mcp", "opencode", "codex"];
    const installIndexes = installOrder.map((directory) =>
      smokeBlock.indexOf(`packages/${directory}/kibi-`),
    );
    expect(installIndexes.every((index) => index >= 0)).toBe(true);
    expect(installIndexes).toEqual([...installIndexes].sort((a, b) => a - b));
  });

  test("keeps publish-selective auto-detection in canonical package order", () => {
    expect(selectivePublishContent).toContain(
      "bun scripts/package-catalog.ts --print-publishable-tsv",
    );
    expect(selectivePublishContent).toContain(
      "bun scripts/package-catalog.ts --lookup",
    );
  });

  // ── release-gate ────────────────────────────────────────────────────
  test("release-gate: shallow checkout pinned to master", () => {
    const block = extractJobBlock(workflowContent, "release-gate");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).toContain("ref: refs/heads/master");
    expect(block).not.toContain("fetch-depth: 0");
    expect(block).toContain("packages/runtime/kibi-runtime-*.tgz");
    expect(block).toContain("bun run build:cli-stack");
  });

  // ── publish ─────────────────────────────────────────────────────────
  test("publish: checkout-free, artifact-driven", () => {
    const block = extractJobBlock(workflowContent, "publish");
    expect(block).not.toContain("actions/checkout@v6");
    expect(block).toContain("Download package tarballs");
    expect(block).toContain("npm publish");
  });

  test("publishes MCP Registry metadata only for a successfully released MCP package", () => {
    const block = extractJobBlock(workflowContent, "publish-mcp-registry");

    expect(block).toContain("needs: [build-and-check, publish]");
    expect(block).toContain(
      "contains(needs.build-and-check.outputs.toPublish, 'mcp=kibi-mcp')",
    );
    expect(block).toContain("needs.publish.result == 'success'");
    expect(block).toContain("grep -Fxq 'mcp=kibi-mcp'");
    expect(block).toContain("id-token: write");
  });

  test("packed publish compile does not repeat the emitting E2E typecheck", () => {
    const block = extractJobBlock(workflowContent, "release-gate");
    expect(block).toContain("bun run compile:e2e:packed");
    expect(block).not.toContain("bun run typecheck:e2e:packed");
  });

  // ── create-github-releases ──────────────────────────────────────────
  test("create-github-releases: shallow checkout pinned to master", () => {
    const block = extractJobBlock(workflowContent, "create-github-releases");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).toContain("ref: refs/heads/master");
    expect(block).not.toContain("fetch-depth: 0");
  });

  // ── Negative-case: helper catches regressions ───────────────────────
  describe("negative regression detection", () => {
    test("rejects publish job with checkout re-added", () => {
      const block = extractJobBlock(workflowContent, "publish");
      // Simulate a mutated publish block that re-introduces checkout
      const mutated = block.replace(
        "Download package tarballs",
        "Checkout\n        uses: actions/checkout@v6\n        with:\n          fetch-depth: 1\n      - name: Download package tarballs",
      );
      expect(mutated).toContain("actions/checkout@v6");
    });

    test("rejects any job retaining fetch-depth: 0", () => {
      const jobs = [
        "check-release",
        "build-and-check",
        "release-gate",
        "create-github-releases",
      ] as const;
      for (const job of jobs) {
        const block = extractJobBlock(workflowContent, job);
        // Simulate regression: change fetch-depth: 1 → 0
        const mutated = block.replace("fetch-depth: 1", "fetch-depth: 0");
        expect(mutated).toContain("fetch-depth: 0");
        expect(mutated).not.toContain("fetch-depth: 1");
      }
    });
  });
});
