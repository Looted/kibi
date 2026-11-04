import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { MutationRollbackFailureError } from "../../../src/operations/mutation/saga.js";
import * as upsertModule from "../../../src/operations/mutation/upsert.js";
import * as lockModule from "../../../src/operations/mutation/workspace-mutation-lock.js";
import * as claimsModule from "../../../src/operations/proof/claim-bindings.js";
import * as certificatesModule from "../../../src/operations/proof/code-certificates.js";
import * as scopeModule from "../../../src/operations/proof/code-scope.js";
import { executeIngestProof } from "../../../src/operations/proof/ingest-proof.js";
import * as compaction from "../../../src/operations/proof/receipt-compaction.js";
import {
  loadProofIntegrations,
  resolveIntegration,
  toExecution,
} from "../../../src/proof/integrations.js";
import * as entitiesModule from "../../../src/public/operations/discovery-entities.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import {
  environmentHash,
  effectiveProofFingerprint,
  jsonDigest,
  proofContractHash,
} from "../../../src/public/proof-fingerprint.js";
import {
  type ProofBinding,
  type ProofContract,
  proofRunArtifactErrors,
} from "../../../src/public/proof-protocol.js";
import type { ClaimBinding } from "../../../src/public/proof-receipt.js";
import * as receiptModule from "../../../src/public/proof-receipt.js";
import { scratch } from "../../operations-coverage/helpers.js";

type Row = Record<string, unknown>;

const SNAPSHOT = "a".repeat(64);
const COMMAND = ["node", "run.mjs"];
const CONTRACT = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-1", target: "default" }],
  success_policy: "all_required_first_attempt",
};
const AUTHORED = [
  "---",
  "id: TEST-1",
  "title: Contracted",
  "proof_receipts: []",
  "---",
  "Body.",
  "",
].join("\n");

function artifact(fields: Row = {}): Row {
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-command-producer" },
    integration: "self-proof",
    command_argv: COMMAND,
    code_snapshot: SNAPSHOT,
    environment: { os: "linux", arch: "x86_64", runtime: { name: "node", version: "v24.0.0" } },
    run: {
      outcome: "passed",
      exit_code: 0,
      started_at: "2026-08-13T00:00:00Z",
      finished_at: "2026-08-13T00:00:01Z",
    },
    proof_results: [
      {
        symbol_id: "SYM-1",
        target: "default",
        outcome: "passed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
    ...fields,
  };
}

const failing = () =>
  artifact({
    run: {
      outcome: "failed",
      exit_code: 1,
      started_at: "2026-08-13T00:00:00Z",
      finished_at: "2026-08-13T00:00:01Z",
    },
    proof_results: [
      {
        symbol_id: "SYM-1",
        target: "default",
        outcome: "failed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
  });

function testEntity(id: string, fields: Row = {}): Row {
  return {
    id,
    type: "test",
    title: "Contracted",
    source: `.kb/tests/${id}.md`,
    verification_scope: "end_to_end",
    proof_contract: CONTRACT,
    proof_receipts: [],
    ...fields,
  };
}

/** Per-test state the seams read and record. */
let tests: Record<string, Row> = {};
let candidates: Row[] | undefined;
let loads: unknown[] = [];
let upserts: { input: Row; options: Row; lockHeld: unknown; lockFile: boolean }[] = [];
let upsertResult: ((id: string) => unknown) | undefined;
let rollbackFailures: Record<string, () => Promise<unknown[]>> = {};
let rollbacks: string[] = [];
let commits: (() => PrologQueryResult)[] = [];
let goals: string[] = [];
let certificateCalls: Row[] = [];
let claimCalls: Row[] = [];
let bindingCalls: Row[] = [];
let verdict: Row | undefined;
let claimBindings: ClaimBinding[] | undefined;
let invalidated = 0;
const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];

let root = "";
const hashOf = (id: string) => jsonDigest({ binding: id });
const lockPath = () => path.join(root, ".kb", "recovery", "source-authoring.lock");

beforeEach(() => {
  const workspace = scratch({
    ".kb/proof/integrations.json": JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [
        { id: "self-proof", producer: "command", command: COMMAND },
        { id: "other", producer: "command", command: ["node", "other.mjs"] },
      ],
    }),
    ".kb/tests/TEST-1.md": AUTHORED,
    ".kb/tests/TEST-1.txt": AUTHORED,
    ".kb/tests/TEST-1.md.bak": AUTHORED,
    ".kb/tests/plain.md": "no frontmatter\n",
  });
  cleanups.push(workspace.cleanup);
  root = workspace.root;
  tests = { "TEST-1": testEntity("TEST-1") };
  candidates = undefined;
  loads = [];
  upserts = [];
  upsertResult = undefined;
  rollbackFailures = {};
  rollbacks = [];
  commits = [];
  goals = [];
  certificateCalls = [];
  claimCalls = [];
  bindingCalls = [];
  verdict = undefined;
  claimBindings = undefined;
  invalidated = 0;
  spies.push(
    spyOn(entitiesModule, "loadEntities").mockImplementation(async (_prolog, input) => {
      loads.push(input);
      if (input.projection !== undefined) return (candidates ?? Object.values(tests)) as never;
      const found = tests[input.id as string];
      return (found === undefined ? [] : [found]) as never;
    }),
    spyOn(scopeModule, "loadCoveredBySymbolsByTest").mockResolvedValue(
      new Map([["TEST-1", ["SYM-c"]]]),
    ),
    spyOn(scopeModule, "currentReceiptBindingHash").mockImplementation(async (input) => {
      bindingCalls.push(input as unknown as Row);
      return hashOf(String(input.test.id));
    }),
    spyOn(certificatesModule, "checkCodeCertificate").mockImplementation(
      async (_context, input) => {
        certificateCalls.push(input as unknown as Row);
        return (verdict ?? { kind: "e2e", evidence_level: "tested" }) as never;
      },
    ),
    spyOn(claimsModule, "judgeClaimBindings").mockImplementation(async (_context, input) => {
      claimCalls.push(input as unknown as Row);
      return claimBindings as never;
    }),
    spyOn(upsertModule, "executeUpsert").mockImplementation(async (input, context, options) => {
      const id = String((input as Row).id);
      upserts.push({
        input: input as Row,
        options: options as Row,
        lockHeld: context.sourceMutationLockHeld,
        lockFile: existsSync(lockPath()),
      });
      if (upsertResult !== undefined) return upsertResult(id) as never;
      const deferred = {
        entity: { id, type: "test", title: "Contracted" },
        relationships: [],
        skipContradictionCheck: false,
        state: "prepared",
        finalize: () => {
          deferred.state = "committed";
        },
        rollback: async () => {
          rollbacks.push(id);
          return (await rollbackFailures[id]?.()) ?? [];
        },
      };
      return { content: [], structuredContent: { deferredCommit: deferred } } as never;
    }),
  );
});

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function context(fields: Row = {}): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query: async (goal: string) => {
        goals.push(goal);
        return commits.shift()?.() ?? { success: true, bindings: { ChangeKind: "updated" } };
      },
      invalidateCache: () => {
        invalidated += 1;
      },
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: SNAPSHOT,
        dirty: false,
        fileCount: 1,
      }),
    },
    fs: nodeFilesystem,
    ...fields,
  } as unknown as OperationContext;
}

function ingest(fields: Row = {}, args: Row = {}, ctx: OperationContext = context()) {
  return executeIngestProof(
    { snapshot: SNAPSHOT, artifact: artifact(fields), testIds: ["TEST-1"], ...args } as never,
    ctx,
  );
}

async function failure(run: () => Promise<unknown>) {
  try {
    await run();
    return "ok";
  } catch (error) {
    return (error as Error).message;
  }
}

/** The receipts the upsert of a test was given. */
const receiptsOf = (index = 0) =>
  (upserts[index]?.input.properties as Row).proof_receipts as (Row & { receipt_id: string })[];

describe("a contracted test", () => {
  test("gets a receipt bound to its code, and reports it", async () => {
    verdict = { kind: "typecheck", evidence_level: "tested", certificate_rejection: "no witness" };
    claimBindings = [{ claim_key: "c", binding: "attested", scope: "code" }];
    const run = artifact({
      certificates: [
        { version: "kibi.certificate.v1", kind: "typecheck", test_id: "TEST-2" },
        { version: "kibi.certificate.v1", kind: "typecheck", test_id: "TEST-1" },
      ],
    });
    const output = await executeIngestProof(
      { snapshot: SNAPSHOT, artifact: run, testIds: ["TEST-1"] },
      context(),
    );
    const receipt = receiptsOf().at(-1) as Row & { receipt_id: string };
    expect(receipt.receipt_id).toBe(
      `PR-${jsonDigest({ artifact_digest: jsonDigest(run), test_id: "TEST-1", fingerprint: receipt.fingerprint }).slice(0, 24)}`,
    );
    expect([receipt.binding_hash, receipt.scope, "gaps" in receipt, receipt.claim_bindings]).toStrictEqual([
      hashOf("TEST-1"),
      "end_to_end",
      false,
      claimBindings,
    ]);
    expect(output).toStrictEqual({
      content: [{ type: "text", text: "Ingested proof evidence. Passed 1 test(s)." }],
      structuredContent: {
        artifactDigest: jsonDigest(run),
        environmentHash: environmentHash(run.environment as never),
        integration: "self-proof",
        passed: 1,
        failed: 0,
        unchanged: 0,
        results: [
          {
            testId: "TEST-1",
            outcome: "passed",
            receiptId: receipt.receipt_id,
            applied: true,
            duplicate: false,
            receiptCount: 1,
            compacted: 0,
            gaps: [],
            claimBindings,
            kind: "typecheck",
            evidenceLevel: "tested",
            certificateRejection: "no witness",
            scope: "end_to_end",
          },
        ],
      },
    });
    expect(loads).toStrictEqual([{ id: "TEST-1", type: "test" }]);
    expect(certificateCalls[0]?.certificate).toStrictEqual(
      (run.certificates as Row[])[1],
    );
    expect(claimCalls[0]?.coveredBySymbols).toStrictEqual(["SYM-c"]);
    const binding = bindingCalls[0] as Row & { readFile: (file: string) => Promise<string> };
    expect([binding.workspaceRoot, binding.coveredBySymbols, binding.test]).toStrictEqual([
      root,
      ["SYM-c"],
      tests["TEST-1"],
    ]);
    expect(await binding.readFile(path.join(root, ".kb/tests/TEST-1.md"))).toBe(AUTHORED);
    expect(upserts[0]?.options.sourceDocumentOverride).toContain("receipt_id:");
    expect([upserts[0]?.options.deferCompiledCommit, upserts[0]?.options.allowReceiptsPrune]).toStrictEqual([true, true]);
    expect([upserts[0]?.lockHeld, upserts[0]?.lockFile, existsSync(lockPath())]).toStrictEqual([
      true,
      true,
      false,
    ]);
    expect(goals).toHaveLength(1);
    expect(invalidated).toBe(1);
  });

  test("a test without coverage links reads none", async () => {
    tests = { "TEST-2": testEntity("TEST-2") };
    await ingest({}, { testIds: ["TEST-2"] });
    expect([bindingCalls[0]?.coveredBySymbols, claimCalls[0]?.coveredBySymbols]).toStrictEqual([[], []]);
    expect(certificateCalls[0]?.certificate).toBeUndefined();
  });

  test("leaves out what the receipt does not carry", async () => {
    tests = { "TEST-1": testEntity("TEST-1", { verification_scope: "unit", source: 5 }) };
    await ingest({}, {}, context({ fs: undefined }));
    const receipt = receiptsOf().at(-1) as Row & { receipt_id: string };
    expect(["binding_hash" in receipt, "claim_bindings" in receipt, receipt.scope]).toStrictEqual([
      false,
      false,
      "unit",
    ]);
    expect(bindingCalls).toStrictEqual([]);
    expect([upserts[0]?.lockHeld, upserts[0]?.lockFile]).toStrictEqual([undefined, false]);
    expect("sourceDocumentOverride" in (upserts[0]?.options ?? {})).toBe(false);
    // A duplicate is reported without checking its receipt again.
    verdict = {};
    tests = {
      "TEST-1": testEntity("TEST-1", { verification_scope: "unit", proof_receipts: [receipt] }),
    };
    const output = await ingest({}, {}, context({ fs: undefined }));
    expect(output.structuredContent.results).toStrictEqual([
      {
        testId: "TEST-1",
        outcome: "passed",
        receiptId: receipt.receipt_id,
        applied: false,
        duplicate: true,
        receiptCount: 1,
        compacted: 0,
        gaps: [],
        scope: "unit",
      },
    ]);
  });

  test("a failed run records its gaps", async () => {
    const output = await executeIngestProof(
      { snapshot: SNAPSHOT, artifact: failing(), testIds: ["TEST-1"] },
      context(),
    );
    const receipt = receiptsOf().at(-1) as Row & { receipt_id: string };
    expect(receipt.gaps).toStrictEqual(output.structuredContent.results[0]?.gaps);
    expect((receipt.gaps as unknown[]).length).toBeGreaterThan(0);
    expect(output.content[0]?.text).toBe("Ingested proof evidence. No passing proof: 1 failed, 0 unchanged.");
  });
});

describe("authored documents", () => {
  const overrideFor = async (source: unknown, ctx = context()) => {
    tests = { "TEST-1": testEntity("TEST-1", { source }) };
    await ingest({}, {}, ctx);
    return upserts.at(-1)?.options.sourceDocumentOverride;
  };

  test("patches only a readable markdown document with frontmatter", async () => {
    expect(await overrideFor(".kb/tests/TEST-1.md")).toContain("receipt_id:");
    expect(await overrideFor(".kb/tests/TEST-1.txt")).toBeUndefined();
    expect(await overrideFor(".kb/tests/TEST-1.md.bak")).toBeUndefined();
    expect(await overrideFor(".kb/tests/missing.md")).toBeUndefined();
    expect(await overrideFor(".kb/tests/plain.md")).toBeUndefined();
    expect(await overrideFor(undefined)).toBeUndefined();
  });
});

describe("receipt histories", () => {
  test("re-ingesting the same artifact appends nothing", async () => {
    await ingest();
    const receipt = receiptsOf().at(-1) as Row & { receipt_id: string };
    tests = { "TEST-1": testEntity("TEST-1", { proof_receipts: ["junk", receipt] }) };
    upserts = [];
    const output = await ingest();
    expect(upserts).toStrictEqual([]);
    expect(output.structuredContent.results).toStrictEqual([
      {
        testId: "TEST-1",
        outcome: "passed",
        receiptId: receipt.receipt_id,
        applied: false,
        duplicate: true,
        receiptCount: 1,
        compacted: 0,
        gaps: [],
        kind: "e2e",
        evidenceLevel: "tested",
        scope: "end_to_end",
      },
    ]);
    expect(output.content[0]?.text).toBe("Ingested proof evidence. Passed 1 test(s), 1 unchanged.");
  });

  test("a failed duplicate counts as failed", async () => {
    await executeIngestProof({ snapshot: SNAPSHOT, artifact: failing(), testIds: ["TEST-1"] }, context());
    const receipt = receiptsOf().at(-1) as Row & { receipt_id: string };
    tests = { "TEST-1": testEntity("TEST-1", { proof_receipts: [receipt] }) };
    const output = await executeIngestProof(
      { snapshot: SNAPSHOT, artifact: failing(), testIds: ["TEST-1"] },
      context(),
    );
    expect([
      output.structuredContent.failed,
      output.structuredContent.unchanged,
      output.content[0]?.text,
    ]).toStrictEqual([1, 1, "Ingested proof evidence. No passing proof: 1 failed, 1 unchanged."]);
  });

  test("validates and compacts the newest window of receipts", async () => {
    const windows: number[] = [];
    const options: unknown[] = [];
    spies.push(
      spyOn(receiptModule, "proofReceiptHistoryErrors").mockImplementation((_id, _scope, rows) => {
        windows.push((rows as unknown[]).length);
        return [];
      }),
      spyOn(compaction, "compactProofReceipts").mockImplementation((rows, option) => {
        options.push(option);
        return { kept: [...rows] } as never;
      }),
    );
    const prior = Array.from({ length: 50 }, (_, index) => ({ receipt_id: `R-${index}` }));
    tests = { "TEST-1": testEntity("TEST-1", { proof_receipts: prior }) };
    const output = await ingest();
    expect(windows).toStrictEqual([50]);
    expect(receiptsOf()[0]).toStrictEqual({ receipt_id: "R-1" });
    expect(options).toStrictEqual([{ codeSnapshot: SNAPSHOT, bindingHash: hashOf("TEST-1") }]);
    expect(output.structuredContent.results[0]?.compacted).toBe(1);
    options.length = 0;
    await ingest({}, {}, context({ fs: undefined }));
    expect(options).toStrictEqual([{ codeSnapshot: SNAPSHOT }]);
  });

  test("names every history error", async () => {
    spies.push(
      spyOn(receiptModule, "proofReceiptHistoryErrors").mockReturnValue(["first", "second"]),
    );
    expect(await failure(() => ingest())).toBe("Proof ingest failed for TEST-1: first; second");
  });

  test("an upsert without a result prepared no commit", async () => {
    upsertResult = () => ({ content: [] });
    expect(await failure(() => ingest())).toBe(
      "Proof ingest failed for TEST-1: receipt commit was not prepared",
    );
  });
});

describe("commits", () => {
  test("a refused commit rolls back and fails with the store's reason", async () => {
    commits = [() => ({ success: false, bindings: {}, error: "nope" })];
    expect(await failure(() => ingest())).toBe("nope");
    commits = [() => ({ success: false, bindings: {} })];
    expect(await failure(() => ingest())).toBe("batch commit failed");
    expect(rollbacks).toStrictEqual(["TEST-1", "TEST-1"]);
  });

  test("a commit without change kinds fails after it is final", async () => {
    commits = [() => ({ success: true, bindings: {} })];
    expect(await failure(() => ingest())).toBe(
      "Upsert batch completed without 1 created/updated result(s)",
    );
    expect(rollbacks).toStrictEqual([]);
  });

  test("names every receipt it could not restore", async () => {
    tests = { "TEST-1": testEntity("TEST-1"), "TEST-2": testEntity("TEST-2") };
    commits = [() => ({ success: false, bindings: {}, error: "nope" })];
    const errors = [new Error("disk full"), new Error("disk gone")];
    rollbackFailures = {
      "TEST-1": async () => [{ step: "source", error: errors[0] }],
      "TEST-2": async () => [{ step: "source", error: errors[1] }],
    };
    let thrown: unknown;
    try {
      await ingest({}, { testIds: ["TEST-1", "TEST-2"] }, context({ fs: undefined }));
    } catch (error) {
      thrown = error;
    }
    expect((thrown as AggregateError).message).toBe(
      "Proof ingest failed and could not restore every uncommitted receipt source; the source mutation lock remains held for recovery (TEST-1:source, TEST-2:source)",
    );
    expect((thrown as AggregateError).errors).toStrictEqual([new Error("nope"), ...errors]);
  });

  test("an unrestored receipt keeps the lock held", async () => {
    commits = [() => ({ success: false, bindings: {}, error: "nope" })];
    rollbackFailures = { "TEST-1": async () => [{ step: "source", error: new Error("x") }] };
    await failure(() => ingest());
    expect(existsSync(lockPath())).toBe(true);
  });

  test("an upsert that could not undo its own writes keeps the lock held", async () => {
    upsertResult = () => {
      throw new MutationRollbackFailureError([new Error("x")], "restore failed", []);
    };
    expect(await failure(() => ingest())).toBe("restore failed");
    expect(existsSync(lockPath())).toBe(true);
  });

  test("an upsert that could not undo its writes fails an unlocked run", async () => {
    upsertResult = () => {
      throw new MutationRollbackFailureError([new Error("x")], "restore failed", []);
    };
    expect(await failure(() => ingest({}, {}, context({ fs: undefined })))).toBe("restore failed");
  });

  test("any other upsert failure releases the lock", async () => {
    upsertResult = () => {
      throw new Error("refused");
    };
    expect(await failure(() => ingest())).toBe("refused");
    expect(existsSync(lockPath())).toBe(false);
    expect(await failure(() => ingest({}, {}, context({ fs: undefined })))).toBe("refused");
  });
});

describe("the workspace lock", () => {
  test("is taken only for a source-first run that does not hold it", async () => {
    await ingest({}, {}, context({ sourceFirst: false }));
    await ingest({}, {}, context({ sourceMutationLockHeld: true }));
    await ingest({}, {}, context({ sourceFirst: true }));
    expect(upserts.map((entry) => [entry.lockHeld, entry.lockFile])).toStrictEqual([
      [undefined, false],
      [true, false],
      [true, true],
    ]);
  });

  function failingRelease() {
    let releases = 0;
    spies.push(
      spyOn(lockModule, "acquireWorkspaceMutationLock").mockResolvedValue({
        release: () => {
          releases += 1;
          throw new Error("release failed");
        },
      } as never),
    );
    return () => releases;
  }

  test("a failed release after a commit is not retryable", async () => {
    failingRelease();
    let thrown: unknown;
    try {
      await ingest();
    } catch (error) {
      thrown = error;
    }
    expect([(thrown as { code?: string }).code, (thrown as Error).message]).toStrictEqual([
      "SOURCE_MUTATION_LOCK_RELEASE_FAILED",
      "Mutation committed, but workspace source lock release failed: release failed; do not retry the mutation until the lock is manually verified and released",
    ]);
  });

  test("a failed release after a failure names both", async () => {
    failingRelease();
    upsertResult = () => {
      throw new Error("refused");
    };
    let thrown: unknown;
    try {
      await ingest();
    } catch (error) {
      thrown = error;
    }
    expect((thrown as AggregateError).message).toBe(
      "Operation failed and workspace mutation lock release failed",
    );
    expect((thrown as AggregateError).errors).toStrictEqual([
      new Error("refused"),
      new Error("release failed"),
    ]);
  });

  test("a failed restore leaves the lock unreleased", async () => {
    const releases = failingRelease();
    commits = [() => ({ success: false, bindings: {}, error: "nope" })];
    rollbackFailures = { "TEST-1": async () => [{ step: "source", error: new Error("x") }] };
    await failure(() => ingest());
    expect(releases()).toBe(0);
  });
});

describe("refusals", () => {
  test("refuse a run it cannot check", async () => {
    expect([
      await failure(() => ingest({}, {}, context({ prolog: undefined }))),
      await failure(() => ingest({}, { snapshot: " " })),
      await failure(() =>
        executeIngestProof({ snapshot: SNAPSHOT, artifact: "x" as never, testIds: ["TEST-1"] }, context()),
      ),
      await failure(() =>
        executeIngestProof({ snapshot: SNAPSHOT, artifact: {}, testIds: ["TEST-1"] }, context()),
      ),
      await failure(() => ingest({}, {}, context({ git: undefined }))),
      await failure(() => ingest({}, { snapshot: "b".repeat(64) })),
      await failure(() => ingest({ code_snapshot: "b".repeat(64) })),
      await failure(() => ingest({}, { testIds: [" "] })),
      await failure(() => ingest({}, { testIds: ["TEST-1", "TEST-1"] })),
      await failure(() => ingest({ integration: undefined }, { testIds: [] })),
      await failure(() => ingest({}, { testIds: ["TEST-9"] })),
    ]).toStrictEqual([
      "Proof ingest requires a Prolog runtime",
      "Proof ingest failed: snapshot must be non-empty",
      "Proof ingest failed: artifact must be a kibi.proof-run.v1 object with version, producer, command_argv, code_snapshot, environment, run, and proof_results",
      `Proof ingest failed: ${proofRunArtifactErrors({}).join("; ")}`,
      "Proof ingest failed: The active operation runtime does not expose workspace snapshots.",
      "Proof ingest failed: captured snapshot is not the live workspace snapshot",
      "Proof ingest failed: artifact code_snapshot does not match captured snapshot",
      "Proof ingest failed: testIds must be non-empty",
      "Proof ingest failed: testIds contains duplicates",
      "Proof ingest failed: provide testIds, or set artifact.integration to select the contracted tests this artifact is evaluated against",
      "Proof ingest failed: test TEST-9 was not found",
    ]);
    expect(proofRunArtifactErrors({}).length).toBeGreaterThan(1);
  });

  test("an unreadable integrations file fails the ingest", async () => {
    const message = await failure(() => {
      const ctx = context();
      cleanups.push(() => undefined);
      Bun.spawnSync(["rm", path.join(root, ".kb/proof/integrations.json")]);
      return ingest({}, {}, ctx);
    });
    const integrations = loadProofIntegrations(root);
    expect(integrations.available).toBe(false);
    expect(message).toBe(
      `Proof ingest failed: ${(integrations as { error: string }).error}`,
    );
  });

  test("checks each test's contract against the artifact", async () => {
    const run = async (fields: Row, artifactFields: Row = {}) => {
      tests = { "TEST-1": testEntity("TEST-1", fields) };
      return failure(() => ingest(artifactFields));
    };
    expect([
      await run({ proof_contract: { ...CONTRACT, version: "v0" } }),
      await run({ proof_contract: "x" }),
      await run({ proof_contract: { ...CONTRACT, integration: "other" } }),
      await run({ proof_contract: { ...CONTRACT, integration: "ghost" } }, { integration: undefined }),
      await run({ proof_contract: { ...CONTRACT, integration: undefined } }, { integration: undefined }),
      await run({}, { command_argv: ["node", "else.mjs"] }),
      await run({ proof_bindings: "x" }),
      await run({ proof_bindings: [{}, 1] }),
      await run({}, { integration: undefined }),
    ]).toStrictEqual([
      "Proof ingest failed: test TEST-1 has no proof_contract (kibi.proof-contract.v1)",
      "Proof ingest failed: test TEST-1 has no proof_contract (kibi.proof-contract.v1)",
      "Proof ingest failed: test TEST-1 binds integration 'other' but the artifact was produced by 'self-proof'",
      "Proof ingest failed: integration 'ghost' is not configured in .kb/proof/integrations.json",
      "Proof ingest failed: integration '' is not configured in .kb/proof/integrations.json",
      "Proof ingest failed: artifact command_argv does not match the configured command for integration 'self-proof'",
      "Proof ingest failed: test TEST-1 proof_bindings must be an array",
      "Proof ingest failed: test TEST-1 proof_bindings[0].symbol_id must be a non-empty proof symbol ID (SYM-*); proof_bindings[0].target must be a non-empty execution target; proof_bindings[1] must be an object with symbol_id and target",
      "ok",
    ]);
  });

  test("a test without bindings binds nothing", async () => {
    const integrations = loadProofIntegrations(root) as {
      integrations: Parameters<typeof resolveIntegration>[0];
    };
    const components = effectiveProofFingerprint({
      contract: CONTRACT as ProofContract,
      integration: toExecution(
        resolveIntegration(integrations.integrations, "self-proof") as Parameters<
          typeof toExecution
        >[0],
      ),
      bindings: [],
    }).components;
    for (const bindings of [undefined, null]) {
      tests = { "TEST-1": testEntity("TEST-1", { proof_bindings: bindings }) };
      upserts = [];
      await ingest();
      expect((receiptsOf().at(-1) as Row).fingerprint_components).toStrictEqual(components);
    }
  });

  test("a contract without a required-proof list requires none", async () => {
    tests = { "TEST-1": testEntity("TEST-1", { proof_contract: { ...CONTRACT, required_proofs: "x" } }) };
    await ingest();
    expect((receiptsOf().at(-1) as Row).contract_hash).toBe(
      proofContractHash({ ...CONTRACT, required_proofs: [] } as ProofContract),
    );
  });
});

describe("selecting tests by integration", () => {
  test("loads each contracted test of the artifact's integration", async () => {
    tests = { A: testEntity("A"), B: testEntity("B") };
    candidates = [
      { id: "A", proof_contract: CONTRACT },
      { id: "B", proof_contract: { ...CONTRACT, integration: "other" } },
      { id: "C", proof_contract: { ...CONTRACT, version: "v0" } },
      { id: "D", proof_contract: "x" },
      { id: "E" },
    ];
    const output = await ingest({}, { testIds: undefined });
    expect(output.structuredContent.results.map((row) => row.testId)).toStrictEqual(["A"]);
    expect(loads).toStrictEqual([
      { type: "test", projection: "proof_contract" },
      { id: "A", type: "test" },
    ]);
  });

  test("a selected test must load in full", async () => {
    tests = {};
    candidates = [{ id: "F", proof_contract: CONTRACT }];
    expect(await failure(() => ingest({}, { testIds: undefined }))).toBe(
      "Proof ingest failed: test F was not found",
    );
    candidates = [];
    expect(await failure(() => ingest({}, { testIds: undefined }))).toBe(
      "Proof ingest failed: no tests declare proof_contract.integration 'self-proof'",
    );
  });

  test("counts passed and failed tests together", async () => {
    tests = {
      "TEST-1": testEntity("TEST-1"),
      "TEST-2": testEntity("TEST-2", {
        proof_contract: { ...CONTRACT, required_proofs: [{ symbol_id: "SYM-2", target: "default" }] },
      }),
    };
    const output = await ingest({}, { testIds: ["TEST-1", "TEST-2"] });
    expect(output.content[0]?.text).toBe("Ingested proof evidence. Passed 1 test(s), 1 failed.");
  });
});

describe("native case bindings", () => {
  const native = (nativeId: string) => ({
    proof_results: [
      {
        symbol_id: "SYM-1",
        target: "default",
        outcome: "passed",
        binding: "native_case",
        native_id: nativeId,
        attempts: { status: "complete", entries: [{ outcome: "passed", duration_ms: 1 }] },
      },
    ],
  });

  test("bind a native case by its id or an alias", async () => {
    const bindings: Row[] = [
      { symbol_id: "SYM-OTHER", target: "default", native_id: "other" },
      {
        symbol_id: "SYM-1",
        target: "default",
        aliases: ["case-1"],
        source_file: "src/a.test.ts",
        line: 3,
      },
    ];
    tests = { "TEST-1": testEntity("TEST-1", { proof_bindings: bindings }) };
    await ingest(native("case-1"));
    const integration = loadProofIntegrations(root);
    const expected: ProofBinding[] = [
      { symbol_id: "SYM-OTHER", target: "default", native_id: "other" },
      { symbol_id: "SYM-1", target: "default", aliases: ["case-1"], source_file: "src/a.test.ts", line: 3 },
    ];
    expect((receiptsOf().at(-1) as Row).fingerprint_components).toStrictEqual(
      effectiveProofFingerprint({
        contract: CONTRACT as ProofContract,
        integration: toExecution(
          resolveIntegration(
            (integration as { integrations: Parameters<typeof resolveIntegration>[0] }).integrations,
            "self-proof",
          ) as Parameters<typeof toExecution>[0],
        ),
        bindings: expected,
      }).components,
    );
  });

  test("a binding without native ids owns none", async () => {
    tests = {
      "TEST-1": testEntity("TEST-1", {
        proof_bindings: [{ symbol_id: "SYM-1", target: "default" }],
        proof_receipts: null,
      }),
    };
    expect(await failure(() => ingest(native("case-1")))).toBe(
      "Proof ingest failed: test TEST-1 native_case result SYM-1/default native_id 'case-1' does not match its proof_binding native_id or aliases",
    );
  });

  test("two bindings that own one id are ambiguous", async () => {
    tests = {
      "TEST-1": testEntity("TEST-1", {
        proof_bindings: [
          { symbol_id: "SYM-1", target: "default", native_id: "case-1" },
          { symbol_id: "SYM-2", target: "default", aliases: ["case-1"] },
        ],
      }),
    };
    expect(await failure(() => ingest(native("case-1")))).toBe(
      "Proof ingest failed: test TEST-1 native_id 'case-1' has an ambiguous proof_binding",
    );
  });
});
