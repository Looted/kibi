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
    expect(block).toContain("bun run build:runtime");
    expect(block).toContain("cd ../runtime && npm pack");
    expect(block).toContain("packages/runtime/*.tgz");
  });

  // ── release-gate ────────────────────────────────────────────────────
  test("release-gate: shallow checkout pinned to master", () => {
    const block = extractJobBlock(workflowContent, "release-gate");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).toContain("ref: refs/heads/master");
    expect(block).not.toContain("fetch-depth: 0");
    expect(block).toContain("packages/runtime/kibi-runtime-*.tgz");
  });

  // ── publish ─────────────────────────────────────────────────────────
  test("publish: checkout-free, artifact-driven", () => {
    const block = extractJobBlock(workflowContent, "publish");
    expect(block).not.toContain("actions/checkout@v6");
    expect(block).toContain("Download package tarballs");
    expect(block).toContain("npm publish");
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
