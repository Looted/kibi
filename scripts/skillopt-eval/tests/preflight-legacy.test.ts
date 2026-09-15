import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { isAbsolute, relative } from "node:path";
import { runPreflight } from "../preflight";
import {
  createLegacyPreflightFixture,
  legacyPreflightDependencies as dependencies,
} from "./preflight-legacy-fixture";

const temporaryRoots: string[] = [];

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function fixture() {
  const testFixture = await createLegacyPreflightFixture();
  temporaryRoots.push(testFixture.root);
  return testFixture;
}

describe("SkillOpt Codex preflight", () => {
  test("characterizes source rejection before runtime staging", async () => {
    // Given
    const testFixture = await fixture();
    let staged = false;
    const deps = dependencies({ sourceClean: false });

    // When
    const receipt = await runPreflight(
      {
        runId: "preflight-characterization",
        sourceWorktree: testFixture.root,
        artifactRoot: testFixture.artifactRoot,
        env: testFixture.env,
      },
      {
        ...deps,
        stageRuntime: async (workspace, sourceWorktree) => {
          staged = true;
          return deps.stageRuntime(workspace, sourceWorktree);
        },
      },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "source_not_clean",
      paidModelCalls: 0,
    });
    expect(staged).toBe(false);
  });

  test("passes without a paid call when login and strict config are usable", async () => {
    // Given
    const testFixture = await fixture();

    // When
    const receipt = await runPreflight(
      {
        runId: "preflight-pass",
        sourceWorktree: testFixture.root,
        artifactRoot: testFixture.artifactRoot,
        env: testFixture.env,
      },
      dependencies(),
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "pass",
      authMode: "file",
      bwrap: true,
      sourceClean: true,
      configValid: true,
      codexVersion: "codex-cli 0.144.6",
      paidModelCalls: 0,
    });
  });

  test("rejects provider credentials before config validation", async () => {
    // Given
    const testFixture = await fixture();

    // When
    const receipt = await runPreflight(
      {
        runId: "preflight-key-rejected",
        sourceWorktree: testFixture.root,
        artifactRoot: testFixture.artifactRoot,
        env: { ...testFixture.env, OPENAI_API_KEY: "forbidden" },
      },
      dependencies(),
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "codex_auth_forbidden_env",
      paidModelCalls: 0,
    });
  });

  test("fails closed for each runtime prerequisite before paid calls", async () => {
    // Given
    const testFixture = await fixture();
    const cases = [
      [dependencies({ bwrap: false }), "missing_isolation:bwrap"],
      [dependencies({ mcp: false }), "required_mcp_startup:connection_closed"],
      [dependencies({ sandbox: false }), "isolation_probe_failed"],
      [
        dependencies({ sourceIsolation: false }),
        "source_isolation_probe_failed",
      ],
      [dependencies({ sourceClean: false }), "source_not_clean"],
      [dependencies({ doctorExit: 1 }), "config_invalid"],
    ] as const;

    // When
    const receipts = await Promise.all(
      cases.map(([deps], index) =>
        runPreflight(
          {
            runId: `preflight-failure-${index}`,
            sourceWorktree: testFixture.root,
            artifactRoot: testFixture.artifactRoot,
            env: testFixture.env,
          },
          deps,
        ),
      ),
    );

    // Then
    expect(receipts.map((receipt) => receipt.reason)).toEqual(
      cases.map((entry) => entry[1]),
    );
  });

  test("places the default preflight runtime outside the source worktree", async () => {
    // Given
    const testFixture = await fixture();
    let stagedRoot = "";
    const deps = dependencies();

    // When
    const receipt = await runPreflight(
      {
        runId: "external-preflight-runtime",
        sourceWorktree: testFixture.root,
        env: testFixture.env,
      },
      {
        ...deps,
        stageRuntime: async (workspace, sourceWorktree) => {
          stagedRoot = workspace.root;
          return deps.stageRuntime(workspace, sourceWorktree);
        },
      },
    );

    // Then
    const sourceRelative = relative(testFixture.root, stagedRoot);
    expect(receipt.verdict).toBe("pass");
    expect(
      sourceRelative === "" ||
        (!sourceRelative.startsWith("..") && !isAbsolute(sourceRelative)),
    ).toBe(false);
  });
});
