import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  InputError,
  KbRejection,
  OperationError,
} from "../../../src/cli-errors.js";
import * as manifestModule from "../../../src/extractors/manifest.js";
import * as contextWarning from "../../../src/operations/mutation/context-warning.js";
import * as contradictions from "../../../src/operations/mutation/contradictions.js";
import * as inventoryWarning from "../../../src/operations/mutation/inventory-commit-warning.js";
import * as journalModule from "../../../src/operations/mutation/plan-apply-journal.js";
import { MutationRollbackFailureError } from "../../../src/operations/mutation/saga.js";
import * as sourceAuthoring from "../../../src/operations/mutation/source-authoring.js";
import * as compilerLock from "../../../src/operations/mutation/symbol-compiler-lock.js";
import * as symbolRefresh from "../../../src/operations/mutation/symbol-refresh.js";
import * as upsertModule from "../../../src/operations/mutation/upsert.js";
import {
  assertRelationshipShardContained,
  executeUpsert,
} from "../../../src/operations/mutation/upsert.js";
import * as validateModule from "../../../src/operations/mutation/validate-upsert.js";
import * as warningsModule from "../../../src/operations/mutation/warnings.js";
import * as lockModule from "../../../src/operations/mutation/workspace-mutation-lock.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import * as shards from "../../../src/relationships/shards.js";
import * as branchResolver from "../../../src/utils/branch-resolver.js";
import * as idStyle from "../../../src/utils/entity-id-style.js";
import { scratch } from "../../operations-coverage/helpers.js";

type Row = Record<string, unknown>;

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const LOCK = { lock: "workspace" };
const COMPILER = { lock: "compiler" };

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
let root: string;
let goals: string[];
let invalidations: number;
let commitAnswer: () => PrologQueryResult;
let validation: Row;
let validationCalls: unknown[][];
let validationFailure: unknown;
let scope: Row | null;
let sourceWrite: Row | null;
let sourceWriteCalls: unknown[][];
let sourceRollbacks: number;
let sourceRollbackFailure: unknown;
let appended: Row[];
let appendEffect: (shardPath: string) => void;
let receipts: unknown[][];
let restoredTimes: unknown[][];
let events: string[];
let releases: unknown[][];
let recoveries: unknown[];
let settleCalls: Row[];
let refresh: Row;
let refreshCalls: unknown[][];
let coordinateRollbacks: number;
let coordinateRollbackFailure: unknown;
let manifestRecords: () => Row[];
let extracted: Row[];
let commitGoalCalls: unknown[];
let styleCalls: unknown[];
let styleWarnings: string[];
let contextCalls: unknown[][];
let resolved: unknown;

beforeEach(() => {
  const ws = scratch({ ".kb/.keep": "" }, "kibi-upsert-");
  cleanups.push(ws.cleanup);
  root = ws.root;
  goals = [];
  invalidations = 0;
  commitAnswer = () => ({ success: true, bindings: { ChangeKind: "created" } });
  validation = {
    validated: {
      entity: { id: "FACT-a", type: "fact", title: "A" },
      relationships: [],
    },
    relationships: [],
    semantic: { receipt: null, warnings: ["semantic"] },
  };
  validationCalls = [];
  validationFailure = undefined;
  scope = null;
  sourceWrite = null;
  sourceWriteCalls = [];
  sourceRollbacks = 0;
  sourceRollbackFailure = undefined;
  appended = [];
  appendEffect = (shardPath) => {
    mkdirSync(path.dirname(shardPath), { recursive: true });
    writeFileSync(
      shardPath,
      `${existsSync(shardPath) ? readFileSync(shardPath, "utf8") : ""}+row`,
    );
  };
  receipts = [];
  restoredTimes = [];
  events = [];
  releases = [];
  recoveries = [];
  settleCalls = [];
  refresh = { refreshed: true, found: true, outcome: "updated" };
  refreshCalls = [];
  coordinateRollbacks = 0;
  coordinateRollbackFailure = undefined;
  manifestRecords = () => [{ id: "SYM-a" }];
  extracted = [{ entity: { id: "SYM-a", type: "symbol", title: "Canon" } }];
  commitGoalCalls = [];
  styleCalls = [];
  styleWarnings = ["style"];
  contextCalls = [];
  resolved = { error: "not a git repository" };
  spies.push(
    spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
      async (...args) => {
        validationCalls.push(args);
        if (validationFailure !== undefined) throw validationFailure;
        return validation as never;
      },
    ),
    spyOn(upsertModule, "sourceWriteScope").mockImplementation(
      async () => scope as never,
    ),
    spyOn(sourceAuthoring, "writeSourceForUpsert").mockImplementation(
      async (...args) => {
        sourceWriteCalls.push(args);
        if (sourceWrite === null) return null;
        return {
          ...sourceWrite,
          rollback: async () => {
            sourceRollbacks += 1;
            if (sourceRollbackFailure !== undefined)
              throw sourceRollbackFailure;
          },
        } as never;
      },
    ),
    spyOn(sourceAuthoring, "writePendingSourceReceipt").mockImplementation(
      (...args) => {
        receipts.push(args);
      },
    ),
    spyOn(sourceAuthoring, "restoreFileTimes").mockImplementation((...args) => {
      restoredTimes.push(args);
    }),
    spyOn(shards, "appendRelationship").mockImplementation((kbRoot, record) => {
      appended.push({ kbRoot, ...record });
      const shardPath = shards.computeShardPath(kbRoot, record.from);
      appendEffect(shardPath);
      return { shardPath, recordId: "r" };
    }),
    spyOn(lockModule, "acquireWorkspaceMutationLock").mockImplementation(
      async (workspace) => {
        events.push(`workspace-lock ${workspace === root}`);
        return LOCK as never;
      },
    ),
    spyOn(lockModule, "releaseWorkspaceMutationLock").mockImplementation(
      (...args) => {
        releases.push(["workspace", ...args]);
      },
    ),
    spyOn(compilerLock, "acquireSymbolCompilerLock").mockImplementation(
      async (workspace) => {
        events.push(`compiler-lock ${workspace === root}`);
        return COMPILER as never;
      },
    ),
    spyOn(compilerLock, "releaseSymbolCompilerLock").mockImplementation(
      (...args) => {
        releases.push(["compiler", ...args]);
      },
    ),
    spyOn(journalModule, "settlePendingPlanApplyJournals").mockImplementation(
      async (ctx, options) => {
        settleCalls.push({
          branch: ctx.branchAttachment,
          prolog: await options.prolog(),
        });
        return recoveries as never;
      },
    ),
    spyOn(
      symbolRefresh,
      "refreshSymbolCoordinatesForManifest",
    ).mockImplementation(async (...args) => {
      refreshCalls.push(args);
      return {
        ...refresh,
        ...(refresh.publication === undefined
          ? {}
          : {
              publication: {
                rollback: () => {
                  coordinateRollbacks += 1;
                  if (coordinateRollbackFailure !== undefined)
                    throw coordinateRollbackFailure;
                },
              },
            }),
      } as never;
    }),
    spyOn(
      manifestModule,
      "readManifestWithCoordinateOverlay",
    ).mockImplementation(() => manifestRecords() as never),
    spyOn(manifestModule, "extractManifestSymbolRecords").mockImplementation(
      (records, file) => {
        events.push(`extract ${records.length} ${path.relative(root, file)}`);
        return extracted as never;
      },
    ),
    spyOn(contradictions, "buildUpsertCommitGoal").mockImplementation(
      (input) => {
        commitGoalCalls.push(input);
        return "commit-goal";
      },
    ),
    spyOn(warningsModule, "scenarioCoverageWarnings").mockImplementation(
      async () => ["scenario"],
    ),
    spyOn(warningsModule, "symbolCoverageWarnings").mockImplementation(
      async () => ["symbol-coverage"],
    ),
    spyOn(idStyle, "entityIdStyleWarnings").mockImplementation((input) => {
      styleCalls.push(input);
      return styleWarnings;
    }),
    spyOn(contextWarning, "entityContextWarnings").mockImplementation(
      (...args) => {
        contextCalls.push(args);
        return ["context"];
      },
    ),
    spyOn(branchResolver, "resolveBranchAttachment").mockImplementation(
      () => resolved as never,
    ),
  );
});

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const prolog = {
  query: async (goal: string): Promise<PrologQueryResult> => {
    goals.push(goal);
    return commitAnswer();
  },
  invalidateCache: () => {
    invalidations += 1;
  },
};

const attachment = (migrationRequired = false) => ({
  gitBranch: "develop",
  kbBranch: migrationRequired ? "legacy" : "develop",
  storePath: path.join(root, ".kb", "branches", "develop"),
  kind: "exact",
  migrationRequired,
});

function context(fields: Row = {}): OperationContext {
  return {
    workspaceRoot: root,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog,
    branchAttachment: attachment(),
    ...fields,
  } as unknown as OperationContext;
}

const fact = (extra: Row = {}) =>
  ({
    type: "fact",
    id: "FACT-a",
    properties: { title: "A" },
    ...extra,
  }) as never;

async function failure(run: Promise<unknown>): Promise<Error> {
  try {
    await run;
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected a failure");
}

const shardOf = (from: string) =>
  shards.computeShardPath(path.join(root, ".kb"), from);
const relative = (absolute: string) => path.relative(root, absolute);

describe("upsert entry checks", () => {
  test("runs a dry run through the preflight", async () => {
    const preview = spyOn(
      validateModule,
      "executeValidateUpsert",
    ).mockResolvedValue({
      content: [{ type: "text", text: "preview" }],
      structuredContent: { valid: true } as never,
    });
    spies.push(preview);
    const result = await executeUpsert(fact({ dryRun: true }), context());
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "preview" }],
      structuredContent: {
        valid: true,
        dryRun: true,
        skippedEffects: ["kb-write", "workspace-write"],
      } as never,
    });
    expect(preview.mock.calls[0]?.[0]).toStrictEqual({
      type: "fact",
      id: "FACT-a",
      properties: { title: "A" },
    });
  });

  test("refuses planned facts outside a dry run", async () => {
    const error = await failure(
      executeUpsert(fact({ plannedFacts: [] }), context()),
    );
    expect(error).toBeInstanceOf(KbRejection);
    expect((error as KbRejection).code).toBe("VALIDATION_FAILED");
    expect(error.message).toBe(
      "Upsert of FACT-a rejected: plannedFacts is a dryRun-only input. Write the planned facts first (kb_upsert each, or kb_apply_plan with the kb_model plan), then upsert FACT-a without plannedFacts.",
    );
  });

  test("needs a branch, a migrated one where storage is attached, and a store", async () => {
    expect(
      (
        await failure(
          executeUpsert(fact(), context({ branchAttachment: undefined })),
        )
      ).message,
    ).toBe("Unable to resolve KB branch: not a git repository");
    resolved = attachment(true);
    const quiet = await executeUpsert(
      fact(),
      context({ branchAttachment: undefined }),
    );
    expect(quiet.structuredContent?.created).toBe(1);
    const message =
      "Upsert blocked: KB is attached through legacy branch storage (develop -> legacy). Run 'kibi branch migrate --from legacy --to develop --apply' first.";
    for (const fields of [
      { branchAttachment: attachment(true) },
      { branchAttachment: undefined, fs: nodeFilesystem },
    ]) {
      const error = await failure(executeUpsert(fact(), context(fields)));
      expect((error as KbRejection).code).toBe("LEGACY_BRANCH_STORAGE");
      expect(error.message).toBe(message);
    }
    expect(
      (await failure(executeUpsert(fact(), context({ prolog: undefined }))))
        .message,
    ).toBe("Upsert operation requires a Prolog runtime");
  });
});

describe("a committed upsert", () => {
  test("commits the validated entity and reports every warning", async () => {
    validation = {
      ...validation,
      validated: {
        entity: {
          id: "FACT-a",
          type: "fact",
          source: "mcp://x",
          claim_key: "k",
        },
        relationships: [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
      },
      relationships: [1, 2, 3],
    };
    const input = fact();
    const ctx = context();
    const result = await executeUpsert(input, ctx);
    expect(validationCalls).toHaveLength(1);
    expect(validationCalls[0]?.[0]).toBe(input);
    expect(validationCalls[0]?.[1]).toBe(ctx);
    expect(validationCalls[0]?.[2]).toStrictEqual({
      allowReceiptsPrune: false,
    });
    expect(commitGoalCalls).toStrictEqual([
      {
        entity: {
          id: "FACT-a",
          type: "fact",
          source: "mcp://x",
          claim_key: "k",
        },
        relationships: [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
        skipContradictionCheck: false,
      },
    ]);
    expect(goals).toStrictEqual(["commit-goal"]);
    expect(invalidations).toBe(1);
    expect(styleCalls).toStrictEqual([{ id: "FACT-a", sourcePath: "mcp://x" }]);
    expect(contextCalls).toStrictEqual([
      [
        input,
        { id: "FACT-a", type: "fact", source: "mcp://x", claim_key: "k" },
        root,
        { writtenPath: undefined },
      ],
    ]);
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Upserted FACT-a (created) with 3 relationship(s).",
        },
      ],
      structuredContent: {
        created: 1,
        updated: 0,
        relationships_created: 1,
        warnings: [
          "semantic",
          "scenario",
          "symbol-coverage",
          "style",
          "context",
        ],
        claimKey: "k",
      },
    });
    expect(appended).toStrictEqual([]);
    expect(releases).toStrictEqual([
      ["compiler", undefined, undefined, true],
      ["workspace", undefined, undefined, true],
    ]);
  });

  test("reads the change kind, quoted or padded, and warns about style only on create", async () => {
    for (const [binding, created] of [
      [" 'updated' ", false],
      ['"created"', true],
    ] as const) {
      commitAnswer = () => ({
        success: true,
        bindings: { ChangeKind: binding },
      });
      styleCalls = [];
      const result = await executeUpsert(fact(), context());
      expect(result.content).toStrictEqual([
        {
          type: "text",
          text: `Upserted FACT-a (${created ? "created" : "updated"}) with 0 relationship(s).`,
        },
      ]);
      expect([
        result.structuredContent?.created,
        result.structuredContent?.updated,
        styleCalls.length,
        result.structuredContent?.warnings.includes("style"),
      ]).toStrictEqual(created ? [1, 0, 1, true] : [0, 1, 0, false]);
      if (!created)
        expect(result.structuredContent?.warnings).toStrictEqual([
          "semantic",
          "scenario",
          "symbol-coverage",
          "context",
        ]);
    }
    styleCalls = [];
    validation = {
      ...validation,
      validated: { entity: { id: "FACT-a", source: 7 }, relationships: [] },
    };
    commitAnswer = () => ({
      success: true,
      bindings: { ChangeKind: "created" },
    });
    await executeUpsert(fact(), context());
    expect(styleCalls).toStrictEqual([{ id: "FACT-a", sourcePath: undefined }]);
  });

  test("refuses a commit without a readable change kind", async () => {
    for (const bindings of [
      { ChangeKind: "cre'ated" },
      { ChangeKind: "'created" + "x'" },
      {},
    ] as Record<string, string>[]) {
      commitAnswer = () => ({ success: true, bindings });
      const result = await executeUpsert(fact(), context());
      expect(result.structuredContent?.status).toBe("committed_with_repairs");
      expect(result.structuredContent?.warnings).toStrictEqual([
        "Upsert commit completed without a created/updated result for FACT-a",
      ]);
    }
  });

  test("refuses what the store refuses and passes the contradiction skip", async () => {
    commitAnswer = () =>
      ({
        success: false,
        bindings: {},
        error: "store refused",
      }) as PrologQueryResult;
    const error = await failure(
      executeUpsert(fact({ _skipContradictionCheck: true }), context()),
    );
    expect(error.message).toBe(
      `Upsert execution failed: ${contradictions.upsertFailure("FACT-a", "store refused").message}`,
    );
    expect(commitGoalCalls).toStrictEqual([
      {
        entity: { id: "FACT-a", type: "fact", title: "A" },
        relationships: [],
        skipContradictionCheck: true,
      },
    ]);
    expect(invalidations).toBe(0);
    expect(releases).toStrictEqual([
      ["compiler", undefined, { error }, false],
      ["workspace", undefined, { error }, false],
    ]);
    await failure(
      executeUpsert(fact({ _skipContradictionCheck: "yes" }), context()),
    );
    expect((commitGoalCalls[1] as Row).skipContradictionCheck).toBe(false);
  });

  test("reports a requirement's contradiction check and advisor receipt", async () => {
    validation = {
      ...validation,
      semantic: {
        receipt: { logic_readiness: "modeled", candidate_lane: "strict" },
        warnings: [],
      },
    };
    const modeled = await executeUpsert(
      { type: "req", id: "REQ-a", properties: {} } as never,
      context(),
    );
    expect(modeled.structuredContent).toMatchObject({
      semanticAdvisor: { logic_readiness: "modeled", candidate_lane: "strict" },
      contradictionCheck: {
        outcome: "no-conflict",
        checked_req_id: "REQ-a",
        strict_readiness: "modeled",
      },
    });
    validation = {
      ...validation,
      semantic: { receipt: { candidate_lane: "strict" }, warnings: [] },
    };
    const lane = await executeUpsert(
      {
        type: "req",
        id: "REQ-a",
        properties: {},
        _skipContradictionCheck: true,
      } as never,
      context(),
    );
    expect(lane.structuredContent?.contradictionCheck).toStrictEqual({
      outcome: "skipped",
      checked_req_id: "REQ-a",
      strict_readiness: "strict",
    });
    validation = { ...validation, semantic: { receipt: null, warnings: [] } };
    const none = await executeUpsert(
      { type: "req", id: "REQ-a", properties: {} } as never,
      context(),
    );
    expect(none.structuredContent?.contradictionCheck).toStrictEqual({
      outcome: "no-conflict",
      checked_req_id: "REQ-a",
      strict_readiness: "none",
    });
    expect("semanticAdvisor" in (none.structuredContent ?? {})).toBe(false);
    validation = {
      ...validation,
      semantic: { receipt: {}, warnings: [] },
    };
    const bare = await executeUpsert(
      { type: "req", id: "REQ-a", properties: {} } as never,
      context(),
    );
    expect(bare.structuredContent?.contradictionCheck).toMatchObject({
      strict_readiness: "none",
    });
    const plain = await executeUpsert(fact(), context());
    expect("contradictionCheck" in (plain.structuredContent ?? {})).toBe(false);
    expect("claimKey" in (plain.structuredContent ?? {})).toBe(false);
  });

  test("reports a fact's claim key only for a fact with a string key", async () => {
    for (const [entity, expected] of [
      [{ type: "fact", claim_key: "k" }, { claimKey: "k" }],
      [{ type: "fact", claim_key: 7 }, {}],
      [{ type: "req", claim_key: "k" }, {}],
    ] as const) {
      validation = {
        ...validation,
        validated: { entity: { id: "FACT-a", ...entity }, relationships: [] },
      };
      const result = await executeUpsert(fact(), context());
      expect(
        "claimKey" in (result.structuredContent ?? {})
          ? { claimKey: result.structuredContent?.claimKey }
          : {},
      ).toStrictEqual(expected);
    }
  });

  test("names an uncompiled authored file it updated", async () => {
    for (const [extractionError, suffix] of [
      [null, ""],
      [
        "bad front matter",
        ", which kibi sync could not compile before (bad front matter)",
      ],
    ] as const) {
      validation = {
        ...validation,
        uncompiledSource: { path: "docs/a.md", extractionError },
      };
      const result = await executeUpsert(fact(), context());
      expect(result.structuredContent?.warnings).toStrictEqual([
        `FACT-a was not in the compiled KB; this write updated its authored file docs/a.md${suffix}. Run kibi sync to recompile it.`,
        "semantic",
        "scenario",
        "symbol-coverage",
        "style",
        "context",
      ]);
    }
  });
});

describe("source-first writes", () => {
  test("publish the authored document and commit under its path", async () => {
    scope = { existing: { id: "FACT-a", source: "docs/old.md" } };
    sourceWrite = { receipt: { path: "docs/a.md", afterHash: "h" } };
    const input = fact();
    const ctx = context({ fs: nodeFilesystem });
    const result = await executeUpsert(input, ctx, {
      sourceDocumentOverride: "bytes",
    });
    expect(sourceWriteCalls).toStrictEqual([
      [
        input,
        { id: "FACT-a", type: "fact", title: "A" },
        { id: "FACT-a", source: "docs/old.md" },
        ctx,
        "bytes",
      ],
    ]);
    expect((commitGoalCalls[0] as Row).entity).toStrictEqual({
      id: "FACT-a",
      type: "fact",
      title: "A",
      source: "docs/a.md",
    });
    expect(styleCalls).toStrictEqual([
      { id: "FACT-a", sourcePath: "docs/a.md" },
    ]);
    expect(contextCalls[0]?.[3]).toStrictEqual({ writtenPath: "docs/a.md" });
    expect(result.structuredContent?.sourceWrites).toStrictEqual([
      { path: "docs/a.md", afterHash: "h" },
    ] as never);
    expect(events.slice(0, 1)).toStrictEqual(["workspace-lock true"]);
  });

  test("read the subject notes' body from the document the write published", async () => {
    scope = { existing: { id: "FACT-a", source: "docs/old.md" } };
    sourceWrite = { receipt: { path: "docs/a.md", afterHash: "h" } };
    const bodyCalls: unknown[][] = [];
    const body = spyOn(contextWarning, "upsertDocumentBody").mockImplementation(
      (...args) => {
        bodyCalls.push(args);
        return "";
      },
    );
    try {
      await executeUpsert(fact(), context({ fs: nodeFilesystem }));
      expect(bodyCalls.map((call) => call[3])).toStrictEqual([
        { writtenPath: "docs/a.md" },
      ]);
    } finally {
      body.mockRestore();
    }
  });

  test("warn after the context warning when the written document lacks its inventory", async () => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "docs/a.md", afterHash: "h" } };
    const calls: unknown[][] = [];
    const spy = spyOn(
      inventoryWarning,
      "inventoryCommitWarnings",
    ).mockImplementation((...args) => {
      calls.push(args);
      return ["inventory"];
    });
    try {
      const result = await executeUpsert(
        fact(),
        context({ fs: nodeFilesystem }),
      );
      expect(calls).toStrictEqual([["fact", root, "docs/a.md"]]);
      expect(result.structuredContent?.warnings.slice(-2)).toStrictEqual([
        "context",
        "inventory",
      ]);
      sourceWrite = null;
      await executeUpsert(fact(), context({ fs: nodeFilesystem }));
      expect(calls.at(-1)).toStrictEqual(["fact", root, undefined]);
    } finally {
      spy.mockRestore();
    }
  });

  test("write nothing when the scope names no document or the writer declines", async () => {
    scope = { existing: undefined };
    const declined = await executeUpsert(
      fact(),
      context({ fs: nodeFilesystem }),
    );
    expect(sourceWriteCalls).toHaveLength(1);
    expect("sourceWrites" in (declined.structuredContent ?? {})).toBe(false);
    scope = null;
    sourceWrite = { receipt: { path: "docs/a.md" } };
    await executeUpsert(fact(), context({ fs: nodeFilesystem }));
    expect(sourceWriteCalls).toHaveLength(1);
  });

  test("roll the document back when the commit fails", async () => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "docs/a.md" } };
    commitAnswer = () =>
      ({ success: false, bindings: {}, error: "no" }) as never;
    await failure(executeUpsert(fact(), context({ fs: nodeFilesystem })));
    expect(sourceRollbacks).toBe(1);
  });

  test("report a document rollback that fails", async () => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "docs/a.md" } };
    commitAnswer = () =>
      ({ success: false, bindings: {}, error: "no" }) as never;
    for (const [rollbackError, text] of [
      [new Error("disk full"), "disk full"],
      ["raw", "raw"],
    ] as const) {
      sourceRollbackFailure = rollbackError;
      releases = [];
      const error = await failure(
        executeUpsert(fact(), context({ fs: nodeFilesystem })),
      );
      expect(error).toBeInstanceOf(MutationRollbackFailureError);
      expect(error.message).toBe(
        `Upsert failed and authored source rollback failed for FACT-a: ${text}`,
      );
      const aggregate = error as MutationRollbackFailureError;
      expect(aggregate.errors).toHaveLength(2);
      expect(aggregate.errors[1]).toBe(rollbackError);
      expect(aggregate.rollbackFailures).toStrictEqual([
        { step: "authored-source", error: rollbackError },
      ]);
      expect(releases).toStrictEqual([
        ["compiler", undefined, { error }, false],
        ["workspace", LOCK, { error }, false],
      ]);
    }
  });
});

describe("relationship shards", () => {
  const relationship = (to: string, from = "FACT-a") => ({
    type: "relates_to",
    from,
    to,
  });

  test("append each relationship and bind the changed shards", async () => {
    const existing = shardOf("FACT-a");
    mkdirSync(path.dirname(existing), { recursive: true });
    writeFileSync(existing, "old");
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [
          relationship("FACT-b"),
          relationship("FACT-c"),
          relationship("FACT-d", "ZZZ-new"),
          { type: "relates_to", to: "FACT-e" },
          { type: 7, from: "FACT-a", to: "FACT-f" },
          { type: "relates_to", from: "FACT-a", to: 7 },
          { type: "relates_to", from: "", to: "FACT-g" },
        ],
      },
    };
    const result = await executeUpsert(fact(), context({ fs: nodeFilesystem }));
    expect(appended).toStrictEqual(
      ["FACT-b", "FACT-c", "FACT-d", "FACT-e"].map((to, index) => ({
        kbRoot: path.join(root, ".kb"),
        type: "relates_to",
        from: index === 2 ? "ZZZ-new" : "FACT-a",
        to,
        created_at: "2026-09-05T00:00:00.000Z",
        created_by: "kibi/upsert",
        source: "mcp://kibi/upsert",
      })),
    );
    const created = shardOf("ZZZ-new");
    const after = readFileSync(existing, "utf8");
    expect(receipts).toStrictEqual(
      [
        [root, relative(existing), sha(after)],
        [root, relative(created), sha("+row")],
      ].sort((a, b) => String(a[1]).localeCompare(String(b[1]))) as never,
    );
    expect(result.structuredContent?.sourceWrites).toStrictEqual(
      [
        {
          path: relative(existing),
          mode: "write",
          beforeHash: sha("old"),
          afterHash: sha(after),
          created: false,
        },
        {
          path: relative(created),
          mode: "write",
          beforeHash: null,
          afterHash: sha("+row"),
          created: true,
        },
      ].sort((a, b) => a.path.localeCompare(b.path)) as never,
    );
    expect(result.structuredContent?.relationships_created).toBe(7);
  });

  test("list the document before the shards it changed", async () => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "docs/a.md" } };
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [relationship("FACT-b")],
      },
    };
    const result = await executeUpsert(fact(), context({ fs: nodeFilesystem }));
    expect(
      result.structuredContent?.sourceWrites?.map((write) => write.path),
    ).toStrictEqual(["docs/a.md", relative(shardOf("FACT-a"))]);
  });

  test("skip shards without a filesystem or relationships, and unchanged shards", async () => {
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [relationship("FACT-b")],
      },
    };
    await executeUpsert(fact(), context());
    expect(appended).toStrictEqual([]);
    appendEffect = () => undefined;
    const shard = shardOf("FACT-a");
    mkdirSync(path.dirname(shard), { recursive: true });
    writeFileSync(shard, "same");
    const unchanged = await executeUpsert(
      fact(),
      context({ fs: nodeFilesystem }),
    );
    expect(appended).toHaveLength(1);
    expect(receipts).toStrictEqual([]);
    expect("sourceWrites" in (unchanged.structuredContent ?? {})).toBe(false);
  });

  test("report a shard that vanished after its write", async () => {
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [relationship("FACT-b")],
      },
    };
    const shard = shardOf("FACT-a");
    commitAnswer = () => {
      rmSync(shard);
      return { success: true, bindings: { ChangeKind: "updated" } };
    };
    const result = await executeUpsert(fact(), context({ fs: nodeFilesystem }));
    const warning = `Relationship shard vanished after write: ${relative(shard)}`;
    expect(result.structuredContent).toMatchObject({
      status: "committed_with_repairs",
      effectFailures: [
        {
          kind: "workspace-write",
          errorCode: "RELATIONSHIP_SHARD_WRITE_FAILED",
          detail: warning,
        },
      ],
      nextActions: [
        {
          operation: "kb_check",
          reason:
            "Relationship shard publication failed after the KB commit; inspect the shard diagnostics and repair the canonical YAML before syncing.",
          required: true,
        },
      ],
    });
    expect(result.structuredContent?.warnings.at(-1)).toBe(warning);
    appendEffect = () => undefined;
    commitAnswer = () => ({
      success: true,
      bindings: { ChangeKind: "updated" },
    });
    const never = await executeUpsert(fact(), context({ fs: nodeFilesystem }));
    expect("status" in (never.structuredContent ?? {})).toBe(false);
  });

  test("restore the shards when the commit fails", async () => {
    const shard = shardOf("FACT-a");
    mkdirSync(path.dirname(shard), { recursive: true });
    writeFileSync(shard, "old");
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [
          relationship("FACT-b"),
          relationship("FACT-c"),
          relationship("FACT-d", "ZZZ-new"),
        ],
      },
    };
    commitAnswer = () =>
      ({ success: false, bindings: {}, error: "no" }) as never;
    await failure(executeUpsert(fact(), context({ fs: nodeFilesystem })));
    expect(readFileSync(shard, "utf8")).toBe("old");
    expect(existsSync(shardOf("ZZZ-new"))).toBe(false);
    expect(restoredTimes).toHaveLength(1);
    expect(restoredTimes[0]?.[0]).toBe(shard);
    expect(restoredTimes[0]?.[1]).toMatchObject({ mtime: expect.any(Date) });
  });

  test("leave a shard another writer changed after the write", async () => {
    const shard = shardOf("FACT-a");
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [relationship("FACT-b")],
      },
    };
    commitAnswer = () => {
      writeFileSync(shard, "someone else");
      return { success: false, bindings: {}, error: "no" } as never;
    };
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    spies.push(warn);
    await failure(executeUpsert(fact(), context({ fs: nodeFilesystem })));
    expect(readFileSync(shard, "utf8")).toBe("someone else");
    expect(warn.mock.calls).toStrictEqual([
      [
        `Skipped relationship shard rollback for ${path.relative(process.cwd(), shard)}: shard changed after the Kibi write.`,
      ],
    ]);
    commitAnswer = () => {
      rmSync(shard);
      mkdirSync(shard);
      return { success: false, bindings: {}, error: "no" } as never;
    };
    await failure(executeUpsert(fact(), context({ fs: nodeFilesystem })));
    expect(warn.mock.calls).toHaveLength(2);
  });

  test("remove a shard the append never produced", async () => {
    const shard = shardOf("FACT-a");
    appendEffect = () => undefined;
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [relationship("FACT-b")],
      },
    };
    commitAnswer = () => {
      mkdirSync(path.dirname(shard), { recursive: true });
      writeFileSync(shard, "late");
      return { success: false, bindings: {}, error: "no" } as never;
    };
    await failure(executeUpsert(fact(), context({ fs: nodeFilesystem })));
    expect(existsSync(shard)).toBe(false);
  });

  test("refuse a shard path outside the relationship lane", () => {
    const lane = path.join(root, ".kb", "relationships");
    expect(() =>
      assertRelationshipShardContained(root, path.join(lane, "a.yaml")),
    ).not.toThrow();
    for (const shard of [
      path.join(root, ".kb", "relationshipsX", "a.yaml"),
      lane,
      path.join(root, "a.yaml"),
    ]) {
      let error: unknown;
      try {
        assertRelationshipShardContained(root, shard);
      } catch (caught) {
        error = caught;
      }
      expect([
        (error as OperationError).code,
        (error as OperationError).detail,
      ]).toStrictEqual([
        "SOURCE_PATH_INVALID",
        `Relationship shard escapes the canonical workspace lane: ${shard}`,
      ]);
    }
    const outside = scratch({}, "kibi-upsert-outside-");
    cleanups.push(outside.cleanup);
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    symlinkSync(outside.root, lane);
    const escaped = path.join(lane, "a.yaml");
    let error: unknown;
    try {
      assertRelationshipShardContained(root, escaped);
    } catch (caught) {
      error = caught;
    }
    expect([
      (error as OperationError).code,
      (error as OperationError).detail,
    ]).toStrictEqual([
      "SOURCE_PATH_INVALID",
      `Relationship shard follows a symlink outside the workspace: ${escaped}`,
    ]);
  });
});

describe("upsert locks and plan recovery", () => {
  test("hold the workspace lock and settle pending plans for a source-first write", async () => {
    recoveries = [
      { action: "none", detail: "quiet" },
      { action: "completed", detail: "Completed plan." },
    ];
    const result = await executeUpsert(fact(), context({ fs: nodeFilesystem }));
    expect(events).toStrictEqual(["workspace-lock true"]);
    expect(settleCalls).toStrictEqual([{ branch: attachment(), prolog }]);
    expect(result.structuredContent?.warnings[0]).toBe("Completed plan.");
    expect(releases).toStrictEqual([
      ["compiler", undefined, undefined, true],
      ["workspace", LOCK, undefined, true],
    ]);
  });

  test("settle against the resolved branch when the context has none", async () => {
    resolved = attachment();
    await executeUpsert(
      fact(),
      context({ fs: nodeFilesystem, branchAttachment: undefined }),
    );
    expect(settleCalls[0]?.branch).toStrictEqual(attachment());
  });

  test("take no workspace lock when compiled-only, held, or without a filesystem", async () => {
    await executeUpsert(fact(), context());
    await executeUpsert(
      fact(),
      context({ fs: nodeFilesystem, sourceFirst: false }),
    );
    await executeUpsert(
      fact(),
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(events).toStrictEqual([]);
    expect(settleCalls).toStrictEqual([]);
  });

  test("hold the symbol compiler lock only for a source-first symbol", async () => {
    validation = {
      ...validation,
      validated: { entity: { id: "SYM-a", type: "symbol" }, relationships: [] },
    };
    const symbol = { type: "symbol", id: "SYM-a", properties: {} } as never;
    await executeUpsert(
      symbol,
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(events).toStrictEqual(["compiler-lock true"]);
    expect(releases[0]).toStrictEqual(["compiler", COMPILER, undefined, true]);
    events = [];
    await executeUpsert(symbol, context());
    await executeUpsert(
      symbol,
      context({
        fs: nodeFilesystem,
        sourceFirst: false,
        sourceMutationLockHeld: true,
      }),
    );
    await executeUpsert(
      fact(),
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(events).toStrictEqual([]);
  });

  test("release the workspace lock even when the compiler release throws", async () => {
    spies.push(
      spyOn(compilerLock, "releaseSymbolCompilerLock").mockImplementation(
        () => {
          throw new Error("compiler release failed");
        },
      ),
    );
    expect(
      (await failure(executeUpsert(fact(), context({ fs: nodeFilesystem }))))
        .message,
    ).toBe("compiler release failed");
    expect(releases).toStrictEqual([["workspace", LOCK, undefined, true]]);
  });

  test("passes the receipt prune option through", async () => {
    await executeUpsert(fact(), context(), { allowReceiptsPrune: true });
    await executeUpsert(fact(), context(), {
      allowReceiptsPrune: "yes" as never,
    });
    expect(validationCalls.map((call) => call[2])).toStrictEqual([
      { allowReceiptsPrune: true },
      { allowReceiptsPrune: false },
    ]);
  });
});

describe("upsert failures", () => {
  test("keep typed refusals typed and add settled notes", async () => {
    recoveries = [{ action: "completed", detail: "Completed plan." }];
    for (const refusal of [
      new InputError("BAD", "bad input"),
      new OperationError("ENGINE", "engine down", true),
    ]) {
      validationFailure = refusal;
      releases = [];
      const error = await failure(
        executeUpsert(fact(), context({ fs: nodeFilesystem })),
      );
      expect(error.constructor).toBe(refusal.constructor);
      expect((error as InputError).detail).toBe(
        `${refusal.detail} [settled before this failure: Completed plan.]`,
      );
      expect(releases[1]).toStrictEqual(["workspace", LOCK, { error }, false]);
    }
    validationFailure = new KbRejection("VALIDATION_FAILED", "nope");
    releases = [];
    const rejection = await failure(
      executeUpsert(fact(), context({ fs: nodeFilesystem })),
    );
    expect(rejection.message).toBe(
      "Upsert execution failed: nope [settled before this failure: Completed plan.]",
    );
    expect((rejection as KbRejection).code).toBe("VALIDATION_FAILED");
    expect(releases[1]).toStrictEqual([
      "workspace",
      LOCK,
      { error: rejection },
      false,
    ]);
  });

  test("report a derived effect that failed after the commit", async () => {
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact" },
        relationships: [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
      },
      semantic: { receipt: { lane: "x" }, warnings: [] },
    };
    recoveries = [{ action: "completed", detail: "Completed plan." }];
    for (const [thrown, detail, kind] of [
      [new Error("coverage failed"), "coverage failed", "updated"],
      ["raw", "raw", "created"],
    ] as const) {
      commitAnswer = () => ({ success: true, bindings: { ChangeKind: kind } });
      spies.push(
        spyOn(warningsModule, "scenarioCoverageWarnings").mockImplementation(
          async () => {
            throw thrown;
          },
        ),
      );
      releases = [];
      const result = await executeUpsert(
        fact(),
        context({ fs: nodeFilesystem }),
      );
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: "Upserted FACT-a, but a derived effect requires repair.",
          },
        ],
        structuredContent: {
          created: kind === "created" ? 1 : 0,
          updated: kind === "updated" ? 1 : 0,
          relationships_created: 1,
          warnings: ["Completed plan.", detail],
          semanticAdvisor: { lane: "x" },
          status: "committed_with_repairs",
          effectFailures: [
            {
              kind: "derived-effect",
              errorCode: "POST_COMMIT_EFFECT_FAILED",
              detail,
            },
          ],
          nextActions: [
            {
              operation: "kb_status",
              reason:
                "The compiled mutation committed; inspect the authoritative source and derived status before repairing.",
              required: true,
            },
            {
              operation: "kb_sync",
              reason:
                "Recompile canonical source files after the committed derived effect failure; do not retry the original upsert.",
              required: true,
            },
          ],
        } as never,
      });
      expect(releases[1]).toStrictEqual(["workspace", LOCK, undefined, true]);
    }
  });

  test("report a repair before the change kind was known", async () => {
    commitAnswer = () => ({ success: true, bindings: {} });
    const result = await executeUpsert(fact(), context());
    expect([
      result.structuredContent?.created,
      result.structuredContent?.updated,
      result.structuredContent?.relationships_created,
    ]).toStrictEqual([0, 0, 0]);
  });
});

describe("symbol coordinates", () => {
  const symbol = { type: "symbol", id: "SYM-a", properties: {} } as never;
  const symbolContext = () =>
    context({ fs: nodeFilesystem, sourceMutationLockHeld: true });

  beforeEach(() => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "symbols.yaml" } };
    validation = {
      ...validation,
      validated: {
        entity: { id: "SYM-a", type: "symbol", title: "Payload" },
        relationships: [],
      },
    };
  });

  test("refresh the coordinates and commit the re-extracted entity", async () => {
    refresh = {
      refreshed: true,
      found: true,
      outcome: "updated",
      publication: {},
      unplaced: "no declaration named SYM-a",
    };
    extracted = [
      {
        entity: { id: "SYM-a", type: "symbol", title: "Canon" },
        sourceFile: "src/a.ts",
      },
    ];
    const ctx = symbolContext();
    const result = await executeUpsert(symbol, ctx);
    expect(refreshCalls).toStrictEqual([
      ["SYM-a", path.join(root, "symbols.yaml"), ctx],
    ]);
    expect(events).toContain("extract 1 symbols.yaml");
    expect((commitGoalCalls[0] as Row).entity).toStrictEqual({
      id: "SYM-a",
      type: "symbol",
      title: "Canon",
      sourceFile: "src/a.ts",
      source: "symbols.yaml",
    });
    expect(result.structuredContent?.warnings.at(-1)).toBe(
      "SYM-a has no symbol coordinates: no declaration named SYM-a. Until Kibi places it, its link is not checked against the code (impact review, coverage and proofs do not see it there). Use the name the extractor gives the declaration, install the plugins and grammar packs kibi doctor names, or add symbol_role and granularity_reason for a file-level link.",
    );
  });

  test("commit an extracted entity without a source file as extracted", async () => {
    await executeUpsert(symbol, symbolContext());
    expect((commitGoalCalls[0] as Row).entity).toStrictEqual({
      id: "SYM-a",
      type: "symbol",
      title: "Canon",
      source: "symbols.yaml",
    });
    const warnings =
      (await executeUpsert(symbol, symbolContext())).structuredContent
        ?.warnings ?? [];
    expect(
      warnings.some((warning) => warning.includes("has no symbol coordinates")),
    ).toBe(false);
  });

  test("skip the refresh without a document, a filesystem or source-first mode", async () => {
    sourceWrite = null;
    await executeUpsert(symbol, symbolContext());
    sourceWrite = { receipt: { path: "symbols.yaml" } };
    await executeUpsert(symbol, context());
    await executeUpsert(
      symbol,
      context({
        fs: nodeFilesystem,
        sourceFirst: false,
        sourceMutationLockHeld: true,
      }),
    );
    await executeUpsert(fact(), symbolContext());
    expect(refreshCalls).toStrictEqual([]);
  });

  test("fail when the refresh or the manifest loses the symbol", async () => {
    const reasons: string[] = [];
    for (const result of [
      { found: false },
      { found: true, outcome: "removed" },
    ]) {
      refresh = result;
      reasons.push(
        (await failure(executeUpsert(symbol, symbolContext()))).message,
      );
    }
    refresh = { found: true, outcome: "updated" };
    manifestRecords = () => [{ id: "SYM-other" }];
    reasons.push(
      (await failure(executeUpsert(symbol, symbolContext()))).message,
    );
    manifestRecords = () => [{ id: "SYM-a" }];
    extracted = [];
    reasons.push(
      (await failure(executeUpsert(symbol, symbolContext()))).message,
    );
    manifestRecords = () => {
      throw new Error("bad yaml");
    };
    reasons.push(
      (await failure(executeUpsert(symbol, symbolContext()))).message,
    );
    manifestRecords = () => {
      throw "raw";
    };
    reasons.push(
      (await failure(executeUpsert(symbol, symbolContext()))).message,
    );
    expect(reasons).toStrictEqual([
      "Upsert execution failed: Coordinate refresh could not find SYM-a in the authored symbol manifest",
      "Upsert execution failed: Coordinate refresh could not find SYM-a in the authored symbol manifest",
      "Upsert execution failed: Canonical symbol manifest symbols.yaml no longer contains SYM-a after coordinate refresh",
      "Upsert execution failed: Canonical symbol manifest symbols.yaml no longer contains SYM-a after coordinate refresh",
      "Upsert execution failed: Canonical symbol manifest symbols.yaml could not be compiled after coordinate refresh: bad yaml",
      "Upsert execution failed: Canonical symbol manifest symbols.yaml could not be compiled after coordinate refresh: raw",
    ]);
  });

  test("roll the coordinates back, reporting a failed rollback first", async () => {
    refresh = { found: false, publication: {} };
    await failure(executeUpsert(symbol, symbolContext()));
    expect([coordinateRollbacks, sourceRollbacks]).toStrictEqual([1, 1]);
    coordinateRollbackFailure = new Error("artifact locked");
    sourceRollbackFailure = new Error("source locked");
    const error = await failure(executeUpsert(symbol, symbolContext()));
    expect(error).toBeInstanceOf(MutationRollbackFailureError);
    expect(error.message).toBe(
      "Upsert failed and coordinate artifact rollback failed for SYM-a",
    );
    const aggregate = error as MutationRollbackFailureError;
    expect((aggregate.errors[0] as Error).message).toBe(
      "Coordinate refresh could not find SYM-a in the authored symbol manifest",
    );
    expect(aggregate.errors[1]).toBe(coordinateRollbackFailure);
    expect(aggregate.rollbackFailures.map((f) => f.step)).toStrictEqual([
      "symbol-coordinates",
      "authored-source",
    ]);
    expect(releases.at(-2)).toStrictEqual([
      "compiler",
      COMPILER,
      { error },
      false,
    ]);
  });
});

describe("deferred commits", () => {
  test("prepare the write and leave the commit to the caller", async () => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "docs/a.md" } };
    validation = {
      ...validation,
      validated: {
        entity: { id: "FACT-a", type: "fact", claim_key: "k" },
        relationships: [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
      },
      semantic: { receipt: { lane: "x" }, warnings: ["semantic"] },
    };
    recoveries = [{ action: "completed", detail: "Completed plan." }];
    const result = await executeUpsert(
      fact({ _skipContradictionCheck: true }),
      context({ fs: nodeFilesystem }),
      { deferCompiledCommit: true },
    );
    const deferred = result.structuredContent?.deferredCommit as {
      entity: Row;
      relationships: Row[];
      skipContradictionCheck: boolean;
      state: string;
      finalize: () => void;
      rollback: () => Promise<unknown>;
    };
    expect(result).toStrictEqual({
      content: [
        { type: "text", text: "Prepared FACT-a for a batched proof commit." },
      ],
      structuredContent: {
        created: 0,
        updated: 0,
        relationships_created: 1,
        warnings: ["Completed plan.", "semantic"],
        semanticAdvisor: { lane: "x" },
        claimKey: "k",
        deferredCommit: deferred,
        sourceWrites: [{ path: "docs/a.md" }],
      } as never,
    });
    expect([
      deferred.entity,
      deferred.relationships,
      deferred.skipContradictionCheck,
      deferred.state,
    ]).toStrictEqual([
      { id: "FACT-a", type: "fact", claim_key: "k", source: "docs/a.md" },
      [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
      true,
      "prepared",
    ]);
    expect(goals).toStrictEqual([]);
    expect(releases[1]).toStrictEqual(["workspace", LOCK, undefined, false]);
    deferred.finalize();
    expect(deferred.state).toBe("committed");
    expect(() => deferred.finalize()).toThrow(
      "Cannot finalize deferred upsert FACT-a from state committed",
    );
    await expect(deferred.rollback()).rejects.toThrow(
      "Cannot roll back deferred upsert FACT-a after its compiled commit",
    );
    expect(sourceRollbacks).toBe(0);
  });

  test("roll back a prepared write once", async () => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "docs/a.md" } };
    const result = await executeUpsert(
      fact({ _skipContradictionCheck: "yes" }),
      context({ fs: nodeFilesystem }),
      { deferCompiledCommit: true },
    );
    const deferred = result.structuredContent?.deferredCommit as {
      skipContradictionCheck: boolean;
      state: string;
      finalize: () => void;
      rollback: () => Promise<unknown>;
    };
    expect(deferred.skipContradictionCheck).toBe(false);
    expect("sourceWrites" in (result.structuredContent ?? {})).toBe(true);
    const first = deferred.rollback();
    expect(deferred.state).toBe("rolling_back");
    expect(deferred.rollback()).toBe(first);
    expect(() => deferred.finalize()).toThrow(
      "Cannot finalize deferred upsert FACT-a from state rolling_back",
    );
    expect(await first).toStrictEqual([]);
    expect(deferred.state).toBe("rolled_back");
    expect(await deferred.rollback()).toStrictEqual([]);
    expect(sourceRollbacks).toBe(1);
  });

  test("return the captured rollback failures only once", async () => {
    scope = { existing: undefined };
    sourceWrite = { receipt: { path: "docs/a.md" } };
    sourceRollbackFailure = new Error("source locked");
    const result = await executeUpsert(
      fact(),
      context({ fs: nodeFilesystem }),
      {
        deferCompiledCommit: true,
      },
    );
    const deferred = result.structuredContent?.deferredCommit as {
      rollback: () => Promise<unknown>;
    };
    expect(await deferred.rollback()).toStrictEqual([
      { step: "authored-source", error: sourceRollbackFailure },
    ]);
    expect(await deferred.rollback()).toStrictEqual([]);
  });

  test("commit the validated entity when no document was written", async () => {
    const result = await executeUpsert(fact(), context(), {
      deferCompiledCommit: true,
    });
    const deferred = result.structuredContent?.deferredCommit as {
      entity: Row;
    };
    expect(deferred.entity).toStrictEqual({
      id: "FACT-a",
      type: "fact",
      title: "A",
    });
    expect("sourceWrites" in (result.structuredContent ?? {})).toBe(false);
    expect("semanticAdvisor" in (result.structuredContent ?? {})).toBe(false);
  });
});
