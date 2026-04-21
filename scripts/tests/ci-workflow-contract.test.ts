import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_PATH = join(
  import.meta.dir,
  "..",
  "..",
  ".github",
  "workflows",
  "ci.yml",
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
  const nextJobRe = /\n  [a-z]/g;
  nextJobRe.lastIndex = afterHeader;
  const match = nextJobRe.exec(content);
  const endIdx = match ? match.index : content.length;
  return content.slice(startIdx, endIdx);
}

describe("ci.yml CI workflow contract", () => {
  const workflowContent = readFileSync(WORKFLOW_PATH, "utf8");

  test("artifact names appear in workflow", () => {
    expect(workflowContent).toContain("kibi-tarballs");
    expect(workflowContent).toContain("kibi-e2e-tests-compiled");
  });

  const packedJobs = [
    "packed-e2e-cli-regression",
    "packed-e2e-mcp-regression",
    "packed-e2e-tarball-verify",
    "packed-e2e-branch-workflow",
  ] as const;

  test("packed-e2e jobs: checkout-free and download artifacts", () => {
    for (const job of packedJobs) {
      const block = extractJobBlock(workflowContent, job);
      // Packed jobs must NOT perform a checkout
      expect(block).not.toContain("actions/checkout@v6");

      // Packed jobs must download both artifacts
      expect(block).toContain("kibi-tarballs");
      expect(block).toContain("kibi-e2e-tests-compiled");

      // Packed jobs must point the runner tests at the tarball location
      expect(block).toContain("KIBI_TEST_TARBALLS: ${{ github.workspace }}/packages");
    }
  });

  test("build-and-test: explicit shallow checkout", () => {
    const block = extractJobBlock(workflowContent, "build-and-test");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
  });

  test("publish-dry-run: explicit shallow checkout", () => {
    const block = extractJobBlock(workflowContent, "publish-dry-run");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
  });

  describe("negative regression detection", () => {
    test("rejects packed job with checkout re-added", () => {
      const block = extractJobBlock(workflowContent, packedJobs[0]);
      // Simulate a mutated packed block that re-introduces checkout
      const mutated = block.replace(
        "Download tarball artifacts",
        "Checkout\n        uses: actions/checkout@v6\n        with:\n          fetch-depth: 1\n      - name: Download tarball artifacts",
      );
      expect(mutated).toContain("actions/checkout@v6");
    });

    test("rejects remaining checkout that omits fetch-depth: 1", () => {
      const block = extractJobBlock(workflowContent, "build-and-test");
      // Simulate regression: remove fetch-depth: 1
      const mutated = block.replace("fetch-depth: 1", "fetch-depth: 0");
      expect(mutated).toContain("fetch-depth: 0");
      expect(mutated).not.toContain("fetch-depth: 1");
    });
  });
});
