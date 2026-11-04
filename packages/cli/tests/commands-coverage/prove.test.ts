import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  PROVE_PROGRESS_FILE,
  attachCertificates,
  proveCommand,
  readCertificateDir,
  readCommandAttribution,
  readProveProgress,
  runChild,
} from "../../src/commands/prove.js";
import type { IngestProofResult } from "../../src/operations/proof/ingest-proof.js";
import * as prologJson from "../../src/public/operations/prolog-json.js";
import type {
  OperationContext,
  OperationRuntime,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import * as reporting from "../../src/public/operations/specs/reporting.js";
import { PROOF_INTEGRATION_VERSION } from "../../src/public/proof-protocol.js";
import {
  createGitWorkspace,
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const SNAPSHOT = "a".repeat(64);
const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  mock.restore();
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
  process.exitCode = 0;
});

const contract = (integration: string) => ({
  version: "kibi.proof-contract.v1",
  integration,
  required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
  success_policy: "all_required_first_attempt",
});

function workspace(integrations: Array<Record<string, unknown>>): string {
  restores.push(isolateKibiEnv());
  const root = createGitWorkspace();
  roots.push(root);
  mkdirSync(path.join(root, ".kb", "proof"), { recursive: true });
  writeFileSync(
    path.join(root, ".kb", "proof", "integrations.json"),
    `${JSON.stringify({ version: PROOF_INTEGRATION_VERSION, integrations })}\n`,
  );
  return root;
}

function testRow(
  id: string,
  integration: string,
  bindings?: unknown[],
): string {
  const extra = `,proof_contract=${JSON.stringify(JSON.stringify(contract(integration)))}${
    bindings === undefined
      ? ""
      : `,proof_bindings=${JSON.stringify(JSON.stringify(bindings))}`
  }`;
  return `[${id},test,[title="Flow",status=active,source="tests/flow.spec.ts",created_at="2026-08-13T00:00:00Z",updated_at="2026-08-13T00:00:00Z",verification_scope=end_to_end,verification_perspective=consumer${extra}]]`;
}

function runtimeFor(
  root: string,
  rows: string[],
  snapshotAvailable = true,
): OperationRuntime {
  const context: OperationContext = {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query: async (): Promise<PrologQueryResult> => ({
        success: true,
        bindings: { Results: `[${rows.join(",")}]` },
      }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      workspaceSnapshot: async () => {
        if (!snapshotAvailable) throw new Error("git unavailable");
        return {
          version: "kibi.workspace-snapshot.v2",
          hash: SNAPSHOT,
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
  } as never;
}

function ingested(
  integration: string,
  overrides: Partial<IngestProofResult> = {},
) {
  return async () => ({
    content: [{ type: "text" as const, text: "ok" }],
    structuredContent: {
      artifactDigest: "b".repeat(64),
      environmentHash: "c".repeat(64),
      integration,
      passed: 1,
      failed: 0,
      unchanged: 0,
      results: [],
      ...overrides,
    } as IngestProofResult,
  });
}

function captureStreams(): { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });
  spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  });
  return { stdout, stderr };
}

const writeTap = (file: string, tap: string) => [
  "node",
  "-e",
  `require("fs").writeFileSync(${JSON.stringify(file)}, ${JSON.stringify(tap)})`,
];

const tapBindings = [
  {
    symbol_id: "SYM-CASE-1",
    target: "default",
    native_id: "LoginTest::accepts",
  },
];

describe("runChild signal forwarding", () => {
  test("stops the producer's process group and exits with the signal status", async () => {
    const exits: unknown[] = [];
    spyOn(process, "exit").mockImplementation(((code: number) => {
      exits.push(code);
    }) as never);
    const running = runChild(["sleep", "10"], process.cwd(), process.env);
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.emit("SIGHUP" as never);
    expect(await running).toBe(1);
    expect(exits).toStrictEqual([143]);
  });

  test("still exits when the producer is already gone", async () => {
    const exits: unknown[] = [];
    spyOn(process, "exit").mockImplementation(((code: number) => {
      exits.push(code);
    }) as never);
    spyOn(process, "kill").mockImplementation(() => {
      throw new Error("ESRCH");
    });
    const running = runChild(["sleep", "0.2"], process.cwd(), process.env);
    await new Promise((resolve) => setTimeout(resolve, 50));
    process.emit("SIGINT" as never);
    expect(await running).toBe(0);
    expect(exits).toStrictEqual([130]);
  });
});

test("runChild kills the child itself where process groups are unavailable", async () => {
  const platform = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value: "win32" });
  restores.push(() => {
    if (platform) Object.defineProperty(process, "platform", platform);
  });
  const exits: unknown[] = [];
  spyOn(process, "exit").mockImplementation(((code: number) => {
    exits.push(code);
  }) as never);
  const running = runChild(["sleep", "10"], process.cwd(), process.env);
  await new Promise((resolve) => setTimeout(resolve, 100));
  process.emit("SIGTERM" as never);
  expect(await running).toBe(1);
  expect(exits).toStrictEqual([143]);
});

describe("proof run files", () => {
  test("readCertificateDir treats a missing directory as no certificates", async () => {
    expect(
      await readCertificateDir("/nonexistent/kibi/certificates"),
    ).toStrictEqual([]);
  });

  test("readProveProgress treats a missing file as no progress", async () => {
    const dir = createTempDir("kibi-prove-progress-");
    roots.push(dir);
    expect(await readProveProgress(dir)).toBeNull();
  });

  test("readCertificateDir rejects unreadable and non-object certificates", async () => {
    const dir = createTempDir("kibi-prove-certs-");
    roots.push(dir);
    writeFileSync(path.join(dir, "a.json"), "{broken");
    await expect(readCertificateDir(dir)).rejects.toThrow(
      "certificate a.json is not valid JSON",
    );
    writeFileSync(path.join(dir, "a.json"), "[1]");
    await expect(readCertificateDir(dir)).rejects.toThrow(
      "certificate a.json is not a JSON object",
    );
    writeFileSync(path.join(dir, "a.json"), '{"test_id":"T1"}');
    writeFileSync(path.join(dir, "ignored.txt"), "x");
    expect(await readCertificateDir(dir)).toStrictEqual([{ test_id: "T1" }]);
  });

  test("readCommandAttribution evaluates an invalid report as one unit", async () => {
    const dir = createTempDir("kibi-prove-report-");
    roots.push(dir);
    const report = path.join(dir, "report.json");
    writeFileSync(report, "{nope");
    const attribution = await readCommandAttribution(report, ["T1"], 1);
    expect(attribution.attribution).toBe("aggregate");
    expect(attribution.failedSteps).toStrictEqual([]);
    expect((attribution as { reason: string }).reason).toMatch(
      /is not valid JSON \(.+\), so the run is evaluated as one unit$/,
    );
  });
});

describe("attachCertificates", () => {
  const artifact = (name: string) => ({ name }) as never;

  test("refuses two certificates for one test", () => {
    expect(() =>
      attachCertificates({ artifacts: [] }, [
        { test_id: "T1" },
        { test_id: "T1" },
      ]),
    ).toThrow("the run left more than one certificate for T1");
  });

  test("gives each partition and the whole run only their own certificates", () => {
    const result = attachCertificates(
      {
        artifacts: [
          { artifact: artifact("one"), testIds: ["T1"] },
          { artifact: artifact("two"), testIds: ["T2"] },
        ],
        wholeRun: {
          name: "whole",
          certificates: [{ test_id: "OLD" }],
        } as never,
      },
      [{ test_id: "T1" }, {}],
    );
    expect(result).toStrictEqual({
      artifacts: [
        {
          artifact: { name: "one", certificates: [{ test_id: "T1" }] },
          testIds: ["T1"],
        },
        { artifact: { name: "two" }, testIds: ["T2"] },
      ],
      wholeRun: {
        name: "whole",
        certificates: [{ test_id: "OLD" }, { test_id: "T1" }],
      },
    } as never);
  });

  test("keeps the run as it is without a whole-run artifact", () => {
    const result = attachCertificates(
      { artifacts: [{ artifact: artifact("one"), testIds: ["T1"] }] },
      [{ test_id: "T9" }],
    );
    expect(result).toStrictEqual({
      artifacts: [{ artifact: { name: "one" }, testIds: ["T1"] }],
    } as never);
  });
});

describe("proveCommand selection and reporting", () => {
  test("--stale skips tests with a current passing receipt", async () => {
    const root = workspace([
      {
        id: "unit",
        producer: "tap",
        command: writeTap("results.tap", "1..1\nok 1 LoginTest::accepts\n"),
        artifact: "results.tap",
        description: "TAP",
      },
    ]);
    spyOn(reporting, "perContractTestBindings").mockResolvedValue(null);
    const real = prologJson.runOperationJsonQuery;
    const goals: string[] = [];
    spyOn(prologJson, "runOperationJsonQuery").mockImplementation((async (
      ...args: Parameters<typeof real>
    ) => {
      if (args[3] !== "prove --stale") return real(...args);
      goals.push(args[2]);
      return { states: { "TEST-001": "passed" } };
    }) as never);
    const io = captureStreams();
    const result = await proveCommand(
      { all: true, stale: true, workspaceRoot: root },
      { runtime: runtimeFor(root, [testRow("TEST-001", "unit")]) },
    );
    mock.restore();
    expect(result).toStrictEqual({ exitCode: 0 });
    expect(goals[0]).toStartWith(
      `discovery:test_receipt_states_json(per_contract, _{}, '${SNAPSHOT}', '2026-08-13T00:00:00.000Z', `,
    );
    expect(JSON.parse(io.stdout.join(""))).toStrictEqual({
      passed: 0,
      certified: 0,
      failed: 0,
      message: "every selected test already has a current passing receipt",
    });
  });

  test("--stale names an unknown snapshot and per-contract bindings", async () => {
    const root = workspace([
      {
        id: "unit",
        producer: "tap",
        command: writeTap("results.tap", "1..1\nok 1 LoginTest::accepts\n"),
        artifact: "results.tap",
        description: "TAP",
      },
    ]);
    spyOn(reporting, "perContractTestBindings").mockResolvedValue(
      "_{'TEST-001':h}",
    );
    const real = prologJson.runOperationJsonQuery;
    const goals: string[] = [];
    spyOn(prologJson, "runOperationJsonQuery").mockImplementation((async (
      ...args: Parameters<typeof real>
    ) => {
      if (args[3] !== "prove --stale") return real(...args);
      goals.push(args[2]);
      return {};
    }) as never);
    captureStreams();
    await proveCommand(
      { all: true, stale: true, workspaceRoot: root },
      { runtime: runtimeFor(root, [testRow("TEST-001", "unit")], false) },
    ).catch(() => undefined);
    mock.restore();
    expect(goals[0]).toStartWith(
      "discovery:test_receipt_states_json(per_contract, _{'TEST-001':h}, 'unknown', ",
    );
  });

  test("--resume after a workspace change runs every integration again", async () => {
    const root = workspace([
      {
        id: "unit",
        producer: "tap",
        command: writeTap("results.tap", "1..1\nok 1 LoginTest::accepts\n"),
        artifact: "results.tap",
        description: "TAP",
      },
    ]);
    const runs = path.join(root, ".kb", "proof", "runs");
    mkdirSync(runs, { recursive: true });
    writeFileSync(
      path.join(runs, PROVE_PROGRESS_FILE),
      JSON.stringify({
        version: "kibi.prove-progress.v1",
        snapshot: "f".repeat(64),
        ingested: { unit: ["TEST-001"] },
      }),
    );
    const io = captureStreams();
    await withCwd(root, () =>
      proveCommand(
        { all: true, resume: true, workspaceRoot: root },
        {
          runtime: runtimeFor(root, [testRow("TEST-001", "unit", tapBindings)]),
          ingestProof: ingested("unit", {
            results: [
              {
                testId: "TEST-001",
                outcome: "passed",
                scope: "unit",
                claimBindings: [
                  {
                    claim_key: "CLAIM-1",
                    requirement_id: "REQ-1",
                    binding: "derived",
                    scope: "full",
                  },
                ],
              },
            ] as never,
          }),
        },
      ),
    );
    mock.restore();
    const stderr = io.stderr.join("");
    expect(stderr).toContain(
      "prove: the workspace changed since the interrupted run; running every selected integration\n",
    );
    expect(stderr).toContain(
      "prove: TEST-001 CLAIM-1 (REQ-1): derived, full scope; the receipt's verification_scope is unit",
    );
  });

  test("says why a playwright integration runs whole for a narrowed selection", async () => {
    const root = workspace([
      {
        id: "web",
        producer: "playwright",
        command: ["node", "-e", "process.exit(0)"],
        description: "Playwright",
      },
    ]);
    const io = captureStreams();
    await proveCommand(
      { testId: "TEST-001", workspaceRoot: root },
      { runtime: runtimeFor(root, [testRow("TEST-001", "web")]) },
    );
    mock.restore();
    expect(io.stderr.join("")).toContain(
      "prove: running the whole 'web' integration: the command is not a direct `playwright test` invocation; narrow it from KIBI_PROOF_SOURCE_FILES\n",
    );
  });

  test("fails an integration whose certificates cannot be read", async () => {
    const root = workspace([
      {
        id: "unit",
        producer: "tap",
        command: [
          "node",
          "-e",
          `const fs=require("fs");fs.writeFileSync("results.tap","1..1\\nok 1 LoginTest::accepts\\n");fs.writeFileSync(require("path").join(process.env.KIBI_PROOF_CERTIFICATES, "bad.json"),"{")`,
        ],
        artifact: "results.tap",
        description: "TAP",
      },
    ]);
    const io = captureStreams();
    const result = await withCwd(root, () =>
      proveCommand(
        { all: true, workspaceRoot: root },
        {
          runtime: runtimeFor(root, [testRow("TEST-001", "unit", tapBindings)]),
          ingestProof: ingested("unit"),
        },
      ),
    );
    mock.restore();
    expect(result).toStrictEqual({ exitCode: 1 });
    expect(io.stdout.join("")).toContain(
      "integration 'unit': certificate bad.json is not valid JSON",
    );
  });

  test("records a failed TAP case as a failed run", async () => {
    const root = workspace([
      {
        id: "unit",
        producer: "tap",
        command: writeTap("results.tap", "1..1\nnot ok 1 LoginTest::accepts\n"),
        artifact: "results.tap",
        description: "TAP",
      },
    ]);
    const artifacts: unknown[] = [];
    captureStreams();
    await withCwd(root, () =>
      proveCommand(
        { all: true, workspaceRoot: root },
        {
          runtime: runtimeFor(root, [testRow("TEST-001", "unit", tapBindings)]),
          ingestProof: async (input) => {
            artifacts.push(input);
            return ingested("unit", { passed: 0, failed: 1 })();
          },
        },
      ),
    );
    mock.restore();
    expect(JSON.stringify(artifacts)).toContain('"outcome":"failed"');
  });
});
