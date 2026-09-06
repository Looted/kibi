import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

mock.module("../runtime/skill-assembly", () => ({
  assembleCanonicalSkills: async () => undefined,
}));

mock.module("../runtime/mcp-broker-stage", () => ({
  stageKibiMcpBroker: async (workspace: {
    target: string;
    privateEvidence: string;
  }) => ({
    command: process.execPath,
    args: ["fake-broker.js"],
    cwd: workspace.target,
    bundlePath: join(workspace.privateEvidence, "fake-broker.js"),
    tracePath: join(workspace.privateEvidence, "broker-trace.jsonl"),
    downstream: {
      command: process.execPath,
      args: ["fake-mcp.js"],
      cwd: workspace.target,
    },
  }),
}));

mock.module("../runtime/canary-runtime", () => ({
  probeRequiredMcp: async () => ({ toolNames: ["kb_status"] }),
}));

mock.module("../runtime/final-state", () => ({
  FinalStateReceiptSchema: { parse: (value: unknown) => value },
  runIndependentFinalState: async () => ({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/workspace",
    requests: [
      {
        tool: "kb_status",
        args: {},
        result: { ok: true },
        resultHash: "a".repeat(64),
      },
    ],
  }),
}));

mock.module("../runtime/codex-cell-defaults", () => ({
  sealDefaultCellEvidence: () => ({
    finalState: {
      complete: true,
      integrityValid: true,
      claims: [],
      snapshot: "{}",
    },
    broker: {
      complete: true,
      integrityValid: true,
      orderedCalls: [],
      claims: [],
    },
    diagnostic: { complete: true, integrityValid: true, claims: [] },
    codex: { complete: true, integrityValid: true, claims: [] },
    isolation: { observedSentinels: [], violations: [] },
  }),
}));

mock.module("../scoring/cell", () => ({
  scoreCell: () => ({
    outcome: "pass",
    score: 100,
    hard: 1,
    criticalFailures: [],
    terminalCategory: null,
  }),
}));

const { runCursorCell } = await import("../cursor/runner");
import { ProcessControlError } from "../runtime/process";
import { hashWorkspace } from "../fixtures/workspace";
import { evaluatorManifest } from "../tests/fixtures/evaluator-authority-fixtures";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(): Promise<{ root: string; hash: string }> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-cursor-fix-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), '{"private":true}\n');
  return { root, hash: hashWorkspace(root) };
}

function request(workspaceFixtureHash: string) {
  return {
    schemaVersion: "1.0.0" as const,
    artifactType: "episode-request" as const,
    episodeId: "00000000-0000-4000-8000-000000000011",
    runId: "00000000-0000-4000-8000-000000000012",
    runLockHash: "d".repeat(64),
    variant: "baseline" as const,
    skill: "kibi-usage" as const,
    taskId: "fake-task",
    attempt: 1,
    prompt: "Run the fixture task.",
    workspaceFixtureHash,
  };
}

describe("runCursorCell", () => {
  test("persists a compatibility receipt for a completed cursor episode", async () => {
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-cursor-art-"));
    roots.push(artifactRoot);
    const completed = await runCursorCell(
      {
        request: request(publicFixture.hash),
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        candidate: { body: "# candidate\n" },
        cursorExecutable: "/tmp/fake-cursor",
        hostVersion: "2026.08.11-test",
        env: { ...process.env, EXTRA: undefined },
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        timeoutMs: 1_000,
      },
      {
        clock: () => new Date("2026-01-01T00:00:00Z"),
        run: async () => ({
          argv: ["cursor"],
          stdout: '{"type":"result"}\n',
          stderr: "",
          exitCode: 0,
          signal: null,
        }),
      },
    );
    expect(completed.receipt.host).toBe("cursor-agent");
    expect(completed.receipt.termination).toBe("exit");
    expect(completed.receipt.exitCode).toBe(0);
  });

  test("records timeout termination from ProcessControlError", async () => {
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-cursor-to-"));
    roots.push(artifactRoot);
    const completed = await runCursorCell(
      {
        request: request(publicFixture.hash),
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        candidate: { body: "# candidate\n" },
        cursorExecutable: "/tmp/fake-cursor",
        hostVersion: "2026.08.11-test",
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        timeoutMs: 1_000,
      },
      {
        run: async () => {
          throw new ProcessControlError("timeout", {
            argv: ["cursor"],
            stdout: "",
            stderr: "timed out",
            exitCode: 1,
            signal: "SIGTERM",
          });
        },
      },
    );
    expect(completed.receipt.termination).toBe("timeout");
    expect(completed.receipt.exitCode).toBeNull();
  });

  test("rethrows non-process errors and workspace hash mismatches", async () => {
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-cursor-err-"));
    roots.push(artifactRoot);
    await expect(
      runCursorCell({
        request: { ...request(publicFixture.hash), workspaceFixtureHash: "e".repeat(64) },
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        candidate: { body: "# candidate\n" },
        cursorExecutable: "/tmp/fake-cursor",
        hostVersion: "2026.08.11-test",
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow("workspace_fixture_hash_mismatch");

    await expect(
      runCursorCell(
        {
          request: request(publicFixture.hash),
          fixtureRoot: publicFixture.root,
          sourceWorktree: process.cwd(),
          artifactRoot,
          targetSkill: "kibi-usage",
          candidate: { body: "# candidate\n" },
          cursorExecutable: "/tmp/fake-cursor",
          hostVersion: "2026.08.11-test",
          finalStateRequests: [{ tool: "kb_status", args: {} }],
          evaluatorManifest: evaluatorManifest("predicate"),
          timeoutMs: 1_000,
        },
        {
          run: async () => {
            throw new Error("cursor-crashed");
          },
        },
      ),
    ).rejects.toThrow("cursor-crashed");
  });
});
