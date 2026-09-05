// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as childProcess from "node:child_process";
import {
  parseIntegrationSelector,
  proveCommand,
} from "../../src/commands/prove.js";
import type { IngestProofResult } from "../../src/operations/proof/ingest-proof.js";
import * as discovery from "../../src/public/operations/discovery-entities.js";
import type {
  OperationContext,
  OperationRuntime,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  PROOF_INTEGRATION_VERSION,
  PROOF_RUN_VERSION,
} from "../../src/public/proof-protocol.js";
import * as integrationsMod from "../../src/proof/integrations.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const SNAPSHOT = "a".repeat(64);
const OTHER_SNAPSHOT = "b".repeat(64);

const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
  success_policy: "all_required_first_attempt",
} as const;

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
  process.exitCode = 0;
});

function preparedWorkspace(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  mkdirSync(path.join(cwd, ".kb", "proof"), { recursive: true });
  return cwd;
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

function testProps(extra: string, title = "Contracted flow"): string {
  return `title="${title}",status=active,source="tests/flow.spec.ts",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,verification_perspective=consumer${extra}`;
}

function entityRow(id: string, extra: string, title?: string): string {
  return `[${id},test,[${testProps(extra, title)}]]`;
}

function resultsFor(rows: string[]): PrologQueryResult {
  return {
    success: true,
    bindings: { Results: `[${rows.join(",")}]` },
  };
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
  snapshots: Array<{ hash: string } | Error> = [{ hash: SNAPSHOT }],
): OperationRuntime {
  let snapshotIndex = 0;
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
      workspaceSnapshot: async () => {
        const next = snapshots[Math.min(snapshotIndex, snapshots.length - 1)];
        snapshotIndex += 1;
        if (next instanceof Error) throw next;
        return {
          version: "kibi.workspace-snapshot.v2",
          hash: next.hash,
          dirty: false,
          fileCount: 1,
        };
      },
    },
  };
  return {
    open: async () => context,
    afterSuccess: async () => undefined,
    close: async () => undefined,
  };
}

function captureStdout(): { output: () => string; restore: () => void } {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  }) as typeof process.stdout.write;
  return {
    output: () => chunks.join(""),
    restore: () => {
      process.stdout.write = original;
    },
  };
}

const passingCommand = ["node", "-e", "process.exit(0)"];
const extraContract = `,proof_contract=${JSON.stringify(JSON.stringify(contract))}`;

function validArtifact(overrides: Record<string, unknown> = {}) {
  return {
    version: PROOF_RUN_VERSION,
    producer: { name: "kibi-playwright-adapter" },
    integration: "self-proof",
    command_argv: passingCommand,
    code_snapshot: SNAPSHOT,
    environment: { os: "linux", arch: "x64", runtime: { name: "node", version: "1" } },
    run: {
      outcome: "passed",
      exit_code: 0,
      started_at: "2026-08-13T00:00:00Z",
      finished_at: "2026-08-13T00:00:01Z",
    },
    proof_results: [
      {
        symbol_id: "SYM-CASE-1",
        target: "default",
        outcome: "passed",
        binding: "native_case",
        attempts: { status: "unavailable" },
      },
    ],
    ...overrides,
  };
}

describe("proveCommand remaining runtime branches", () => {
  test("parseIntegrationSelector rejects a blank list item", () => {
    expect(() =>
      parseIntegrationSelector("web-e2e,,api", "--integration"),
    ).toThrow("empty integration id");
  });

  test("fails when a loaded test entity is missing an id", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const load = spyOn(discovery, "loadEntities").mockResolvedValue([
      { title: "nameless", proof_contract: contract },
    ]);
    restores.push(() => load.mockRestore());
    await expect(
      proveCommand(
        { all: true, workspaceRoot: cwd },
        { runtime: fakeRuntime(cwd, async () => resultsFor([])) },
      ),
    ).rejects.toThrow("missing an id");
  });

  test("selects requirement-linked tests from mixed Prolog row shapes", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { requirement: "REQ-001", workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async (goal) => {
          if (goal.includes("specified_by")) {
            return { success: false, bindings: {} };
          }
          if (goal.includes("validates") && goal.includes("findall(T")) {
            return {
              success: true,
              bindings: { Rows: "['TEST-001', NOTE-1, [TEST-002]]" },
            };
          }
          return resultsFor([
            entityRow("TEST-001", extraContract),
            entityRow("TEST-002", extraContract, "Second"),
          ]);
        }),
        ingestProof: async () => ingestResult(),
      },
    );
    expect(result.exitCode).toBe(0);
  });

  test("filters with both include and exclude selectors", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const web = {
      ...contract,
      integration: "web-e2e",
    };
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      {
        all: true,
        integration: "self-proof,web-e2e",
        integrationExcept: "web-e2e",
        workspaceRoot: cwd,
      },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([
            entityRow("TEST-001", extraContract),
            entityRow(
              "TEST-002",
              `,proof_contract=${JSON.stringify(JSON.stringify(web))}`,
              "Web",
            ),
          ]),
        ),
        ingestProof: async () => ingestResult(),
      },
    );
    expect(result.exitCode).toBe(0);
  });

  test("rejects invalid proof_bindings and skips non-array bindings", async () => {
    const cwd = preparedWorkspace();
    const report = path.join(cwd, "junit.xml");
    writeIntegrations(cwd, [
      {
        id: "unit",
        producer: "junit",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync(${JSON.stringify(report)}, "<testsuite></testsuite>")`,
        ],
        artifact: report,
        description: "JUnit",
      },
    ]);
    const junitContract = { ...contract, integration: "unit" };
    const bad = `,proof_contract=${JSON.stringify(JSON.stringify(junitContract))},proof_bindings=${JSON.stringify(
      JSON.stringify([{ symbol_id: "", target: "" }]),
    )}`;
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", bad)]),
        ),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("invalid proof_bindings");
  });

  test("fails when the workspace snapshot is unavailable", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const runtime = fakeRuntime(cwd, async () =>
      resultsFor([entityRow("TEST-001", extraContract)]),
    );
    const context = await runtime.open({} as never, {});
    delete (context as { git?: unknown }).git;
    await expect(
      proveCommand(
        { all: true, workspaceRoot: cwd },
        { runtime },
      ),
    ).rejects.toThrow("does not expose workspace snapshots");
  });

  test("records a workspace change during proof execution", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(
          cwd,
          async () => resultsFor([entityRow("TEST-001", extraContract)]),
          [{ hash: SNAPSHOT }, { hash: OTHER_SNAPSHOT }],
        ),
        ingestProof: async () => ingestResult(),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("changed the tracked workspace");
  });

  test("records a workspace change while receipts are applied", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(
          cwd,
          async () => resultsFor([entityRow("TEST-001", extraContract)]),
          [{ hash: SNAPSHOT }, { hash: SNAPSHOT }, { hash: OTHER_SNAPSHOT }],
        ),
        ingestProof: async () => ingestResult(),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("receipts were applied");
  });

  test("converts TAP reports including unbound diagnostics", async () => {
    const cwd = preparedWorkspace();
    const report = path.join(cwd, "results.tap");
    const tap = "ok 1 LoginTest::acceptsValidPassword\nok 2 unbound case\n";
    writeIntegrations(cwd, [
      {
        id: "unit",
        producer: "tap",
        producer_version: "2.0.0",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync(${JSON.stringify(report)}, ${JSON.stringify(tap)})`,
        ],
        artifact: report,
        description: "TAP",
      },
    ]);
    const tapContract = { ...contract, integration: "unit" };
    const extra = `,proof_contract=${JSON.stringify(JSON.stringify(tapContract))},proof_bindings=${JSON.stringify(
      JSON.stringify([
        {
          symbol_id: "SYM-CASE-1",
          target: "default",
          native_id: "LoginTest::acceptsValidPassword",
          aliases: ["acceptsValidPassword"],
        },
      ]),
    )}`;
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extra)]),
        ),
        ingestProof: async () => ingestResult({ integration: "unit" }),
      },
    );
    expect(result.exitCode).toBe(0);
  });

  test("fails when a native producer does not write its report", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "unit",
        producer: "junit",
        command: passingCommand,
        artifact: path.join(cwd, "missing.xml"),
        description: "JUnit",
      },
    ]);
    const junitContract = { ...contract, integration: "unit" };
    const extra = `,proof_contract=${JSON.stringify(JSON.stringify(junitContract))},proof_bindings=${JSON.stringify(
      JSON.stringify([
        {
          symbol_id: "SYM-CASE-1",
          target: "default",
          native_id: "LoginTest::acceptsValidPassword",
        },
      ]),
    )}`;
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extra)]),
        ),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("did not produce its native report");
  });

  test("fails when a native producer yields no bound results", async () => {
    const cwd = preparedWorkspace();
    const report = path.join(cwd, "empty.xml");
    writeIntegrations(cwd, [
      {
        id: "unit",
        producer: "junit",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync(${JSON.stringify(report)}, "<testsuite></testsuite>")`,
        ],
        artifact: report,
        description: "JUnit",
      },
    ]);
    const junitContract = { ...contract, integration: "unit" };
    const extra = `,proof_contract=${JSON.stringify(JSON.stringify(junitContract))},proof_bindings=${JSON.stringify(
      JSON.stringify([
        {
          symbol_id: "SYM-CASE-1",
          target: "default",
          native_id: "LoginTest::acceptsValidPassword",
        },
      ]),
    )}`;
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extra)]),
        ),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("produced no bound proof results");
  });

  test("reads a self-emitted playwright artifact and rejects a passed outcome on a failed process", async () => {
    const cwd = preparedWorkspace();
    const artifact = validArtifact();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "playwright",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync(process.env.KIBI_PROOF_OUTPUT, ${JSON.stringify(JSON.stringify(artifact))}); process.exit(1)`,
        ],
        description: "Playwright",
      },
    ]);
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const failed = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extraContract)]),
        ),
      },
    );
    expect(failed.exitCode).toBe(1);
    expect(stdout.output()).toContain("reported run.outcome 'passed'");
  });

  test("fails when a self-emitting producer writes unreadable JSON", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "playwright",
        command: passingCommand,
        description: "Playwright",
      },
    ]);
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extraContract)]),
        ),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("did not emit a readable");
  });

  test("ingests a valid self-emitted artifact from process.cwd", async () => {
    const cwd = preparedWorkspace();
    const artifact = validArtifact();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "playwright",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync(process.env.KIBI_PROOF_OUTPUT, ${JSON.stringify(JSON.stringify(artifact))})`,
        ],
        description: "Playwright",
      },
    ]);
    const create = spyOn(cliRuntime, "createCliRuntime").mockReturnValue(
      fakeRuntime(cwd, async () =>
        resultsFor([entityRow("TEST-001", extraContract)]),
      ),
    );
    restores.push(() => create.mockRestore());
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      proveCommand(
        { all: true },
        { ingestProof: async () => ingestResult() },
      ),
    );
    expect(result.exitCode).toBe(0);
  });

  test("rejects an empty integration command argv", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const resolve = spyOn(integrationsMod, "resolveIntegration").mockReturnValue(
      {
        id: "self-proof",
        producer: "command",
        command: [],
        description: "Self proof",
      },
    );
    restores.push(() => resolve.mockRestore());
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extraContract)]),
        ),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("command argv must be non-empty");
  });

  test("treats a null child exit code as failure", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const spawn = spyOn(childProcess, "spawn").mockImplementation((() => {
      const child = new EventEmitter() as EventEmitter & {
        stdin: null;
        stdout: null;
        stderr: null;
      };
      child.stdin = null;
      child.stdout = null;
      child.stderr = null;
      queueMicrotask(() => child.emit("close", null));
      return child;
    }) as typeof childProcess.spawn);
    restores.push(() => spawn.mockRestore());
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([
            entityRow("TEST-001", extraContract),
            entityRow("TEST-002", extraContract, "Duplicate obligation"),
          ]),
        ),
        ingestProof: async () => ingestResult({ passed: 0, failed: 1 }),
      },
    );
    expect(result.exitCode).toBe(1);
  });

  test("records an invalid self-emitted artifact after a readable JSON parse", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "playwright",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync(process.env.KIBI_PROOF_OUTPUT, JSON.stringify({ version: "nope" }))`,
        ],
        description: "Playwright",
      },
    ]);
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extraContract)]),
        ),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("invalid kibi.proof-run.v1");
  });

  test("treats a junit producer without an artifact path as a configuration error", async () => {
    const cwd = preparedWorkspace();
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "command",
        command: passingCommand,
        description: "Self proof",
      },
    ]);
    const resolve = spyOn(integrationsMod, "resolveIntegration").mockReturnValue(
      {
        id: "self-proof",
        producer: "junit",
        command: passingCommand,
        description: "JUnit",
      },
    );
    restores.push(() => resolve.mockRestore());
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extraContract)]),
        ),
      },
    );
    expect(result.exitCode).toBe(1);
    expect(stdout.output()).toContain("requires an artifact path");
  });

  test("converts a failed TAP report from a relative artifact path", async () => {
    const cwd = preparedWorkspace();
    const tap = "not ok 1 LoginTest::acceptsValidPassword\nok 2 unbound case\n";
    writeIntegrations(cwd, [
      {
        id: "unit",
        producer: "tap",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync("results.tap", ${JSON.stringify(tap)})`,
        ],
        artifact: "results.tap",
        description: "TAP",
      },
    ]);
    const tapContract = { ...contract, integration: "unit" };
    const extra = `,proof_contract=${JSON.stringify(JSON.stringify(tapContract))},proof_bindings=${JSON.stringify(
      JSON.stringify([
        {
          symbol_id: "SYM-CASE-1",
          target: "default",
          native_id: "LoginTest::acceptsValidPassword",
          aliases: ["acceptsValidPassword"],
        },
      ]),
    )}`;
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await withCwd(cwd, () =>
      proveCommand(
        { all: true, workspaceRoot: cwd },
        {
          runtime: fakeRuntime(cwd, async () =>
            resultsFor([entityRow("TEST-001", extra)]),
          ),
          ingestProof: async () =>
            ingestResult({ integration: "unit", passed: 0, failed: 1 }),
        },
      ),
    );
    expect(result.exitCode).toBe(1);
  });

  test("accepts a self-emitted failed outcome when the process also fails", async () => {
    const cwd = preparedWorkspace();
    const artifact = validArtifact({
      run: {
        outcome: "failed",
        exit_code: 1,
        started_at: "2026-08-13T00:00:00Z",
        finished_at: "2026-08-13T00:00:01Z",
      },
      proof_results: [
        {
          symbol_id: "SYM-CASE-1",
          target: "default",
          outcome: "failed",
          binding: "native_case",
          attempts: { status: "unavailable" },
        },
      ],
    });
    writeIntegrations(cwd, [
      {
        id: "self-proof",
        producer: "playwright",
        command: [
          "node",
          "-e",
          `require("fs").writeFileSync(process.env.KIBI_PROOF_OUTPUT, ${JSON.stringify(JSON.stringify(artifact))}); process.exit(1)`,
        ],
        description: "Playwright",
      },
    ]);
    const stdout = captureStdout();
    restores.push(stdout.restore);
    const result = await proveCommand(
      { all: true, workspaceRoot: cwd },
      {
        runtime: fakeRuntime(cwd, async () =>
          resultsFor([entityRow("TEST-001", extraContract)]),
        ),
        ingestProof: async () => ingestResult({ passed: 0, failed: 1 }),
      },
    );
    expect(result.exitCode).toBe(1);
  });
});
