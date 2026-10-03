import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { proveCommand } from "../../src/commands/prove.js";
import type { IngestProofResult } from "../../src/operations/proof/ingest-proof.js";
import type {
  OperationContext,
  OperationRuntime,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { PROOF_INTEGRATION_VERSION } from "../../src/public/proof-protocol.js";

const SNAPSHOT = "a".repeat(64);

const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
  success_policy: "all_required_first_attempt",
} as const;

const otherContract = {
  ...contract,
  integration: "web-e2e",
};

function testProps(extra: string, title = "Contracted flow"): string {
  return `title="${title}",status=active,source="tests/flow.spec.ts",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,verification_perspective=consumer${extra}`;
}

function entityRow(id: string, extra: string, title?: string): string {
  return `[${id},test,[${testProps(extra, title)}]]`;
}

function withTempWorkspace(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(path.join(tmpdir(), "prove-command-"));
  mkdirSync(path.join(dir, ".kb", "proof"), { recursive: true });
  return run(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function writeIntegrations(
  dir: string,
  integrations: Array<Record<string, unknown>>,
): void {
  writeFileSync(
    path.join(dir, ".kb", "proof", "integrations.json"),
    `${JSON.stringify({
      version: PROOF_INTEGRATION_VERSION,
      integrations,
    })}\n`,
  );
}

function ingestResult(overrides: Partial<IngestProofResult> = {}): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: IngestProofResult;
} {
  return {
    content: [{ type: "text", text: "ok" }],
    structuredContent: {
      artifactDigest: "b".repeat(64),
      environmentHash: "c".repeat(64),
      integration: "self-proof",
      passed: 1,
      failed: 0,
      unchanged: 0,
      results: [],
      ...overrides,
    },
  };
}

function fakeRuntime(
  dir: string,
  query: (goal: string) => Promise<PrologQueryResult>,
): OperationRuntime {
  const context: OperationContext = {
    workspaceRoot: dir,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query,
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: SNAPSHOT,
        dirty: false,
        fileCount: 1,
      }),
    },
  };
  return {
    open: async () => context,
    afterSuccess: async () => undefined,
    close: async () => undefined,
  };
}

function resultsFor(rows: string[]): PrologQueryResult {
  return {
    success: true,
    bindings: { Results: `[${rows.join(",")}]` },
  };
}

async function captureStdout<T>(
  run: () => Promise<T>,
): Promise<{ value: T; output: string }> {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  }) as typeof process.stdout.write;
  try {
    const value = await run();
    return { value, output: chunks.join("") };
  } finally {
    process.stdout.write = original;
  }
}

const passingCommand = ["node", "-e", "process.exit(0)"];
const failingCommand = ["node", "-e", "process.exit(1)"];

describe("proveCommand", () => {
  const originalBranch = process.env.KIBI_BRANCH;

  afterEach(() => {
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });

  test("reports when no proof-bearing tests are selected", async () => {
    await withTempWorkspace(async (dir) => {
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: passingCommand,
          description: "Self proof",
        },
      ]);
      const { value, output } = await captureStdout(() =>
        proveCommand(
          { all: true, workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async () => resultsFor([])),
          },
        ),
      );
      expect(value.exitCode).toBe(0);
      expect(JSON.parse(output)).toMatchObject({
        proved: 0,
        failed: 0,
        message: "no proof-bearing tests selected",
      });
    });
  });

  test("fails when proof integrations are missing", async () => {
    await withTempWorkspace(async (dir) => {
      await expect(
        proveCommand(
          { all: true, workspaceRoot: dir },
          { runtime: fakeRuntime(dir, async () => resultsFor([])) },
        ),
      ).rejects.toThrow("No proof integration configuration");
    });
  });

  test("runs a command producer and ingests a passing artifact", async () => {
    await withTempWorkspace(async (dir) => {
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          producer_version: "1.0.0",
          command: passingCommand,
          description: "Self proof",
        },
      ]);
      const extra = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;
      const { value, output } = await captureStdout(() =>
        proveCommand(
          { all: true, workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([entityRow("TEST-001", extra)]),
            ),
            ingestProof: async () => ingestResult({ unchanged: 1 }),
          },
        ),
      );
      expect(value.exitCode).toBe(0);
      expect(JSON.parse(output)).toMatchObject({
        proved: 1,
        failed: 0,
        unchanged: 1,
      });
    });
  });

  test("marks aggregate failure when the command exits non-zero", async () => {
    await withTempWorkspace(async (dir) => {
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: failingCommand,
          description: "Self proof",
        },
      ]);
      const extra = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;
      const { value, output } = await captureStdout(() =>
        proveCommand(
          { testId: "TEST-001", workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([entityRow("TEST-001", extra)]),
            ),
            ingestProof: async () => ingestResult({ passed: 0, failed: 1 }),
          },
        ),
      );
      expect(value.exitCode).toBe(1);
      const summary = JSON.parse(output);
      expect(summary.failed).toBe(1);
      expect(summary.runs[0]).toMatchObject({
        attribution: "aggregate",
        attributionReason: expect.stringContaining(
          "exited 1 without a kibi.proof-test-report.v1",
        ),
      });
    });
  });

  test("fails only the tests whose own steps failed when the command reports per test", async () => {
    await withTempWorkspace(async (dir) => {
      const testReport = {
        version: "kibi.proof-test-report.v1",
        tests: [
          {
            test_id: "TEST-001",
            outcome: "passed",
            steps: [
              {
                step_index: 1,
                command: ["bun", "test", "a"],
                outcome: "passed",
                exit_code: 0,
              },
            ],
          },
          {
            test_id: "TEST-002",
            outcome: "failed",
            steps: [
              {
                step_index: 1,
                command: ["bun", "test", "b"],
                outcome: "passed",
                exit_code: 0,
              },
              {
                step_index: 2,
                command: ["bun", "test", "c"],
                outcome: "failed",
                exit_code: 3,
              },
            ],
          },
        ],
      };
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: [
            "node",
            "-e",
            `require("fs").writeFileSync(process.env.KIBI_PROOF_TEST_REPORT, ${JSON.stringify(JSON.stringify(testReport))}); process.exit(1)`,
          ],
          description: "Self proof",
        },
      ]);
      const secondContract = {
        ...contract,
        required_proofs: [{ symbol_id: "SYM-CASE-2", target: "default" }],
      };
      const calls: Array<{
        testIds: readonly string[];
        artifact: Record<string, unknown>;
      }> = [];
      const { value, output } = await captureStdout(() =>
        proveCommand(
          { all: true, workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([
                entityRow(
                  "TEST-001",
                  `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`,
                ),
                entityRow(
                  "TEST-002",
                  `,proof_contract=${JSON.stringify(JSON.stringify(secondContract))}`,
                  "Second flow",
                ),
              ]),
            ),
            ingestProof: async (args) => {
              calls.push({
                testIds: args.testIds ?? [],
                artifact: args.artifact as Record<string, unknown>,
              });
              const passedRun =
                (args.artifact as { run: { outcome: string } }).run.outcome ===
                "passed";
              return ingestResult({
                passed: passedRun ? 1 : 0,
                failed: passedRun ? 0 : 1,
              });
            },
          },
        ),
      );

      expect(value.exitCode).toBe(1);
      expect(calls.map((call) => call.testIds)).toEqual([
        ["TEST-001"],
        ["TEST-002"],
      ]);
      const [passing, failing] = calls.map(
        (call) =>
          call.artifact as {
            run: { outcome: string; exit_code: number; failure_phase?: string };
            proof_results: Array<{ symbol_id: string; outcome: string }>;
          },
      );
      expect(passing?.run).toMatchObject({ outcome: "passed", exit_code: 0 });
      expect(passing?.proof_results).toEqual([
        expect.objectContaining({ symbol_id: "SYM-CASE-1", outcome: "passed" }),
      ]);
      expect(failing?.run).toMatchObject({
        outcome: "failed",
        exit_code: 3,
        failure_phase: "execution",
      });
      expect(failing?.proof_results).toEqual([
        expect.objectContaining({ symbol_id: "SYM-CASE-2", outcome: "failed" }),
      ]);

      const summary = JSON.parse(output);
      expect(summary).toMatchObject({ proved: 1, failed: 1 });
      expect(summary.runs).toHaveLength(1);
      expect(summary.runs[0]).toMatchObject({
        integration: "self-proof",
        attribution: "per_test",
        failedSteps: [
          {
            testId: "TEST-002",
            stepIndex: 2,
            command: ["bun", "test", "c"],
            outcome: "failed",
            exitCode: 3,
          },
        ],
      });

      // The whole process run is kept for audit next to each evaluated slice.
      const runs = path.join(dir, ".kb", "proof", "runs");
      const whole = JSON.parse(
        readFileSync(path.join(runs, "self-proof.json"), "utf8"),
      );
      expect(whole.run).toMatchObject({ outcome: "failed", exit_code: 1 });
      expect(whole.diagnostics).toContain(
        "TEST-002 step 2 failed (exit 3): bun test c",
      );
      expect(existsSync(path.join(runs, "self-proof.passed.json"))).toBe(true);
      expect(existsSync(path.join(runs, "self-proof.failed.json"))).toBe(true);
    });
  });

  test("never reads a test report left behind by an earlier run", async () => {
    await withTempWorkspace(async (dir) => {
      const runs = path.join(dir, ".kb", "proof", "runs");
      mkdirSync(runs, { recursive: true });
      writeFileSync(
        path.join(runs, "self-proof.tests.json"),
        JSON.stringify({
          version: "kibi.proof-test-report.v1",
          tests: [
            {
              test_id: "TEST-001",
              outcome: "failed",
              steps: [
                {
                  step_index: 1,
                  command: ["stale"],
                  outcome: "failed",
                  exit_code: 1,
                },
              ],
            },
          ],
        }),
      );
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: failingCommand,
          description: "Self proof",
        },
      ]);
      const extra = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;
      const calls: Array<readonly string[]> = [];
      const { output } = await captureStdout(() =>
        proveCommand(
          { all: true, workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([entityRow("TEST-001", extra)]),
            ),
            ingestProof: async (args) => {
              calls.push(args.testIds ?? []);
              return ingestResult({ passed: 0, failed: 1 });
            },
          },
        ),
      );
      expect(calls).toEqual([["TEST-001"]]);
      const run = JSON.parse(output).runs[0];
      expect(run.attribution).toBe("aggregate");
      expect(run.failedSteps).toBeUndefined();
    });
  });

  test("filters integrations and errors when the selector matches nothing", async () => {
    await withTempWorkspace(async (dir) => {
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: passingCommand,
          description: "Self proof",
        },
      ]);
      const extra = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;
      await expect(
        proveCommand(
          {
            all: true,
            integration: "web-e2e",
            workspaceRoot: dir,
          },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([entityRow("TEST-001", extra)]),
            ),
          },
        ),
      ).rejects.toThrow(
        "no proof-bearing tests match the integration selector",
      );
    });
  });

  test("skips excluded integrations and records unknown integration ids", async () => {
    await withTempWorkspace(async (dir) => {
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: passingCommand,
          description: "Self proof",
        },
      ]);
      const selfExtra = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;
      const webExtra = `,proof_contract=${JSON.stringify(JSON.stringify(otherContract))}`;
      const { value, output } = await captureStdout(() =>
        proveCommand(
          {
            all: true,
            integrationExcept: "self-proof",
            workspaceRoot: dir,
          },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([
                entityRow("TEST-001", selfExtra),
                entityRow("TEST-002", webExtra, "Web flow"),
              ]),
            ),
            ingestProof: async () => ingestResult(),
          },
        ),
      );
      expect(value.exitCode).toBe(1);
      expect(JSON.parse(output).failures[0]).toContain("integration 'web-e2e'");
    });
  });

  test("selects tests behind a requirement query", async () => {
    await withTempWorkspace(async (dir) => {
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: passingCommand,
          description: "Self proof",
        },
      ]);
      const extra = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;
      const goals: string[] = [];
      const { value } = await captureStdout(() =>
        proveCommand(
          { requirement: "REQ-001", workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async (goal) => {
              goals.push(goal);
              if (goal.includes("specified_by")) {
                return {
                  success: true,
                  bindings: { Rows: "[['SCN-1','TEST-001']]" },
                };
              }
              if (goal.includes("validates")) {
                return {
                  success: true,
                  bindings: { Rows: "['TEST-001']" },
                };
              }
              return resultsFor([entityRow("TEST-001", extra)]);
            }),
            ingestProof: async () => ingestResult(),
          },
        ),
      );
      expect(value.exitCode).toBe(0);
      expect(goals.some((goal) => goal.includes("kb_entity(T, test, _)"))).toBe(
        false,
      );
      expect(
        goals.some((goal) =>
          goal.includes("kb_query_proof_contracts(none,100,0,Results)"),
        ),
      ).toBe(true);
    });
  });

  test("records a spawn failure without ingesting", async () => {
    await withTempWorkspace(async (dir) => {
      writeIntegrations(dir, [
        {
          id: "self-proof",
          producer: "command",
          command: ["/no/such/kibi-prove-binary"],
          description: "Self proof",
        },
      ]);
      const extra = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;
      const { value, output } = await captureStdout(() =>
        proveCommand(
          { all: true, workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([entityRow("TEST-001", extra)]),
            ),
          },
        ),
      );
      expect(value.exitCode).toBe(1);
      expect(JSON.parse(output).failures[0]).toContain("failed to start");
    });
  });

  test("converts a junit native report through the command path", async () => {
    await withTempWorkspace(async (dir) => {
      const report = path.join(dir, "junit.xml");
      const xml = `<testsuite><testcase name="acceptsValidPassword" classname="LoginTest" time="0.01"/></testsuite>\n`;
      writeIntegrations(dir, [
        {
          id: "unit",
          producer: "junit",
          command: [
            "node",
            "-e",
            `require("fs").writeFileSync(${JSON.stringify(report)}, ${JSON.stringify(xml)})`,
          ],
          artifact: report,
          description: "JUnit",
        },
      ]);
      const junitContract = {
        ...contract,
        integration: "unit",
      };
      const extra = `,proof_contract=${JSON.stringify(JSON.stringify(junitContract))},proof_bindings=${JSON.stringify(
        JSON.stringify([
          {
            symbol_id: "SYM-CASE-1",
            target: "default",
            native_id: "LoginTest::acceptsValidPassword",
          },
        ]),
      )}`;
      const { value, output } = await captureStdout(() =>
        proveCommand(
          { all: true, workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async () =>
              resultsFor([entityRow("TEST-001", extra)]),
            ),
            ingestProof: async () => ingestResult({ integration: "unit" }),
          },
        ),
      );
      expect(value.exitCode).toBe(0);
      expect(JSON.parse(output).proved).toBe(1);
    });
  });
});
