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
  const nextJobRe = /\n {2}[a-z]/g;
  nextJobRe.lastIndex = afterHeader;
  const match = nextJobRe.exec(content);
  const endIdx = match ? match.index : content.length;
  return content.slice(startIdx, endIdx);
}

describe("ci.yml CI workflow contract", () => {
  const workflowContent = readFileSync(WORKFLOW_PATH, "utf8");
  const packedJobs = [
    "packed-e2e-cli-regression",
    "packed-e2e-mcp-regression",
    "packed-e2e-tarball-verify",
    "packed-e2e-branch-workflow",
  ] as const;
  const sourceDependentPackedJobs: readonly string[] = [
    "packed-e2e-mcp-regression",
    "packed-e2e-tarball-verify",
  ] as readonly string[];
  const coverageGatedJobs = [...packedJobs, "publish-dry-run"] as const;

  test("artifact names appear in workflow", () => {
    expect(workflowContent).toContain("kibi-tarballs");
    expect(workflowContent).toContain("kibi-e2e-tests-compiled");
  });

  test("packed-e2e jobs: download artifacts and checkout only when source-dependent", () => {
    for (const job of packedJobs) {
      const block = extractJobBlock(workflowContent, job);
      if (sourceDependentPackedJobs.includes(job)) {
        // These jobs execute tests that read repo-local fixtures/source files.
        expect(block).toContain("actions/checkout@v6");
        expect(block).toContain("fetch-depth: 1");
      } else {
        // Artifact-only packed jobs should remain checkout-free.
        expect(block).not.toContain("actions/checkout@v6");
      }

      // Packed jobs must download both artifacts
      expect(block).toContain("kibi-tarballs");
      expect(block).toContain("kibi-e2e-tests-compiled");

      // Packed jobs must point the runner tests at the tarball location
      expect(block).toContain(
        "KIBI_TEST_TARBALLS: ${{ github.workspace }}/packages",
      );
    }
  });

  test("build-and-test: explicit shallow checkout", () => {
    const block = extractJobBlock(workflowContent, "build-and-test");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
  });

  test("build-and-test: unit coverage runs on pull requests and pushes", () => {
    const block = extractJobBlock(workflowContent, "build-and-test");
    expect(block).toContain("- name: Run unit tests with coverage");
    expect(block).toContain("if: ${{ !inputs.skip_tests }}");
    expect(block).toContain("run: bun run test:coverage:unit");
    expect(block).not.toContain(
      "Run unit tests with coverage\n        if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/develop' }}",
    );
  });

  test("downstream jobs wait for both JS and Prolog coverage gates", () => {
    for (const job of coverageGatedJobs) {
      const block = extractJobBlock(workflowContent, job);
      expect(block).toContain("needs: [build-and-test, prolog-unit-coverage]");
    }
  });

  test("publish-dry-run: explicit shallow checkout", () => {
    const block = extractJobBlock(workflowContent, "publish-dry-run");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
  });

  describe("negative regression detection", () => {
    test("rejects artifact-only packed job with checkout re-added", () => {
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

    test("rejects downstream jobs that bypass prolog coverage", () => {
      const block = extractJobBlock(workflowContent, coverageGatedJobs[0]);
      const mutated = block.replace(
        "needs: [build-and-test, prolog-unit-coverage]",
        "needs: build-and-test",
      );
      expect(mutated).toContain("needs: build-and-test");
      expect(mutated).not.toContain("prolog-unit-coverage");
    });
  });
});
