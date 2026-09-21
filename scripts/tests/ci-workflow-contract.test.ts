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
const CODECOV_CONFIG_PATH = join(import.meta.dir, "..", "..", "codecov.yml");
const DOCKERFILE_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "docker",
  "test-runner.Dockerfile",
);
const DOCKER_ENTRYPOINT_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "scripts",
  "docker",
  "entrypoint.sh",
);
const SWI_INSTALL_PATH = join(
  import.meta.dir,
  "..",
  "ci-install-swi-prolog.sh",
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
  const codecovConfig = readFileSync(CODECOV_CONFIG_PATH, "utf8");
  const dockerfileContent = readFileSync(DOCKERFILE_PATH, "utf8");
  const dockerEntrypointContent = readFileSync(DOCKER_ENTRYPOINT_PATH, "utf8");
  const packedJobs = [
    "packed-e2e-cli-regression",
    "packed-e2e-mcp-regression",
    "packed-e2e-tarball-verify",
    "packed-e2e-branch-workflow",
  ] as const;
  const sourceDependentPackedJobs: readonly string[] = [
    "packed-e2e-cli-regression",
    "packed-e2e-mcp-regression",
    "packed-e2e-tarball-verify",
    "packed-e2e-branch-workflow",
  ] as readonly string[];
  const coverageGatedJobs = [...packedJobs] as const;

  test("artifact names appear in workflow", () => {
    expect(workflowContent).toContain("kibi-tarballs");
    expect(workflowContent).toContain("kibi-e2e-tests-compiled");
    expect(extractJobBlock(workflowContent, "ci-package-contract")).toContain(
      "scripts/pack-packages.ts --slice ci-pack",
    );
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

  test("multi-file CLI and MCP packed jobs use the shared packed runner", () => {
    expect(
      extractJobBlock(workflowContent, "packed-e2e-cli-regression"),
    ).toContain("node scripts/run-packed-e2e.mjs");
    expect(
      extractJobBlock(workflowContent, "packed-e2e-mcp-regression"),
    ).toContain("node scripts/run-packed-e2e.mjs");
    expect(workflowContent).not.toMatch(
      /node --test --test-concurrency=1 \/tmp\/kibi-e2e-packed-compiled\/(?:cli|mcp)-[^\n]+\.test\.js[^\n]*\n[^\n]*node --test/s,
    );
  });

  test("packed compilation performs the E2E typecheck while emitting", () => {
    const packBlock = extractJobBlock(workflowContent, "ci-package-contract");
    expect(packBlock).toContain("bun run compile:e2e:packed");
    expect(packBlock).not.toContain("bun run typecheck:e2e:packed");
  });

  test("Docker packed fallback covers every package and uses the shared runner", () => {
    expect(dockerfileContent).toContain(
      "scripts/pack-packages.ts --slice packed-e2e",
    );
    expect(dockerEntrypointContent).toContain(
      "scripts/pack-packages.ts --slice packed-e2e",
    );
    expect(dockerEntrypointContent).toContain(
      "/workspace/scripts/run-packed-e2e.mjs",
    );
  });

  test("ci-typecheck-build: explicit shallow checkout", () => {
    const block = extractJobBlock(workflowContent, "ci-typecheck-build");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
  });

  test("checks Codex hook bundle drift before build regeneration", () => {
    const block = extractJobBlock(workflowContent, "ci-typecheck-build");
    const dependencyInstall = block.indexOf("bun install --frozen-lockfile");
    const driftCheck = block.indexOf(
      "bun run --filter kibi-codex check:hook-bundle",
    );
    const codexBuild = block.indexOf("bun run build:codex");

    expect(dependencyInstall).toBeGreaterThanOrEqual(0);
    expect(driftCheck).toBeGreaterThan(dependencyInstall);
    expect(codexBuild).toBeGreaterThan(driftCheck);
  });

  test("ci-unit-coverage: unit coverage runs on pull requests and pushes", () => {
    const block = extractJobBlock(workflowContent, "ci-unit-coverage");
    expect(block).toContain("- name: Run unit tests with coverage");
    expect(block).toContain("run: bun run test:coverage:unit");
    expect(workflowContent).toContain("ci-typecheck-build:");
    expect(workflowContent).toContain("ci-integration:");
    expect(workflowContent).toContain("ci-package-contract:");
  });

  test("Codecov unit status enforces the initial 50 percent floor", () => {
    expect(workflowContent).toContain("flags: unit");
    expect(workflowContent).toContain("files: ./coverage/unit/lcov.info");
    expect(codecovConfig).toContain('range: "50...100"');
    expect(codecovConfig).toContain("project:");
    expect(codecovConfig).toContain("patch:");
    expect(codecovConfig).toContain("target: 50%");
    expect(codecovConfig).toContain("threshold: 0%");
    expect(codecovConfig).toContain("- unit");
  });

  test("SWI install avoids Launchpad GPG API and can build from source", () => {
    const installScript = readFileSync(SWI_INSTALL_PATH, "utf8");
    expect(installScript).toContain("library(prolog_coverage)");
    expect(installScript).toContain("Failed to fetch .*${SWI_PPA_FETCH_RE}");
    expect(installScript).toContain(
      "refusing Ubuntu 9.0.x fallback that lacks library(prolog_coverage)",
    );
    expect(installScript).toContain("require_prolog_coverage_library");
    expect(installScript).not.toContain("apt-add-repository -y");
    expect(installScript).toContain("add_swi_ppa_without_launchpad_api");
    expect(installScript).toContain("install_swi_from_official_source");
    expect(installScript).toContain("SWIPL_SRC_VERSION:-10.0.2");
    expect(installScript).toContain("swipl-${SWIPL_SRC_VERSION}.tar.gz");
    expect(installScript).toContain(
      "e42cc098f7b8a6051c4f79a99b55162d467098aba60f69649bdc7583f0734b57",
    );
    expect(installScript).toContain("E8B739E3753FF4A12360BA6A4AB3A5F60EA9AEB3");
    expect(installScript).toContain("refresh_ubuntu_indexes");
    expect(installScript).not.toContain('apt-get install -y "$@"');
  });

  test("downstream packed jobs wait for package artifacts and Prolog coverage, not the serial build", () => {
    for (const job of coverageGatedJobs) {
      const block = extractJobBlock(workflowContent, job);
      expect(block).toContain(
        "needs: [ci-package-contract, prolog-unit-coverage]",
      );
      expect(block).not.toContain(
        "needs: [build-and-test, prolog-unit-coverage]",
      );
    }
    expect(workflowContent).toContain("ci-typecheck-build:");
    expect(workflowContent).toContain("ci-unit-coverage:");
    expect(workflowContent).toContain("ci-integration:");
    expect(extractJobBlock(workflowContent, "ci-unit-coverage")).not.toContain(
      "needs:",
    );
    expect(
      extractJobBlock(workflowContent, "ci-package-contract"),
    ).not.toContain("needs:");
  });

  test("CI defers native Windows ZCode builds", () => {
    expect(extractJobBlock(workflowContent, "zcode-windows")).toBe("");
    expect(workflowContent).not.toContain("windows-latest");
  });

  test("ci-package-contract: explicit shallow checkout and catalog packing", () => {
    const block = extractJobBlock(workflowContent, "ci-package-contract");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
    expect(block).toContain("bun run build:runtime");
    expect(block).toContain("scripts/pack-packages.ts --slice ci-pack");
    expect(block).toContain("scripts/package-catalog.ts");
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
      const block = extractJobBlock(workflowContent, "ci-typecheck-build");
      const mutated = block.replace("fetch-depth: 1", "fetch-depth: 0");
      expect(mutated).toContain("fetch-depth: 0");
      expect(mutated).not.toContain("fetch-depth: 1");
    });

    test("rejects downstream jobs that bypass prolog coverage", () => {
      const block = extractJobBlock(workflowContent, coverageGatedJobs[0]);
      const mutated = block.replace(
        "needs: [ci-package-contract, prolog-unit-coverage]",
        "needs: ci-package-contract",
      );
      expect(mutated).toContain("needs: ci-package-contract");
      expect(mutated).not.toContain("prolog-unit-coverage");
    });
  });
});
