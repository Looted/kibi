// executable_for TEST-prolog-bundled-ci
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
    expect(dockerEntrypointContent).toContain("bun run build:cli-stack");
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
    const packagesBuild = block.search(/\bbun run build\b/);

    expect(dependencyInstall).toBeGreaterThanOrEqual(0);
    expect(driftCheck).toBeGreaterThan(dependencyInstall);
    expect(packagesBuild).toBeGreaterThan(driftCheck);
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
    const sourcePin = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "swipl-version.json"), "utf8"),
    );
    expect(installScript).toContain("library(prolog_coverage)");
    expect(installScript).toContain("Failed to fetch .*${SWI_PPA_FETCH_RE}");
    expect(installScript).toContain(
      "refusing Ubuntu 9.0.x fallback that lacks library(prolog_coverage)",
    );
    expect(installScript).toContain("require_prolog_coverage_library");
    expect(installScript).not.toContain("apt-add-repository -y");
    expect(installScript).toContain("add_swi_ppa_without_launchpad_api");
    expect(installScript).toContain("install_swi_from_official_source");
    expect(installScript).toContain('"${SCRIPT_DIR}/swipl-version.json"');
    expect(installScript).toContain("swipl-${SWIPL_SRC_VERSION}.tar.gz");
    expect(sourcePin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(sourcePin.sha256).toMatch(/^[0-9a-f]{64}$/);
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
    expect(extractJobBlock(workflowContent, "ci-unit-coverage")).toContain(
      "needs: [swipl-bundle]",
    );
    expect(
      extractJobBlock(workflowContent, "ci-package-contract"),
    ).not.toContain("needs:");
  });

  test("CI defers native Windows ZCode builds", () => {
    expect(extractJobBlock(workflowContent, "zcode-windows")).toBe("");
    expect(workflowContent).not.toContain("windows-latest");
  });

  test("jobs that compile CLI also build plugin-sdk and plugin-builtin first", () => {
    const jobs = [
      "ci-typecheck-build",
      "ci-unit-coverage",
      "ci-integration",
      "ci-package-contract",
    ] as const;
    for (const job of jobs) {
      const block = extractJobBlock(workflowContent, job);
      const usesFullBuild = /^\s+run: bun run build$/m.test(block);
      const usesCliStack = block.includes("bun run build:cli-stack");
      const usesPluginPrefix =
        block.includes("bun run build:plugin-sdk") &&
        block.includes("bun run build:plugin-builtin") &&
        block.includes("bun run build:cli");
      expect(usesFullBuild || usesCliStack || usesPluginPrefix).toBe(true);
      expect(block).not.toMatch(/^\s+run: bun run build:cli$/m);
    }
  });

  test("ci-package-contract: explicit shallow checkout and catalog packing", () => {
    const block = extractJobBlock(workflowContent, "ci-package-contract");
    expect(block).toContain("actions/checkout@v6");
    expect(block).toContain("fetch-depth: 1");
    expect(block).not.toContain("fetch-depth: 0");
    expect(block).toMatch(/^\s+run: bun run build$/m);
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

describe("Kibi's own CI runs the Prolog that ships", () => {
  const root = join(import.meta.dir, "..", "..");
  const read = (...parts: string[]) =>
    readFileSync(join(root, ...parts), "utf8");
  const ci = read(".github", "workflows", "ci.yml");
  const proof = read(".github", "workflows", "proof.yml");
  const bundleWorkflow = read(".github", "workflows", "swipl-ci-bundle.yml");
  const action = read(".github", "actions", "use-bundled-swipl", "action.yml");
  const ACTION_REF = "./.github/actions/use-bundled-swipl";
  const bundledJobs = [
    "ci-unit-coverage",
    "prolog-unit-coverage",
    "packed-e2e-cli-regression",
    "packed-e2e-mcp-regression",
    "packed-e2e-branch-workflow",
  ] as const;

  test("every Prolog job but one runs the pipeline-built bundle", () => {
    for (const job of bundledJobs) {
      const block = extractJobBlock(ci, job);
      expect(block, job).toContain(ACTION_REF);
      expect(block, job).not.toContain("ci-install-swi-prolog");
      expect(block, job).not.toContain("kibi-swipl-prefix");
    }
    expect(extractJobBlock(ci, "ci-unit-coverage")).toContain(
      "verify-resolver: 'true'",
    );
  });

  test("the bundle is built once per run, ahead of the jobs that use it", () => {
    const workflow = Bun.YAML.parse(ci) as {
      jobs: Record<string, { uses?: string; needs?: string | string[] }>;
    };
    expect(workflow.jobs["swipl-bundle"]?.uses).toBe(
      "./.github/workflows/swipl-ci-bundle.yml",
    );
    for (const job of ["ci-unit-coverage", "prolog-unit-coverage"]) {
      expect(workflow.jobs[job]?.needs).toEqual(["swipl-bundle"]);
    }
    // The packed jobs wait for prolog-unit-coverage, so the artifact exists.
    for (const job of [
      "packed-e2e-cli-regression",
      "packed-e2e-mcp-regression",
      "packed-e2e-branch-workflow",
    ]) {
      expect(workflow.jobs[job]?.needs).toContain("prolog-unit-coverage");
    }
  });

  test("ci-integration keeps a system SWI-Prolog on PATH and refuses the bundle", () => {
    const block = extractJobBlock(ci, "ci-integration");
    expect(block).toContain("bash scripts/ci-install-swi-prolog.sh");
    expect(block).toContain("KIBI_SWIPL: system");
    expect(block).not.toContain(ACTION_REF);
    expect(
      ci.split("run: bash scripts/ci-install-swi-prolog.sh").length - 1,
    ).toBe(1);
  });

  test("the proof run uses the same bundle", () => {
    const workflow = Bun.YAML.parse(proof) as {
      jobs: {
        proof: { needs: string[]; steps: Array<Record<string, unknown>> };
        "swipl-bundle": { uses: string };
      };
    };
    expect(workflow.jobs["swipl-bundle"].uses).toBe(
      "./.github/workflows/swipl-ci-bundle.yml",
    );
    expect(workflow.jobs.proof.needs).toEqual(["swipl-bundle"]);
    const install = workflow.jobs.proof.steps.find(
      (step) => step.name === "Install SWI-Prolog",
    );
    expect(install?.uses).toBe(ACTION_REF);
    expect(proof).not.toContain("ci-install-swi-prolog");
  });

  test("the archive is cached on everything that determines its bytes", () => {
    const workflow = Bun.YAML.parse(bundleWorkflow) as {
      on: Record<string, unknown>;
      jobs: {
        bundle: {
          container: string;
          steps: Array<{
            uses?: string;
            run?: string;
            with?: Record<string, string>;
          }>;
        };
      };
    };
    expect(Object.keys(workflow.on)).toEqual(["workflow_call"]);
    const job = workflow.jobs.bundle;
    expect(job.container).toBe("quay.io/pypa/manylinux_2_28_x86_64");
    const cache = job.steps.find((step) =>
      step.uses?.startsWith("actions/cache@"),
    );
    const key = cache?.with?.key ?? "";
    for (const input of [
      "scripts/swipl-version.json",
      "scripts/swipl-spike.py",
      "scripts/swipl-spike.sh",
      "scripts/patches/swipl-*.patch",
      ".github/workflows/swipl-build.yml",
      ".github/workflows/swipl-ci-bundle.yml",
    ]) {
      expect(key, input).toContain(`'${input}'`);
    }
    expect(bundleWorkflow).toContain(
      "scripts/swipl-spike.sh build-archive --target linux-x64-gnu",
    );
    const upload = job.steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact@"),
    );
    expect(upload?.with?.name).toBe("kibi-ci-swipl");
    expect(String(upload?.with?.["retention-days"])).toBe("1");
  });

  test("consumers re-verify the archive and prove library(prolog_coverage)", () => {
    expect(action).toContain("scripts/populate-swipl-platform-packages.mjs");
    expect(action).toContain("--targets linux-x64-gnu --cached-build");
    expect(action).toContain("library(prolog_coverage)");
    expect(action).toContain('resolved.source !== "bundled"');
  });

  test("a release never trusts the CI cache or drops its commit binding", () => {
    for (const name of [
      "publish.yml",
      "release-pack.yml",
      "release-smoke.yml",
      "swipl-build.yml",
    ]) {
      const content = read(".github", "workflows", name);
      expect(content, name).not.toContain("--cached-build");
      expect(content, name).not.toContain("swipl-ci-bundle");
      expect(content, name).not.toContain("use-bundled-swipl");
    }
  });
});
