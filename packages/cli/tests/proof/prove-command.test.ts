import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
      expect(JSON.parse(output).failed).toBe(1);
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
      const { value } = await captureStdout(() =>
        proveCommand(
          { requirement: "REQ-001", workspaceRoot: dir },
          {
            runtime: fakeRuntime(dir, async (goal) => {
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
