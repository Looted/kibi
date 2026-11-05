import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  InputError,
  KbRejection,
  OperationError,
} from "../../../src/cli-errors.js";
import * as auditModule from "../../../src/operations/mutation/audit.js";
import {
  assertFilesystemCapableRuntime,
  executeDelete,
  executeRelationshipDelete,
} from "../../../src/operations/mutation/delete.js";
import * as journalModule from "../../../src/operations/mutation/plan-apply-journal.js";
import * as relationshipsModule from "../../../src/operations/mutation/relationships.js";
import * as saveModule from "../../../src/operations/mutation/save.js";
import * as sourceAuthoring from "../../../src/operations/mutation/source-authoring.js";
import type { DeletePayload } from "../../../src/operations/mutation/types.js";
import * as lockModule from "../../../src/operations/mutation/workspace-mutation-lock.js";
import * as applyPlanModule from "../../../src/operations/planning/apply-plan.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import * as shards from "../../../src/relationships/shards.js";
import * as branchResolver from "../../../src/utils/branch-resolver.js";
import { scratch } from "../../operations-coverage/helpers.js";

type Row = Record<string, unknown>;
type Selector = { type: string; from: string; to: string };

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const key = (s: Selector) => `${s.type}\0${s.from}\0${s.to}`;
const LOCK = { lock: "handle" };

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
let root: string;
let goals: string[];
let routes: [string, PrologQueryResult | (() => PrologQueryResult)][];
let events: string[];
let releases: unknown[][];
let settleCalls: { branch: unknown; prolog: unknown }[];
let recoveries: unknown[];
let saves: unknown[][];
let saveFailure: unknown;
let shardFiles: string[];
let shardRecords: () => Row[];
let readShardRecords: Record<string, Row[]>;
let plannedRemovals: (selectors: readonly Selector[]) => {
  bodies: Map<string, string>;
  removals: Row[];
};
let removals: (selectors: readonly Selector[]) => Row[];
let receipts: unknown[][];
let renderCalls: unknown[][];
let relationshipRender: (
  kind: string,
  current: string,
  selector: Selector,
) => { body: string; removed: boolean };
let sourceDeletion: (
  id: string,
  contents: string,
) => { mode: "write" | "delete"; body?: string };
let resolved: unknown;
let applyCalls: unknown[][];
let applyResult: Row;

beforeEach(() => {
  const ws = scratch({ ".kb/.keep": "" }, "kibi-delete-");
  cleanups.push(ws.cleanup);
  root = ws.root;
  goals = [];
  routes = [];
  events = [];
  releases = [];
  settleCalls = [];
  recoveries = [];
  saves = [];
  saveFailure = undefined;
  shardFiles = [];
  shardRecords = () => [];
  readShardRecords = {};
  plannedRemovals = (selectors) => ({
    bodies: new Map(),
    removals: selectors.map((selector) => ({
      selector,
      shardPaths: [],
      sources: [],
      removed: false,
    })),
  });
  removals = (selectors) =>
    selectors.map((selector) => ({
      selector,
      shardPaths: [],
      sources: [],
      removed: false,
    }));
  receipts = [];
  renderCalls = [];
  relationshipRender = (_kind, current) => ({
    body: `${current}-patched`,
    removed: true,
  });
  sourceDeletion = (id, contents) => ({
    mode: "write",
    body: `${contents}-without-${id}`,
  });
  resolved = { error: "not a git repository" };
  applyCalls = [];
  applyResult = {};
  spies.push(
    spyOn(lockModule, "acquireWorkspaceMutationLock").mockImplementation(
      async (workspace) => {
        events.push(`acquire ${workspace === root}`);
        return LOCK as never;
      },
    ),
    spyOn(lockModule, "releaseWorkspaceMutationLock").mockImplementation(
      (...args) => {
        releases.push(args);
      },
    ),
    spyOn(lockModule, "classifySourceMutationFailure").mockImplementation(
      (label, error, committed) =>
        new Error(
          `${label}|${committed}|${error instanceof Error ? error.message : String(error)}`,
        ),
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
    spyOn(saveModule, "saveMutation").mockImplementation(async (...args) => {
      saves.push(["save", ...args.slice(1)]);
      if (saveFailure !== undefined) throw saveFailure;
    }),
    spyOn(saveModule, "saveAtomicMutation").mockImplementation(
      async (...args) => {
        saves.push(["atomic", ...args.slice(1)]);
        if (saveFailure !== undefined) throw saveFailure;
      },
    ),
    spyOn(shards, "listShards").mockImplementation((kbRoot) => {
      events.push(`list ${path.relative(root, kbRoot)}`);
      return [...shardFiles];
    }),
    spyOn(shards, "readAllShards").mockImplementation(
      () => shardRecords() as never,
    ),
    spyOn(shards, "readShard").mockImplementation(
      (shardPath) => (readShardRecords[shardPath] ?? []) as never,
    ),
    spyOn(shards, "renderShardWithout").mockImplementation(
      (original, selectors, shardPath) =>
        `${original}|without ${selectors.map((s) => s.to).join(",")} in ${path.basename(shardPath)}`,
    ),
    spyOn(shards, "planRelationshipShardRemovals").mockImplementation(
      (kbRoot, selectors) => {
        events.push(`plan ${path.relative(root, kbRoot)}`);
        return plannedRemovals(selectors as Selector[]) as never;
      },
    ),
    spyOn(shards, "removeRelationshipsFromShards").mockImplementation(
      (kbRoot, selectors) => {
        events.push(`remove ${path.relative(root, kbRoot)}`);
        return removals(selectors as Selector[]) as never;
      },
    ),
    spyOn(sourceAuthoring, "writePendingSourceReceipt").mockImplementation(
      (...args) => {
        receipts.push(args);
      },
    ),
    spyOn(sourceAuthoring, "renderYamlRelationshipDeletion").mockImplementation(
      (relative, current, selector) => {
        renderCalls.push(["yaml", relative, current, selector]);
        return relationshipRender("yaml", current, selector as Selector);
      },
    ),
    spyOn(
      sourceAuthoring,
      "renderMarkdownRelationshipDeletion",
    ).mockImplementation((relative, current, selector) => {
      renderCalls.push(["markdown", relative, current, selector]);
      return relationshipRender("markdown", current, selector as Selector);
    }),
    spyOn(sourceAuthoring, "renderSourceDeletion").mockImplementation(
      (relative, id, type, contents) => {
        renderCalls.push(["entity", relative, id, type, contents]);
        return sourceDeletion(id, contents);
      },
    ),
    spyOn(auditModule, "buildEntityDeleteAuditGoal").mockImplementation(
      (entity) => `audit(${String(entity.id)})`,
    ),
    spyOn(relationshipsModule, "dependentRelationshipsGoal").mockImplementation(
      (id) => `dependents(${id})`,
    ),
    spyOn(branchResolver, "resolveBranchAttachment").mockImplementation(
      () => resolved as never,
    ),
    spyOn(applyPlanModule, "executeApplyPlan").mockImplementation(
      async (...args) => {
        applyCalls.push(args);
        (args[2] as () => void)();
        return { content: [], structuredContent: applyResult } as never;
      },
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
    for (const [prefix, answer] of routes)
      if (goal.startsWith(prefix))
        return typeof answer === "function" ? answer() : answer;
    return { success: true, bindings: {} };
  },
};

const ok = (bindings: Record<string, string> = {}): PrologQueryResult => ({
  success: true,
  bindings,
});
const failed = (error?: string): PrologQueryResult =>
  ({ success: false, bindings: {}, error }) as PrologQueryResult;

/** The store row loadEntity reads for an entity. */
function entityRow(id: string, type: string, source?: string): void {
  const props = source === undefined ? "" : `source=${JSON.stringify(source)}`;
  routes.push([
    `findall(['${id.replaceAll("'", "''")}'`,
    ok({ Results: `[['${id.replaceAll("'", "''")}',${type},[${props}]]]` }),
  ]);
}

const attachment = (migrationRequired = false) => ({
  gitBranch: "develop",
  kbBranch: migrationRequired ? "legacy" : "develop",
  storePath: path.join(root, ".kb", "branches", "develop"),
  kind: "exact",
  migrationRequired,
});

function recordingFs(
  overrides: Partial<FilesystemPort> = {},
  omit: readonly (keyof FilesystemPort)[] = [],
): { port: FilesystemPort; calls: string[] } {
  const calls: string[] = [];
  const name = (file: string) =>
    path.relative(root, file).replace(/\.kibi-relationship-.*$/, ".tmp");
  const port: FilesystemPort = {
    readFile: async (file) => {
      calls.push(`read ${name(file)}`);
      return (overrides.readFile ?? nodeFilesystem.readFile)(file);
    },
    stat: nodeFilesystem.stat,
    mkdir: async (file) => {
      calls.push(`mkdir ${name(file)}`);
      await nodeFilesystem.mkdir(file);
    },
    writeFile: async (file, data) => {
      calls.push(`write ${name(file)} ${data}`);
      await (overrides.writeFile ?? nodeFilesystem.writeFile)(file, data);
    },
    rename: async (from, to) => {
      calls.push(`rename ${name(from)} ${name(to)}`);
      await (overrides.rename ?? nodeFilesystem.rename)?.(from, to);
    },
    unlink: async (file) => {
      calls.push(`unlink ${name(file)}`);
      await (overrides.unlink ?? nodeFilesystem.unlink)?.(file);
    },
  };
  for (const field of omit) delete (port as Partial<FilesystemPort>)[field];
  return { port, calls };
}

function context(fields: Row = {}): OperationContext {
  return {
    workspaceRoot: root,
    prolog,
    branchAttachment: attachment(),
    ...fields,
  } as unknown as OperationContext;
}

function write(relative: string, body: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, body);
  return absolute;
}
const read = (relative: string) =>
  readFileSync(path.join(root, relative), "utf8");

async function failure(run: Promise<unknown>): Promise<Error> {
  try {
    await run;
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected a failure");
}

const rel = (to: string, from = "SYM-a", type = "implements"): Selector => ({
  type,
  from,
  to,
});
const retractGoal = (s: Selector) =>
  `kb_retract_relationship(${s.type}, '${s.from}', '${s.to}')`;
const liveGoal = (s: Selector) =>
  `once(kb_relationship(${s.type}, '${s.from}', '${s.to}'))`;

describe("relationship delete preflight", () => {
  test("refuses selectors that are not three non-empty strings", async () => {
    for (const relationships of [
      [null],
      ["implements"],
      [["implements", "a", "b"]],
      [{ type: "", from: "a", to: "b" }],
      [{ type: "implements", from: " ", to: "b" }],
      [{ type: "implements", from: "a" }],
      [{ type: "implements", from: "a", to: 7 }],
      [rel("REQ-1"), { type: "implements" }],
    ]) {
      const error = await failure(
        executeDelete({ relationships } as never, context()),
      );
      expect(error).toBeInstanceOf(KbRejection);
      expect((error as KbRejection).code).toBe("VALIDATION_FAILED");
      expect(error.message).toBe(
        "Delete execution failed: Each relationship selector requires non-empty type, from, and to strings",
      );
    }
  });

  test("reports duplicate, unsupported, uninspectable and missing relationships", async () => {
    const duplicate = rel("REQ-1");
    const unsupported = rel("REQ-2", "SYM-a", "likes");
    const broken = rel("REQ-3");
    const silent = rel("REQ-4");
    routes.push([liveGoal(broken), failed("engine down")]);
    routes.push([liveGoal(silent), failed()]);
    const near = [
      { ...silent, type: "covered_by" },
      { ...silent, from: "SYM-b" },
      { ...silent, to: "REQ-5" },
    ];
    shardRecords = () => near;
    const relationships = [duplicate, duplicate, unsupported, broken, silent];
    const expected = {
      deleted: 0,
      relationships_deleted: 0,
      skipped: 4,
      errors: [
        "Duplicate relationship selector: implements SYM-a->REQ-1",
        "Unsupported relationship type 'likes'",
        "Failed to inspect implements SYM-a->REQ-3: engine down",
        "Relationship does not exist: implements SYM-a->REQ-4",
      ],
      error_codes: [
        { code: "duplicate_relationship_selector", selector: duplicate },
        { code: "unsupported_relationship_type", selector: unsupported },
        { code: "relationship_preflight_failed", selector: broken },
        { code: "relationship_not_found", selector: silent },
      ],
      relationship_results: [],
    };
    expect(
      await executeDelete({ relationships } as never, context()),
    ).toStrictEqual({
      content: [{ type: "text", text: "Deleted 0 relationships. Skipped 4." }],
      structuredContent: expected,
    });
    expect(
      await executeDelete({ relationships, dryRun: true } as never, context()),
    ).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Dry run: would delete 0 relationships. Skipped 4. Nothing was written.",
        },
      ],
      structuredContent: {
        ...expected,
        dryRun: true,
        outcome: "dry_run",
        skippedEffects: ["kb-write", "workspace-write"],
      },
    });
    expect(saves).toStrictEqual([]);
  });

  test("accepts a relationship only a shard record proves", async () => {
    const selector = rel("REQ-1");
    routes.push([liveGoal(selector), failed("dangling")]);
    shardRecords = () => [selector];
    const result = await executeRelationshipDelete([selector], context());
    expect(result.errors).toStrictEqual([]);
    expect(result.relationship_results).toStrictEqual([
      {
        ...selector,
        deleted: true,
        shard_records_removed: false,
        compiled_edge_retracted: false,
      },
    ]);
    expect(goals).toStrictEqual([liveGoal(selector)]);
    expect(saves).toStrictEqual([]);
  });

  test("reports shards it cannot read", async () => {
    shardRecords = () => {
      throw new Error("bad yaml");
    };
    expect(
      (await failure(executeRelationshipDelete([rel("REQ-1")], context())))
        .message,
    ).toBe(
      "Relationship deletion preflight failed while reading legacy shards: bad yaml",
    );
    shardRecords = () => {
      throw "raw";
    };
    expect(
      (await failure(executeRelationshipDelete([rel("REQ-1")], context())))
        .message,
    ).toBe(
      "Relationship deletion preflight failed while reading legacy shards: raw",
    );
  });

  test("needs a branch, and a migrated one where storage is attached", async () => {
    expect(
      (
        await failure(
          executeRelationshipDelete(
            [rel("REQ-1")],
            context({ branchAttachment: undefined }),
          ),
        )
      ).message,
    ).toBe("not a git repository");
    resolved = attachment(true);
    const quiet = await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ branchAttachment: undefined }),
    );
    expect(quiet.errors).toStrictEqual([]);
    const message =
      "Delete blocked: migrate legacy branch storage first with 'kibi branch migrate --from legacy --to develop --apply'";
    for (const fields of [
      { branchAttachment: attachment(true) },
      {
        branchAttachment: undefined,
        fs: nodeFilesystem,
        sourceMutationLockHeld: true,
      },
    ]) {
      const error = await failure(
        executeRelationshipDelete([rel("REQ-1")], context(fields)),
      );
      expect(error).toBeInstanceOf(KbRejection);
      expect((error as KbRejection).code).toBe("LEGACY_BRANCH_STORAGE");
      expect(error.message).toBe(message);
    }
    expect(
      (
        await failure(
          executeRelationshipDelete([rel("REQ-1")], {
            workspaceRoot: root,
          } as OperationContext),
        )
      ).message,
    ).toBe("Delete operation requires a Prolog runtime");
  });
});

describe("relationship delete from authored sources", () => {
  test("patches YAML and Markdown sources, chaining patches per file", async () => {
    write("symbols.yaml", "yaml-body");
    write("docs/sym.md", "md-body");
    entityRow("SYM-a", "symbol", "symbols.yaml");
    entityRow("SYM-b", "symbol", "docs/sym.md");
    const first = rel("REQ-1");
    const second = rel("REQ-2");
    const third = rel("REQ-3", "SYM-b");
    const { port, calls } = recordingFs();
    const result = await executeRelationshipDelete(
      [first, second, third],
      context({ fs: port, sourceMutationLockHeld: true }),
    );
    expect(renderCalls).toStrictEqual([
      ["yaml", "symbols.yaml", "yaml-body", first],
      ["yaml", "symbols.yaml", "yaml-body-patched", second],
      ["markdown", "docs/sym.md", "md-body", third],
    ]);
    expect(calls.filter((call) => call.startsWith("read"))).toStrictEqual([
      "read symbols.yaml",
      "read docs/sym.md",
    ]);
    expect(read("symbols.yaml")).toBe("yaml-body-patched-patched");
    expect(read("docs/sym.md")).toBe("md-body-patched");
    expect(result.sourceWrites).toStrictEqual([
      {
        path: "symbols.yaml",
        mode: "write",
        beforeHash: sha("yaml-body"),
        afterHash: sha("yaml-body-patched-patched"),
        created: false,
      },
      {
        path: "docs/sym.md",
        mode: "write",
        beforeHash: sha("md-body"),
        afterHash: sha("md-body-patched"),
        created: false,
      },
    ]);
    expect(receipts).toStrictEqual([
      [root, "symbols.yaml", sha("yaml-body-patched-patched")],
      [root, "docs/sym.md", sha("md-body-patched")],
    ]);
    expect(result.sync_required).toBe(true);
  });

  test("lets a removed source line prove a relationship the store lacks", async () => {
    write("symbols.yml", "body");
    entityRow("SYM-a", "symbol", "symbols.yml");
    const selector = rel("REQ-1");
    routes.push([liveGoal(selector), failed("not live")]);
    const result = await executeRelationshipDelete(
      [selector],
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(result.errors).toStrictEqual([]);
    expect(renderCalls[0]?.[0]).toBe("yaml");
    expect(result.relationships_deleted).toBe(0);
  });

  test("keeps a source the renderer does not change", async () => {
    write("symbols.yaml", "body");
    entityRow("SYM-a", "symbol", "symbols.yaml");
    relationshipRender = (_kind, current) => ({
      body: current,
      removed: false,
    });
    const selector = rel("REQ-1");
    routes.push([liveGoal(selector), failed()]);
    const result = await executeRelationshipDelete(
      [selector],
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(result.errors).toStrictEqual([
      "Relationship does not exist: implements SYM-a->REQ-1",
    ]);
  });

  test("ignores runtime and non-document sources", async () => {
    for (const [id, source] of [
      ["SYM-a", "mcp://symbols.yaml"],
      ["SYM-d", "mcp:\\\\symbols.yaml"],
      ["SYM-e", "docs/a.md.bak"],
      ["SYM-f", "docs/a.ts"],
    ] as const)
      entityRow(id, "symbol", source);
    entityRow("SYM-g", "symbol");
    routes.push([
      "findall(['SYM-h'",
      ok({ Results: "[['SYM-h',symbol,[source=7]]]" }),
    ]);
    const selectors = ["a", "d", "e", "f", "g", "h"].map((s) =>
      rel("REQ-1", `SYM-${s}`),
    );
    const { port, calls } = recordingFs();
    const result = await executeRelationshipDelete(
      selectors,
      context({ fs: port, sourceMutationLockHeld: true }),
    );
    expect(result.errors).toStrictEqual([]);
    expect(renderCalls).toStrictEqual([]);
    expect(calls).toStrictEqual([]);
  });

  test("treats a scheme-like segment past the start as a document path", async () => {
    for (const source of ["docs/x://a.md", "1x://a.md"]) {
      entityRow("SYM-b", "symbol", source);
      expect(
        (
          await failure(
            executeRelationshipDelete(
              [rel("REQ-1", "SYM-b")],
              context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
            ),
          )
        ).message,
      ).toStartWith(
        "Authored Markdown relationship deletion failed for SYM-b:",
      );
      routes.splice(0);
    }
  });

  test("reads no entity without a filesystem", async () => {
    entityRow("SYM-a", "symbol", "symbols.yaml");
    await executeRelationshipDelete([rel("REQ-1")], context());
    expect(goals.some((goal) => goal.startsWith("findall"))).toBe(false);
  });

  test("fails on an authored source it cannot patch and skips unknown entities", async () => {
    write("docs/sym.md", "body");
    entityRow("SYM-a", "symbol", "docs/sym.md");
    relationshipRender = () => {
      throw new Error("no such line");
    };
    expect(
      (
        await failure(
          executeRelationshipDelete(
            [rel("REQ-1")],
            context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
          ),
        )
      ).message,
    ).toBe(
      "Authored Markdown relationship deletion failed for SYM-a: no such line",
    );
    write("symbols.yaml", "body");
    entityRow("SYM-y", "symbol", "symbols.yaml");
    relationshipRender = () => {
      throw "raw";
    };
    expect(
      (
        await failure(
          executeRelationshipDelete(
            [rel("REQ-1", "SYM-y")],
            context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
          ),
        )
      ).message,
    ).toBe("Authored YAML relationship deletion failed for SYM-y: raw");
    routes.push(["findall(['SYM-z'", failed("lookup failed")]);
    const skipped = await executeRelationshipDelete(
      [rel("REQ-1", "SYM-z")],
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(skipped.errors).toStrictEqual([]);
  });

  test("uses the YAML renderer only for a YAML extension", async () => {
    write("docs/a.yaml.md", "body");
    entityRow("SYM-a", "symbol", "docs/a.yaml.md");
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(renderCalls[0]?.[0]).toBe("markdown");
  });
});

describe("relationship delete dry run", () => {
  test("reports the shard and source writes without writing", async () => {
    const changed = write(".kb/rel/a.yaml", "shard-a");
    const same = write(".kb/rel/b.yaml", "shard-b");
    write("symbols.yaml", "yaml");
    entityRow("SYM-s", "symbol", "symbols.yaml");
    const live = rel("REQ-1");
    const dead = rel("REQ-2");
    const sourced = rel("REQ-3", "SYM-s");
    routes.push([liveGoal(dead), failed()]);
    routes.push([liveGoal(sourced), failed()]);
    shardRecords = () => [dead];
    plannedRemovals = (selectors) => ({
      bodies: new Map([
        [changed, "shard-a-after"],
        [same, "shard-b"],
      ]),
      removals: [{ removed: true }, { removed: false }].slice(
        0,
        selectors.length - 1,
      ),
    });
    const result = await executeDelete(
      { relationships: [live, dead, sourced], dryRun: true } as never,
      context({ fs: nodeFilesystem }),
    );
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Dry run: would delete 3 relationships. Skipped 0. Nothing was written.",
        },
      ],
      structuredContent: {
        deleted: 0,
        relationships_deleted: 0,
        skipped: 0,
        errors: [],
        error_codes: [],
        relationship_results: [
          {
            ...live,
            deleted: false,
            shard_records_removed: true,
            compiled_edge_retracted: true,
          },
          {
            ...dead,
            deleted: false,
            shard_records_removed: false,
            compiled_edge_retracted: false,
          },
          {
            ...sourced,
            deleted: false,
            shard_records_removed: false,
            compiled_edge_retracted: false,
          },
        ],
        wouldDelete: { entities: 0, relationships: 3, compiledEdges: 1 },
        sync_required: true,
        sourceWrites: [
          {
            path: ".kb/rel/a.yaml",
            mode: "write",
            beforeHash: sha("shard-a"),
            afterHash: sha("shard-a-after"),
            created: false,
          },
          {
            path: "symbols.yaml",
            mode: "write",
            beforeHash: sha("yaml"),
            afterHash: sha("yaml-patched"),
            created: false,
          },
        ],
        dryRun: true,
        outcome: "dry_run",
        skippedEffects: ["kb-write", "workspace-write"],
      },
    });
    expect(read("symbols.yaml")).toBe("yaml");
    expect(read(".kb/rel/a.yaml")).toBe("shard-a");
    expect(events).toStrictEqual(["acquire true", "plan .kb"]);
    expect(releases).toStrictEqual([[LOCK, undefined, false]]);
    expect(saves).toStrictEqual([]);
  });

  test("needs no sync when nothing would change", async () => {
    const result = await executeRelationshipDelete(
      [rel("REQ-1")],
      context(),
      () => undefined,
      { dryRun: true },
    );
    expect(result.sync_required).toBe(false);
    expect(result.sourceWrites).toStrictEqual([]);
    plannedRemovals = () => ({
      bodies: new Map([[write(".kb/x.yaml", "x"), "y"]]),
      removals: [],
    });
    const shardOnly = await executeRelationshipDelete(
      [rel("REQ-1")],
      context(),
      () => undefined,
      { dryRun: true },
    );
    expect(shardOnly.sync_required).toBe(true);
  });

  test("counts a source-only change as needing a sync", async () => {
    write("symbols.yaml", "yaml");
    entityRow("SYM-a", "symbol", "symbols.yaml");
    const result = await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
      () => undefined,
      { dryRun: true },
    );
    expect(result.sync_required).toBe(true);
  });
});

describe("relationship delete commit", () => {
  test("retracts live edges, saves once and binds changed shards", async () => {
    const a = write(".kb/rel/a.yaml", "a-before");
    const b = write(".kb/rel/b.yaml", "b-same");
    const c = write(".kb/rel/c.yaml", "c-before");
    shardFiles = [a, b, c];
    const live = rel("REQ-1");
    const dead = rel("REQ-2");
    routes.push([liveGoal(dead), failed()]);
    shardRecords = () => [dead];
    removals = () => {
      writeFileSync(a, "a-after");
      rmSync(c);
      return [
        { shardPaths: [a, b], removed: true },
        { shardPaths: [a, c], removed: false },
      ];
    };
    let commits = 0;
    const result = await executeRelationshipDelete(
      [live, dead],
      context(),
      () => {
        commits += 1;
      },
    );
    expect(commits).toBe(1);
    expect(goals).toStrictEqual([
      liveGoal(live),
      liveGoal(dead),
      retractGoal(live),
    ]);
    expect(saves).toStrictEqual([["save", "delete"]]);
    expect(receipts).toStrictEqual([[root, ".kb/rel/a.yaml", sha("a-after")]]);
    expect(result).toStrictEqual({
      deleted: 0,
      relationships_deleted: 1,
      skipped: 0,
      errors: [],
      error_codes: [],
      relationship_results: [
        {
          ...live,
          deleted: true,
          shard_records_removed: true,
          compiled_edge_retracted: true,
        },
        {
          ...dead,
          deleted: true,
          shard_records_removed: false,
          compiled_edge_retracted: false,
        },
      ],
      sync_required: true,
      sourceWrites: [
        {
          path: ".kb/rel/a.yaml",
          mode: "write",
          beforeHash: sha("a-before"),
          afterHash: sha("a-after"),
          created: false,
        },
        {
          path: ".kb/rel/c.yaml",
          mode: "write",
          beforeHash: sha("c-before"),
          afterHash: null,
          created: false,
        },
      ],
    });
  });

  test("hashes a shard that did not exist before as new", async () => {
    const created = path.join(root, ".kb", "rel", "new.yaml");
    removals = () => {
      write(".kb/rel/new.yaml", "new");
      return [{ shardPaths: [created], removed: true }];
    };
    const result = await executeRelationshipDelete([rel("REQ-1")], context());
    expect(result.sourceWrites?.[0]?.beforeHash).toBeNull();
  });

  test("skips the save and the sync when nothing changed", async () => {
    const selector = rel("REQ-1");
    routes.push([liveGoal(selector), failed()]);
    shardRecords = () => [selector];
    removals = () => [{ shardPaths: [], removed: false }];
    const result = await executeDelete(
      { relationships: [selector] } as never,
      context(),
    );
    expect(saves).toStrictEqual([]);
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "Deleted 0 relationships. Skipped 0." }],
      structuredContent: {
        deleted: 0,
        relationships_deleted: 0,
        skipped: 0,
        errors: [],
        error_codes: [],
        relationship_results: [
          {
            ...selector,
            deleted: true,
            shard_records_removed: false,
            compiled_edge_retracted: false,
          },
        ],
        sync_required: false,
      },
    });
  });

  test("tells the caller to sync after a shard change", async () => {
    removals = () => [{ shardPaths: [], removed: true }];
    const result = await executeDelete(
      { relationships: [rel("REQ-1"), rel("REQ-2")] } as never,
      context(),
    );
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Deleted 2 relationships. Skipped 0. Run kibi sync to reconcile the relationship shard.",
      },
    ]);
    expect(
      (result.structuredContent?.relationship_results ?? []).map(
        (row) => row.shard_records_removed,
      ),
    ).toStrictEqual([true, false]);
  });

  test("restores every shard when the shard update fails", async () => {
    const a = write(".kb/rel/a.yaml", "a-before");
    shardFiles = [a];
    removals = () => {
      writeFileSync(a, "half-written");
      throw new Error("rename failed");
    };
    expect(
      (await failure(executeRelationshipDelete([rel("REQ-1")], context())))
        .message,
    ).toBe(
      "Relationship shard update failed before compiled mutation: rename failed",
    );
    expect(read(".kb/rel/a.yaml")).toBe("a-before");
    removals = () => {
      rmSync(a);
      mkdirSync(a);
      throw "raw";
    };
    expect(
      (await failure(executeRelationshipDelete([rel("REQ-1")], context())))
        .message,
    ).toStartWith(
      "reconciliation_required: relationship shard preflight failed and rollback failed (EISDIR",
    );
    rmSync(a, { recursive: true });
    write(".kb/rel/a.yaml", "a-before");
    removals = () => {
      throw "raw";
    };
    expect(
      (await failure(executeRelationshipDelete([rel("REQ-1")], context())))
        .message,
    ).toBe("Relationship shard update failed before compiled mutation: raw");
  });

  test("restores shards and sources when the retraction fails", async () => {
    const a = write(".kb/rel/a.yaml", "a-before");
    const b = write(".kb/rel/b.yaml", "b-before");
    shardFiles = [a, b];
    write("symbols.yaml", "yaml");
    entityRow("SYM-a", "symbol", "symbols.yaml");
    removals = () => {
      writeFileSync(a, "a-after");
      return [{ shardPaths: [a, b, a], removed: true }];
    };
    routes.push(["kb_retract_relationship", failed("retract refused")]);
    let commits = 0;
    const error = await failure(
      executeRelationshipDelete(
        [rel("REQ-1")],
        context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
        () => {
          commits += 1;
        },
      ),
    );
    expect(error.message).toBe(
      `Relationship retraction failed; canonical relationship shards were restored (${a}, ${b}): retract refused`,
    );
    expect(commits).toBe(0);
    expect([read(".kb/rel/a.yaml"), read("symbols.yaml")]).toStrictEqual([
      "a-before",
      "yaml",
    ]);
    routes.unshift(["kb_retract_relationship", failed()]);
    expect(
      (
        await failure(
          executeRelationshipDelete(
            [rel("REQ-1")],
            context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
          ),
        )
      ).message,
    ).toEndWith("): Query failed");
  });

  test("reports a failed save and a failed restore", async () => {
    const a = write(".kb/rel/a.yaml", "a-before");
    shardFiles = [a];
    removals = () => [{ shardPaths: [a], removed: true }];
    saveFailure = "save refused";
    expect(
      (await failure(executeRelationshipDelete([rel("REQ-1")], context())))
        .message,
    ).toBe(
      `Relationship retraction failed; canonical relationship shards were restored (${a}): save refused`,
    );
    saveFailure = new Error("save refused");
    const b = write(".kb/rel/b.yaml", "b-before");
    shardFiles = [a, b];
    removals = () => {
      rmSync(a);
      mkdirSync(a);
      return [{ shardPaths: [a, b], removed: true }];
    };
    expect(
      (await failure(executeRelationshipDelete([rel("REQ-1")], context())))
        .message,
    ).toStartWith(
      `reconciliation_required: compiled relationship retraction failed and shard rollback failed (${a}, ${b}): EISDIR`,
    );
  });

  test("reports a restore that throws a bare value", async () => {
    write("symbols.yaml", "yaml");
    entityRow("SYM-a", "symbol", "symbols.yaml");
    saveFailure = new Error("save refused");
    let writes = 0;
    const { port } = recordingFs({
      writeFile: async (file, data) => {
        writes += 1;
        if (writes > 1) throw "disk gone";
        await nodeFilesystem.writeFile(file, data);
      },
    });
    expect(
      (
        await failure(
          executeRelationshipDelete(
            [rel("REQ-1")],
            context({ fs: port, sourceMutationLockHeld: true }),
          ),
        )
      ).message,
    ).toBe(
      "reconciliation_required: compiled relationship retraction failed and shard rollback failed (): disk gone",
    );
  });
});

describe("relationship source writes", () => {
  test("publish through a temporary file and rename", async () => {
    write("symbols.yaml", "yaml");
    entityRow("SYM-a", "symbol", "symbols.yaml");
    const { port, calls } = recordingFs();
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: port, sourceMutationLockHeld: true }),
    );
    expect(calls).toStrictEqual([
      "read symbols.yaml",
      "mkdir ",
      "write symbols.yaml.tmp yaml-patched",
      "rename symbols.yaml.tmp symbols.yaml",
    ]);
  });

  test("write in place without rename, with or without unlink", async () => {
    write("symbols.yaml", "yaml");
    entityRow("SYM-a", "symbol", "symbols.yaml");
    const direct = recordingFs({}, ["rename"]);
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: direct.port, sourceMutationLockHeld: true }),
    );
    expect(direct.calls.slice(1)).toStrictEqual([
      "mkdir ",
      "write symbols.yaml.tmp yaml-patched",
      "write symbols.yaml yaml-patched",
      "unlink symbols.yaml.tmp",
    ]);
    const bare = recordingFs({}, ["rename", "unlink"]);
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: bare.port, sourceMutationLockHeld: true }),
    );
    expect(read("symbols.yaml")).toBe("yaml-patched-patched");
    const failingUnlink = recordingFs(
      {
        unlink: async () => {
          throw new Error("busy");
        },
      },
      ["rename"],
    );
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: failingUnlink.port, sourceMutationLockHeld: true }),
    );
    expect(read("symbols.yaml")).toBe("yaml-patched-patched-patched");
  });

  test("roll back every source and remove the temporary file on failure", async () => {
    write("a.yaml", "a");
    write("b.yaml", "b");
    entityRow("SYM-a", "symbol", "a.yaml");
    entityRow("SYM-b", "symbol", "b.yaml");
    const failingRename = recordingFs({
      rename: async (from, to) => {
        if (to.endsWith("b.yaml")) throw new Error("rename refused");
        await nodeFilesystem.rename?.(from, to);
      },
    });
    const error = await failure(
      executeRelationshipDelete(
        [rel("REQ-1"), rel("REQ-1", "SYM-b")],
        context({ fs: failingRename.port, sourceMutationLockHeld: true }),
      ),
    );
    expect(error.message).toBe(
      "Relationship source update failed before compiled mutation: rename refused",
    );
    expect(failingRename.calls).toContain("unlink b.yaml.tmp");
    expect([read("a.yaml"), read("b.yaml")]).toStrictEqual(["a", "b"]);
    expect(saves).toStrictEqual([]);
    const unlinkless = recordingFs(
      {
        rename: async () => {
          throw "raw";
        },
      },
      ["unlink"],
    );
    expect(
      (
        await failure(
          executeRelationshipDelete(
            [rel("REQ-1")],
            context({ fs: unlinkless.port, sourceMutationLockHeld: true }),
          ),
        )
      ).message,
    ).toBe("Relationship source update failed before compiled mutation: raw");
    const stubborn = recordingFs({
      rename: async () => {
        throw new Error("rename refused");
      },
      unlink: async () => {
        throw new Error("unlink refused");
      },
    });
    expect(
      (
        await failure(
          executeRelationshipDelete(
            [rel("REQ-1")],
            context({ fs: stubborn.port, sourceMutationLockHeld: true }),
          ),
        )
      ).message,
    ).toBe(
      "Relationship source update failed before compiled mutation: rename refused",
    );
  });
});

describe("relationship delete locking", () => {
  test("holds the workspace lock around a filesystem delete", async () => {
    let commits = 0;
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: nodeFilesystem }),
      () => {
        commits += 1;
      },
    );
    expect(commits).toBe(1);
    expect(events[0]).toBe("acquire true");
    expect(releases).toStrictEqual([[LOCK, undefined, true]]);
  });

  test("releases a dry run as uncommitted", async () => {
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: nodeFilesystem }),
      () => undefined,
      { dryRun: true },
    );
    expect(releases).toStrictEqual([[LOCK, undefined, false]]);
    expect(() => assertFilesystemCapableRuntime(nodeFilesystem)).not.toThrow();
  });

  test("takes no lock without a filesystem or when the caller holds it", async () => {
    await executeRelationshipDelete([rel("REQ-1")], context());
    await executeRelationshipDelete(
      [rel("REQ-1")],
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(events.filter((event) => event.startsWith("acquire"))).toStrictEqual(
      [],
    );
    expect(releases).toStrictEqual([]);
  });

  test("classifies a failure by whether the store committed", async () => {
    shardRecords = () => {
      throw new Error("bad yaml");
    };
    const early = await failure(
      executeRelationshipDelete(
        [rel("REQ-1")],
        context({ fs: nodeFilesystem }),
      ),
    );
    expect(early.message).toBe(
      "Relationship delete|false|Relationship deletion preflight failed while reading legacy shards: bad yaml",
    );
    expect(releases).toStrictEqual([[LOCK, { error: early }, false]]);
    shardRecords = () => [];
    removals = () => {
      throw new Error("never");
    };
    releases = [];
    const late = await failure(
      executeRelationshipDelete(
        [rel("REQ-1")],
        context({ fs: nodeFilesystem }),
        () => {
          throw new Error("after commit");
        },
      ),
    );
    expect(late.message).toStartWith("Relationship delete|false|");
    removals = () => [{ shardPaths: [], removed: true }];
    releases = [];
    const committed = await failure(
      executeRelationshipDelete(
        [rel("REQ-1")],
        context({ fs: nodeFilesystem }),
        () => {
          throw new Error("receipt failed");
        },
      ),
    );
    expect(committed.message).toStartWith("Relationship delete|true|");
    expect(releases).toStrictEqual([[LOCK, { error: committed }, true]]);
  });
});

describe("entity delete input", () => {
  test("needs exactly one of ids and relationships", async () => {
    for (const input of [
      {},
      { ids: [] },
      { ids: ["A"], relationships: [rel("REQ-1")] },
    ]) {
      const error = await failure(executeDelete(input as never, context()));
      expect((error as KbRejection).code).toBe("VALIDATION_FAILED");
      expect(error.message).toBe(
        "Delete execution failed: Delete requires exactly one non-empty input: ids or relationships",
      );
    }
  });

  test("refuses an approval combined with a dry run or relationships", async () => {
    const dry = await failure(
      executeDelete(
        { ids: ["A"], dryRun: true, approvedPlanHash: "x" } as never,
        context(),
      ),
    );
    expect(dry).toBeInstanceOf(InputError);
    expect([
      (dry as InputError).code,
      (dry as InputError).detail,
    ]).toStrictEqual([
      "VALIDATION_FAILED",
      "kb_delete: dryRun and approvedPlanHash cannot be combined. Omit approvedPlanHash to preview the deletion plan, or omit dryRun to apply it.",
    ]);
    const relationships = await failure(
      executeDelete(
        { relationships: [rel("REQ-1")], approvedPlanHash: "x" } as never,
        context(),
      ),
    );
    expect([
      (relationships as InputError).code,
      (relationships as InputError).detail,
    ]).toStrictEqual([
      "VALIDATION_FAILED",
      "kb_delete: approvedPlanHash applies only to an authored-entity deletion plan (ids). Relationship deletes apply directly; use dryRun:true to preview them.",
    ]);
  });

  test("needs a branch, a migrated one where storage is attached, and a store", async () => {
    expect(
      (
        await failure(
          executeDelete(
            { ids: ["A"] } as never,
            context({ branchAttachment: undefined }),
          ),
        )
      ).message,
    ).toBe("Unable to resolve KB branch: not a git repository");
    resolved = attachment(true);
    entityRow("A", "fact");
    await executeDelete(
      { ids: ["A"] } as never,
      context({ branchAttachment: undefined }),
    );
    const message =
      "Delete blocked: KB is attached through legacy branch storage (develop -> legacy). Run 'kibi branch migrate --from legacy --to develop --apply' first.";
    for (const fields of [
      { branchAttachment: attachment(true) },
      {
        branchAttachment: undefined,
        fs: nodeFilesystem,
        sourceMutationLockHeld: true,
      },
    ]) {
      const error = await failure(
        executeDelete({ ids: ["A"] } as never, context(fields)),
      );
      expect((error as KbRejection).code).toBe("LEGACY_BRANCH_STORAGE");
      expect(error.message).toBe(message);
    }
    expect(
      (
        await failure(
          executeDelete(
            { ids: ["A"] } as never,
            {
              workspaceRoot: root,
              branchAttachment: attachment(),
            } as unknown as OperationContext,
          ),
        )
      ).message,
    ).toBe("Delete operation requires a Prolog runtime");
  });
});

describe("direct entity delete", () => {
  test("deletes resolvable runtime entities and reports the rest", async () => {
    routes.push(["once(kb_entity('MISSING'", failed()]);
    routes.push(["dependents(BROKEN)", failed("inspect failed")]);
    routes.push(["dependents(SILENT)", failed()]);
    routes.push(["dependents(USED)", ok({ Dependents: "[[implements,'X']]" })]);
    routes.push(["dependents(", ok({ Dependents: "[]" })]);
    entityRow("RUN-1", "fact", "mcp://runtime");
    entityRow("O'K", "fact");
    const result = await executeDelete(
      {
        ids: ["MISSING", "BROKEN", "SILENT", "USED", "RUN-1", "O'K"],
      } as never,
      context(),
    );
    const errors = [
      "Entity MISSING does not exist",
      "Failed to inspect dependents for entity BROKEN: inspect failed",
      "Failed to inspect dependents for entity SILENT: Query failed",
      "Cannot delete entity USED: has dependents (other entities reference it)",
    ];
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `Deleted 2 entities. Skipped 4. Errors: ${errors.join("; ")}`,
        },
      ],
      structuredContent: { deleted: 2, skipped: 4, errors },
    });
    expect(saves).toStrictEqual([
      ["atomic", ["audit(RUN-1)", "audit(O'K)"], "delete"],
    ]);
    expect(goals).toContain("once(kb_entity('O''K', _, _))");
    expect(goals).toContain(
      "findall(['O''K',Type,Props], kb_entity('O''K', Type, Props), Results)",
    );
  });

  test("treats a missing dependents binding as none", async () => {
    entityRow("RUN-1", "fact");
    const result = await executeDelete({ ids: ["RUN-1"] } as never, context());
    expect(result.structuredContent).toStrictEqual({
      deleted: 1,
      skipped: 0,
      errors: [],
    });
    expect(result.content).toStrictEqual([
      { type: "text", text: "Deleted 1 entities. Skipped 0." },
    ]);
  });

  test("saves without goals when nothing resolved", async () => {
    routes.push(["once(kb_entity(", failed()]);
    await executeDelete({ ids: ["A"] } as never, context());
    expect(saves).toStrictEqual([["save", "delete"]]);
  });

  test("reports entities whose metadata cannot be loaded", async () => {
    routes.push(["findall(['A'", failed("load failed")]);
    routes.push(["findall(['B'", failed()]);
    routes.push(["findall(['C'", ok({ Results: "[]" })]);
    routes.push(["findall(['D'", ok({})]);
    const messages: [string, string | undefined][] = [];
    for (const id of ["A", "B", "C", "D"]) {
      const error = await failure(
        executeDelete({ ids: [id] } as never, context()),
      );
      messages.push([error.message, (error as KbRejection).code]);
    }
    expect(messages).toStrictEqual([
      [
        "Delete execution failed: Failed to load metadata for entity A: load failed",
        undefined,
      ],
      [
        "Delete execution failed: Failed to load metadata for entity B: Unknown error",
        undefined,
      ],
      [
        "Delete execution failed: Failed to load metadata for entity C: Entity not found",
        "ENTITY_NOT_FOUND",
      ],
      [
        "Delete execution failed: Failed to load metadata for entity D: Entity not found",
        "ENTITY_NOT_FOUND",
      ],
    ]);
  });

  test("previews a direct delete", async () => {
    routes.push(["once(kb_entity('GONE'", failed()]);
    routes.push(["once(kb_entity('LOST'", failed()]);
    entityRow("RUN-1", "fact");
    const result = await executeDelete(
      { ids: ["GONE", "LOST", "RUN-1"], dryRun: true } as never,
      context(),
    );
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Dry run: would delete 1 entities. Skipped 2. Nothing was written. Errors: Entity GONE does not exist; Entity LOST does not exist",
        },
      ],
      structuredContent: {
        deleted: 0,
        skipped: 2,
        errors: ["Entity GONE does not exist", "Entity LOST does not exist"],
        wouldDelete: { entities: 1, ids: ["RUN-1"] },
        dryRun: true,
        outcome: "dry_run",
        skippedEffects: ["kb-write", "workspace-write"],
      },
    });
    const clean = await executeDelete(
      { ids: ["RUN-1"], dryRun: true } as never,
      context(),
    );
    expect(clean.content).toStrictEqual([
      {
        type: "text",
        text: "Dry run: would delete 1 entities. Skipped 0. Nothing was written.",
      },
    ]);
    expect(saves).toStrictEqual([]);
  });

  test("refuses an approval when no plan exists", async () => {
    entityRow("RUN-1", "fact");
    entityRow("RUN-2", "fact");
    const error = await failure(
      executeDelete(
        { ids: ["RUN-1", "RUN-2"], approvedPlanHash: "abc" } as never,
        context(),
      ),
    );
    expect([
      (error as InputError).code,
      (error as InputError).detail,
    ]).toStrictEqual([
      "VALIDATION_FAILED",
      "kb_delete: approvedPlanHash was given but RUN-1, RUN-2 produced no authored-entity deletion plan to approve. Omit approvedPlanHash to delete these ids directly.",
    ]);
  });

  test("deletes authored entities directly while a plan is being applied", async () => {
    write("docs/a.md", "doc");
    entityRow("DOC-1", "fact", "docs/a.md");
    const result = await executeDelete(
      { ids: ["DOC-1"], approvedPlanHash: "abc" } as never,
      context({
        fs: nodeFilesystem,
        sourceMutationLockHeld: true,
        sourcePlanApplication: true,
      }),
    );
    expect(result.structuredContent?.deleted).toBe(1);
    expect(saves).toStrictEqual([["atomic", ["audit(DOC-1)"], "delete"]]);
  });

  test("restores the documents it read when the save fails", async () => {
    write("docs/a.md", "doc");
    entityRow("DOC-1", "fact", "docs/a.md");
    saveFailure = new Error("store refused");
    const { port, calls } = recordingFs();
    const error = await failure(
      executeDelete(
        { ids: ["DOC-1"] } as never,
        context({
          fs: port,
          sourceMutationLockHeld: true,
          sourcePlanApplication: true,
        }),
      ),
    );
    expect(error.message).toBe("Delete execution failed: store refused");
    expect(calls).toStrictEqual(["read docs/a.md", "write docs/a.md doc"]);
    expect(releases).toStrictEqual([[undefined, { error }, false]]);
  });
});

describe("authored entity deletion plans", () => {
  const planFor = (body: Row) =>
    ({
      ...body,
      planHash: sha(JSON.stringify(body)),
    }) as unknown as NonNullable<DeletePayload["deletionPlan"]>;

  test("plans one chained write per document and the outgoing shard rows", async () => {
    write("docs/shared.md", "shared");
    write("docs/broken.md", "broken");
    const shardA = write(".kb/rel/a.yaml", "shard-a");
    const shardB = write(".kb/rel/b.yaml", "shard-b");
    shardFiles = [shardA, shardB];
    readShardRecords = {
      [shardA]: [
        { type: "implements", from: "DOC-1", to: "REQ-9", source: "x" },
        { type: "implements", from: "OTHER", to: "REQ-8", source: "x" },
      ],
      [shardB]: [{ type: "implements", from: "OTHER", to: "REQ-7" }],
    };
    entityRow("DOC-1", "fact", "docs/shared.md");
    entityRow("DOC-2", "fact", "docs/shared.md");
    entityRow("DOC-3", "fact", "docs/shared.md");
    entityRow("DOC-4", "fact", "docs/missing.md");
    entityRow("RUN-1", "fact", "mcp://runtime");
    routes.push(["once(kb_entity('GONE'", failed()]);
    sourceDeletion = (id, contents) =>
      id === "DOC-2"
        ? { mode: "delete" }
        : { mode: "write", body: `${contents}-${id}` };
    const result = await executeDelete(
      { ids: ["DOC-1", "DOC-2", "DOC-3", "DOC-4", "RUN-1", "GONE"] } as never,
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    expect(renderCalls).toStrictEqual([
      ["entity", "docs/shared.md", "DOC-1", "fact", "shared"],
      ["entity", "docs/shared.md", "DOC-2", "fact", "shared-DOC-1"],
    ]);
    const body = {
      version: "kibi.entity-deletion-plan.v1",
      entityIds: ["DOC-1", "DOC-2", "DOC-3", "DOC-4"],
      sourceHashes: {
        "docs/shared.md": null,
        "docs/missing.md": null,
        ".kb/rel/a.yaml": sha("shard-a"),
      },
      sourceWrites: [
        {
          path: "docs/shared.md",
          mode: "delete",
          beforeHash: sha("shared"),
          afterHash: null,
        },
        {
          path: ".kb/rel/a.yaml",
          mode: "write",
          beforeHash: sha("shard-a"),
          afterHash: sha("shard-a|without REQ-9 in a.yaml"),
          body: "shard-a|without REQ-9 in a.yaml",
        },
      ],
      supersessionRequired: false,
    };
    const plan = planFor(body);
    const errors = [
      "Entity GONE does not exist",
      "Entity RUN-1 was not deleted: this call returned an authored-entity deletion plan. Delete RUN-1 in a separate kb_delete call.",
    ];
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `Returned deletion plan ${plan.planHash.slice(0, 12)} for DOC-1, DOC-2, DOC-3, DOC-4. Nothing was written; apply it with kb_apply_plan (nextActions[0].input), or call kb_delete again with approvedPlanHash.`,
        },
      ],
      structuredContent: {
        deleted: 0,
        skipped: 6,
        errors,
        outcome: "plan_returned",
        deletionPlan: plan,
        nextActions: [
          {
            operation: "kb_apply_plan",
            input: { plan, approvedPlanHash: plan.planHash },
            reason:
              "Review deletionPlan, then apply it unmodified to delete DOC-1, DOC-2, DOC-3, DOC-4 (or call kb_delete again with the same ids and approvedPlanHash).",
            required: true,
          },
        ],
        skippedEffects: ["kb-write", "workspace-write"],
      },
    });
    expect(events).toContain("list .kb");
    expect(saves).toStrictEqual([]);
  });

  test("keeps the first read body as the plan's before image", async () => {
    write("docs/shared.md", "shared");
    entityRow("DOC-1", "fact", "docs/shared.md");
    entityRow("DOC-2", "fact", "docs/shared.md");
    const { port, calls } = recordingFs();
    const result = await executeDelete(
      { ids: ["DOC-1", "DOC-2"] } as never,
      context({ fs: port, sourceMutationLockHeld: true }),
    );
    expect(calls).toStrictEqual(["read docs/shared.md"]);
    expect(result.structuredContent?.deletionPlan?.sourceWrites).toStrictEqual([
      {
        path: "docs/shared.md",
        mode: "write",
        beforeHash: sha("shared"),
        afterHash: sha("shared-without-DOC-1-without-DOC-2"),
        body: "shared-without-DOC-1-without-DOC-2",
      },
    ]);
  });

  test("returns a supersession action for authored requirements", async () => {
    entityRow("REQ-1", "req", "docs/req1.md");
    entityRow("REQ-2", "req", "docs/req2.md");
    const result = await executeDelete(
      { ids: ["REQ-1", "REQ-2"], dryRun: true } as never,
      context(),
    );
    const plan = planFor({
      version: "kibi.entity-deletion-plan.v1",
      entityIds: ["REQ-1", "REQ-2"],
      sourceHashes: {},
      sourceWrites: [],
      supersessionRequired: true,
    });
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Authored requirements REQ-1, REQ-2 cannot be deleted: supersede them with kb_upsert (supersedes) and close them instead. Nothing was written.",
        },
      ],
      structuredContent: {
        deleted: 0,
        skipped: 2,
        errors: [],
        outcome: "supersession_required",
        deletionPlan: plan,
        nextActions: [
          {
            operation: "kb_upsert",
            input: {
              type: "req",
              id: "<REQ-replacement-id>",
              relationships: [
                {
                  type: "supersedes",
                  from: "<REQ-replacement-id>",
                  to: "REQ-1",
                },
                {
                  type: "supersedes",
                  from: "<REQ-replacement-id>",
                  to: "REQ-2",
                },
              ],
            },
            reason:
              "Authored requirements are not deleted. Upsert a replacement requirement linked with supersedes to REQ-1, REQ-2, then upsert each superseded requirement with status closed.",
            required: true,
          },
        ],
        skippedEffects: ["kb-write", "workspace-write"],
        dryRun: true,
      },
    });
    expect(events).toStrictEqual([]);
    expect(renderCalls).toStrictEqual([]);
  });

  test("applies an approved plan through kb_apply_plan", async () => {
    entityRow("DOC-1", "fact", "docs/a.md");
    const planned = await executeDelete(
      { ids: ["DOC-1"] } as never,
      context({ fs: nodeFilesystem }),
    );
    releases = [];
    const plan = planned.structuredContent?.deletionPlan as Row & {
      planHash: string;
    };
    applyResult = {
      deleted: 1,
      sourcePaths: ["docs/a.md"],
      recoveryJournalId: "plan-apply-x",
    };
    const result = await executeDelete(
      {
        ids: ["DOC-1"],
        approvedPlanHash: plan.planHash.toUpperCase(),
      } as never,
      context({ fs: nodeFilesystem }),
    );
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `Applied deletion plan ${plan.planHash.slice(0, 12)}: deleted 1 entities.`,
        },
      ],
      structuredContent: {
        deleted: 1,
        skipped: 0,
        errors: [],
        outcome: "plan_applied",
        planHash: plan.planHash,
        sourcePaths: ["docs/a.md"],
        recoveryJournalId: "plan-apply-x",
      },
    });
    const [input, applyContext] = applyCalls[0] as [Row, Row];
    expect(input).toStrictEqual({ plan, approvedPlanHash: plan.planHash });
    expect([
      applyContext.sourceMutationLockHeld,
      applyContext.prolog,
      applyContext.workspaceRoot,
      applyContext.branchAttachment,
    ]).toStrictEqual([true, prolog, root, attachment()]);
    expect(releases).toStrictEqual([[LOCK, undefined, true]]);
  });

  test("reports an applied plan that needs repairs or deleted nothing", async () => {
    entityRow("DOC-1", "fact", "docs/a.md");
    entityRow("DOC-2", "fact", "docs/b.md");
    const planned = await executeDelete(
      { ids: ["DOC-1", "DOC-2"] } as never,
      context(),
    );
    const planHash = String(planned.structuredContent?.deletionPlan?.planHash);
    applyResult = {
      deleted: 1,
      status: "committed_with_repairs",
      nextActions: [{ operation: "kb_check" }],
    };
    const repaired = await executeDelete(
      { ids: ["DOC-1", "DOC-2"], approvedPlanHash: planHash } as never,
      context(),
    );
    expect(repaired.structuredContent).toMatchObject({
      deleted: 1,
      skipped: 1,
      status: "committed_with_repairs",
      nextActions: [{ operation: "kb_check" }],
    });
    expect(repaired.content).toStrictEqual([
      {
        type: "text",
        text: `Applied deletion plan ${planHash.slice(0, 12)}: deleted 1 entities. Compiled retraction needs repair; follow nextActions.`,
      },
    ]);
    applyResult = { deleted: "2", status: "committed" };
    const odd = await executeDelete(
      { ids: ["DOC-1", "DOC-2"], approvedPlanHash: planHash } as never,
      context(),
    );
    expect(odd.structuredContent).toStrictEqual({
      deleted: 0,
      skipped: 2,
      errors: [],
      outcome: "plan_applied",
      planHash,
      sourcePaths: undefined,
      recoveryJournalId: undefined,
    });
  });

  test("refuses a stale, supersession or partial approval", async () => {
    entityRow("DOC-1", "fact", "docs/a.md");
    entityRow("DOC-2", "fact", "docs/b.md");
    const stale = await failure(
      executeDelete(
        {
          ids: ["DOC-1", "DOC-2"],
          approvedPlanHash: "0123456789abcdef",
        } as never,
        context(),
      ),
    );
    const planned = await executeDelete(
      { ids: ["DOC-1", "DOC-2"] } as never,
      context(),
    );
    const planHash = String(planned.structuredContent?.deletionPlan?.planHash);
    expect([
      (stale as InputError).code,
      (stale as InputError).detail,
    ]).toStrictEqual([
      "DELETE_PLAN_HASH_MISMATCH",
      `kb_delete: approvedPlanHash 0123456789ab does not match the current deletion plan ${planHash.slice(0, 12)} for DOC-1, DOC-2. The ids or their sources changed since that plan was returned. Call kb_delete without approvedPlanHash, review the new plan, and approve its planHash. Nothing was written.`,
    ]);
    entityRow("REQ-1", "req", "docs/r.md");
    const reqPlan = await executeDelete({ ids: ["REQ-1"] } as never, context());
    const supersession = await failure(
      executeDelete(
        {
          ids: ["REQ-1"],
          approvedPlanHash: reqPlan.structuredContent?.deletionPlan?.planHash,
        } as never,
        context(),
      ),
    );
    expect([
      (supersession as InputError).code,
      (supersession as InputError).detail,
    ]).toStrictEqual([
      "REQUIREMENT_SUPERSESSION_REQUIRED",
      "kb_delete: authored requirements evolve through a new requirement linked with supersedes; a deletion plan that requires supersession cannot be approved. Nothing was written.",
    ]);
    routes.push(["once(kb_entity('GONE'", failed()]);
    routes.push(["once(kb_entity('ALSO'", failed()]);
    const partialPlan = await executeDelete(
      { ids: ["DOC-1", "GONE", "ALSO"] } as never,
      context(),
    );
    const partial = await failure(
      executeDelete(
        {
          ids: ["DOC-1", "GONE", "ALSO"],
          approvedPlanHash:
            partialPlan.structuredContent?.deletionPlan?.planHash,
        } as never,
        context(),
      ),
    );
    expect([
      (partial as InputError).code,
      (partial as InputError).detail,
    ]).toStrictEqual([
      "VALIDATION_FAILED",
      "kb_delete: approvedPlanHash applies a plan only when every requested id is in it. Remove or fix: Entity GONE does not exist; Entity ALSO does not exist Nothing was written.",
    ]);
    expect(applyCalls).toStrictEqual([]);
  });
});

describe("entity delete locking and recovery", () => {
  test("settles pending plans under the lock and reports them", async () => {
    recoveries = [
      { action: "none", detail: "quiet" },
      { action: "rolled_back", detail: "Rolled back one." },
      { action: "completed", detail: "Completed two." },
    ];
    entityRow("RUN-1", "fact");
    const result = await executeDelete(
      { ids: ["RUN-1"] } as never,
      context({ fs: nodeFilesystem }),
    );
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Deleted 1 entities. Skipped 0. Rolled back one. Completed two.",
      },
    ]);
    expect(settleCalls).toStrictEqual([{ branch: attachment(), prolog }]);
    expect(events[0]).toBe("acquire true");
    expect(releases).toStrictEqual([[LOCK, undefined, true]]);
  });

  test("settles against the resolved branch when the context has none", async () => {
    resolved = attachment();
    entityRow("RUN-1", "fact");
    await executeDelete(
      { ids: ["RUN-1"] } as never,
      context({ fs: nodeFilesystem, branchAttachment: undefined }),
    );
    expect(settleCalls[0]?.branch).toStrictEqual(attachment());
  });

  test("adds settled notes to every kind of failure", async () => {
    recoveries = [{ action: "completed", detail: "Completed two." }];
    const typed = await failure(
      executeDelete(
        { ids: ["A"], dryRun: true, approvedPlanHash: "x" } as never,
        context({ fs: nodeFilesystem }),
      ),
    );
    expect(typed).toBeInstanceOf(InputError);
    expect((typed as InputError).detail).toEndWith(
      " [settled before this failure: Completed two.]",
    );
    expect(releases).toStrictEqual([[LOCK, { error: typed }, false]]);
    releases = [];
    const operation = new OperationError("ENGINE_DOWN", "engine down", true);
    routes.push([
      "once(kb_entity(",
      () => {
        throw operation;
      },
    ]);
    const raised = await failure(
      executeDelete({ ids: ["A"] } as never, context({ fs: nodeFilesystem })),
    );
    expect([
      raised instanceof OperationError,
      (raised as OperationError).detail,
    ]).toStrictEqual([
      true,
      "engine down [settled before this failure: Completed two.]",
    ]);
    expect(releases).toStrictEqual([[LOCK, { error: raised }, false]]);
    routes.splice(0);
    releases = [];
    saveFailure = new Error("store refused");
    entityRow("RUN-1", "fact");
    const generic = await failure(
      executeDelete(
        { ids: ["RUN-1"] } as never,
        context({ fs: nodeFilesystem }),
      ),
    );
    expect(generic.message).toBe(
      "Delete execution failed: store refused [settled before this failure: Completed two.]",
    );
    expect(releases).toStrictEqual([[LOCK, { error: generic }, false]]);
  });

  test("classifies a failure after the commit as committed", async () => {
    entityRow("DOC-1", "fact", "docs/a.md");
    const planned = await executeDelete(
      { ids: ["DOC-1"] } as never,
      context({ fs: nodeFilesystem }),
    );
    releases = [];
    applyResult = { deleted: 1 };
    const original = applyPlanModule.executeApplyPlan;
    spies.push(
      spyOn(applyPlanModule, "executeApplyPlan").mockImplementation(
        async (_input, _context, onCommitted) => {
          onCommitted?.();
          throw new Error("receipts failed");
        },
      ),
    );
    expect(original).toBeDefined();
    const error = await failure(
      executeDelete(
        {
          ids: ["DOC-1"],
          approvedPlanHash: planned.structuredContent?.deletionPlan?.planHash,
        } as never,
        context({ fs: nodeFilesystem }),
      ),
    );
    expect(error.message).toBe("Delete|true|receipts failed");
    expect(releases).toStrictEqual([[LOCK, { error }, true]]);
  });

  test("takes no lock when the caller holds it or without a filesystem", async () => {
    entityRow("RUN-1", "fact");
    await executeDelete(
      { ids: ["RUN-1"] } as never,
      context({ fs: nodeFilesystem, sourceMutationLockHeld: true }),
    );
    await executeDelete({ ids: ["RUN-1"] } as never, context());
    expect(settleCalls).toStrictEqual([]);
    expect(releases).toStrictEqual([
      [undefined, undefined, true],
      [undefined, undefined, true],
    ]);
  });

  test("passes the relationship commit through to the lock release", async () => {
    const result = await executeDelete(
      { relationships: [rel("REQ-1")] } as never,
      context({ fs: nodeFilesystem }),
    );
    expect(result.structuredContent?.relationships_deleted).toBe(1);
    expect(releases).toStrictEqual([[LOCK, undefined, true]]);
    expect(events.filter((e) => e.startsWith("acquire"))).toHaveLength(1);
    releases = [];
    await executeDelete(
      { relationships: [rel("REQ-1")], dryRun: true } as never,
      context({ fs: nodeFilesystem }),
    );
    expect(releases).toStrictEqual([[LOCK, undefined, false]]);
  });
});
