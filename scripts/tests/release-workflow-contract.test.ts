import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

// Execute the actual workflow step with npm and sleep isolated in a temp
// workspace. The remaining Node metadata reads use the real executable.
function verifyPublishedMetadata(workflowContent: string, responses: string[]) {
  const block = extractJobBlock(workflowContent, "publish-mcp-registry");
  const step = block.match(
    /- name: Verify the published npm package has the registry name\n(?: {8}[^\n]*\n)*? {8}run: \|\n((?: {10}[^\n]*\n|\n)+)/,
  );
  if (!step?.[1]) throw new Error("npm verification step was not found");
  const script = step[1].replace(/^ {10}/gm, "");
  const root = mkdtempSync(join(tmpdir(), "kibi-registry-visibility-"));
  try {
    mkdirSync(join(root, "packages/mcp"), { recursive: true });
    mkdirSync(join(root, "bin"));
    writeFileSync(
      join(root, "packages/mcp/package.json"),
      JSON.stringify({
        version: "2.1.1",
        mcpName: "io.github.looted/kibi-mcp",
      }),
    );
    writeFileSync(join(root, "responses"), responses.join("\n"));
    writeFileSync(join(root, "attempts"), "0");
    writeFileSync(join(root, "sleeps"), "");
    writeFileSync(join(root, "arguments"), "");
    writeFileSync(
      join(root, "bin/npm"),
      `#!/bin/bash
set -eu
attempt=$(cat attempts)
attempt=$((attempt + 1))
echo "$attempt" > attempts
echo "$*" >> arguments
response=$(sed -n "\${attempt}p" responses)
case "$response" in
  unavailable|"") echo 'npm error E404 No match found for version 2.1.1' >&2; exit 1 ;;
  missing) exit 0 ;;
  *) echo "$response" ;;
esac
`,
      { mode: 0o755 },
    );
    writeFileSync(
      join(root, "bin/sleep"),
      '#!/bin/bash\necho "$*" >> sleeps\n',
      {
        mode: 0o755,
      },
    );
    const result = spawnSync("bash", ["-e", "-c", script], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, "bin")}:${process.env.PATH}`,
      },
      encoding: "utf8",
      timeout: 5000,
    });
    return {
      status: result.status,
      output: result.stdout + result.stderr,
      attempts: Number(readFileSync(join(root, "attempts"), "utf8")),
      sleeps: readFileSync(join(root, "sleeps"), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean),
      arguments: readFileSync(join(root, "arguments"), "utf8"),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
      "agent-core",
      "plugin-builtin",
      "plugin-jev",
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

  describe("published MCP npm metadata verification", () => {
    test("accepts immediately visible metadata without waiting", () => {
      const result = verifyPublishedMetadata(workflowContent, [
        "io.github.looted/kibi-mcp",
      ]);
      expect(result.status).toBe(0);
      expect(result.attempts).toBe(1);
      expect(result.sleeps).toEqual([]);
    });

    test("waits for npm visibility after publication before accepting metadata", () => {
      const result = verifyPublishedMetadata(workflowContent, [
        "unavailable",
        "unavailable",
        "io.github.looted/kibi-mcp",
      ]);
      expect(result.status).toBe(0);
      expect(result.attempts).toBe(3);
      expect(result.sleeps).toEqual(["10", "10"]);
      expect(result.arguments).toContain(
        "--registry=https://registry.npmjs.org",
      );
      expect(result.arguments).toContain("--fetch-retries=0");
      expect(result.arguments).toContain("--fetch-timeout=10000");
    });

    test("fails after a bounded wait with the final npm error", () => {
      const result = verifyPublishedMetadata(workflowContent, ["unavailable"]);
      expect(result.status).toBe(1);
      expect(result.attempts).toBe(12);
      expect(result.sleeps).toEqual(Array(11).fill("10"));
      expect(result.output).toContain("npm error E404");
      expect(result.output).toContain("not available after 12 attempts");
    });

    test.each(["io.github.someone-else/kibi-mcp", "missing"])(
      "fails immediately for visible but incorrect metadata: %s",
      (response) => {
        const result = verifyPublishedMetadata(workflowContent, [
          response,
          "io.github.looted/kibi-mcp",
        ]);
        expect(result.status).toBe(1);
        expect(result.attempts).toBe(1);
        expect(result.sleeps).toEqual([]);
        expect(result.output).toContain("expected 'io.github.looted/kibi-mcp'");
      },
    );
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
