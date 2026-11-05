import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { InputError, OperationError } from "../../../src/cli-errors.js";
import {
  PLAN_APPLY_JOURNAL_VERSION,
  type PlanApplyFileWrite,
  type PlanApplyJournal,
  type PlanApplyJournalHandle,
  contentHash,
  createPlanApplyJournal,
  isPlanApplyJournalId,
  openPlanApplyJournal,
  openPlanApplyJournalById,
  planApplyJournalId,
  planRecoveryNotes,
  publishJournaledFiles,
  publishWorkspaceFile,
  reconcilePendingSourceReceipts,
  recordPlanApplyJournal,
  recoverPendingPlanApplyJournals,
  recoverPlanApplyJournal,
  restoreJournaledFiles,
  settlePendingPlanApplyJournals,
  storeFingerprint,
  withPlanRecoveryNotes,
} from "../../../src/operations/mutation/plan-apply-journal.js";
import { RELATIONSHIP_TYPES } from "../../../src/operations/mutation/relationships.js";
import { writePendingSourceReceipt } from "../../../src/operations/mutation/source-authoring.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import { scratch } from "../../operations-coverage/helpers.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const hashA = "a".repeat(64);
const idA = planApplyJournalId(hashA);

type Workspace = Readonly<{
  root: string;
  storePath: string;
  storeJournals: string;
  fallbackJournals: string;
  context: OperationContext;
  read: (relative: string) => string | null;
  write: (relative: string, body: string) => void;
}>;

function workspace(
  options: { storeReady?: boolean; fields?: Record<string, unknown> } = {},
): Workspace {
  const ws = scratch({ ".kb/.keep": "" }, "kibi-journal-");
  cleanups.push(ws.cleanup);
  const storePath = path.join(ws.root, ".kb", "branches", "develop-store");
  if (options.storeReady) {
    mkdirSync(storePath, { recursive: true });
    writeFileSync(path.join(storePath, "branch.json"), "{}");
  }
  return {
    root: ws.root,
    storePath,
    storeJournals: path.join(storePath, "plan-apply"),
    fallbackJournals: path.join(
      ws.root,
      ".kb",
      "recovery",
      "plan-apply",
      sha("develop"),
    ),
    context: {
      workspaceRoot: ws.root,
      fs: nodeFilesystem,
      branchAttachment: {
        gitBranch: "develop",
        kbBranch: "develop",
        storePath,
        kind: "exact",
        migrationRequired: false,
      },
      ...options.fields,
    } as unknown as OperationContext,
    read: (relative) => {
      const absolute = path.join(ws.root, relative);
      return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
    },
    write: (relative, body) => {
      ws.write(relative, body);
    },
  };
}

const detachedContext = (root: string) =>
  ({
    workspaceRoot: root,
    fs: nodeFilesystem,
    branchAttachment: { error: "detached", code: "DETACHED_HEAD" },
  }) as unknown as OperationContext;

function fileWrite(
  file: string,
  before: string | null,
  after: string | null,
  origin: PlanApplyFileWrite["origin"] = "plan",
): PlanApplyFileWrite {
  return {
    path: file,
    origin,
    mode: after === null ? "delete" : "write",
    beforeHash: before === null ? null : contentHash(before),
    afterHash: after === null ? null : contentHash(after),
    before,
    after,
  };
}

function journal(
  state: PlanApplyJournal["state"],
  fields: Partial<PlanApplyJournal> = {},
  planHash = hashA,
): PlanApplyJournal {
  return {
    version: PLAN_APPLY_JOURNAL_VERSION,
    journalId: planApplyJournalId(planHash),
    planHash,
    branch: "develop",
    state,
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
    files: [],
    store: {
      entityIds: ["REQ-1"],
      preCommitFingerprint: "f".repeat(64),
      entries: [
        {
          entity: { id: "REQ-1" },
          relationships: [],
          skipContradictionCheck: false,
        },
      ],
    },
    summary: {
      planPaths: [],
      filePaths: [],
      changedEntities: 1,
      changedRelationships: 0,
    },
    ...fields,
  };
}

function storeJournal(ws: Workspace, record: unknown, id = idA): string {
  const target = path.join(ws.fallbackJournals, `${id}.json`);
  mkdirSync(ws.fallbackJournals, { recursive: true });
  writeFileSync(target, JSON.stringify(record));
  return target;
}

const readJournal = (file: string) =>
  JSON.parse(readFileSync(file, "utf8")) as PlanApplyJournal;

function recordingPort(
  root: string,
  overrides: Partial<FilesystemPort> = {},
  omit: readonly (keyof FilesystemPort)[] = [],
): { port: FilesystemPort; calls: string[]; staged: string[] } {
  const calls: string[] = [];
  const staged: string[] = [];
  const name = (file: string) => {
    if (/\.kibi-stage-/.test(file)) staged.push(file);
    return path.relative(root, file).replace(/\.kibi-stage-.*$/, ".stage");
  };
  const base: FilesystemPort = {
    readFile: (file) => nodeFilesystem.readFile(file),
    stat: (file) => nodeFilesystem.stat(file),
    mkdir: async (file) => {
      calls.push(`mkdir ${name(file)}`);
      await (overrides.mkdir ?? nodeFilesystem.mkdir)(file);
    },
    writeFile: async (file, data) => {
      calls.push(`write ${name(file)}`);
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
    fsync: async (file) => {
      calls.push(`fsync ${name(file)}`);
      await (overrides.fsync ?? nodeFilesystem.fsync)?.(file);
    },
  };
  for (const key of omit) delete (base as Partial<FilesystemPort>)[key];
  return { port: base, calls, staged };
}

function fingerprintProlog(answers: string[]): {
  prolog: PrologPort;
  goals: string[];
} {
  const goals: string[] = [];
  return {
    goals,
    prolog: {
      query: async (goal: string) => {
        goals.push(goal);
        return {
          success: true,
          bindings: { FingerprintHash: answers.shift() ?? "" },
        };
      },
    } as unknown as PrologPort,
  };
}

describe("journal ids and hashes", () => {
  test("derive the id from the first sixteen hash characters, lower-cased", () => {
    expect(planApplyJournalId(`ABCDEF0123456789${"f".repeat(48)}`)).toBe(
      "plan-apply-abcdef0123456789",
    );
    expect(isPlanApplyJournalId("plan-apply-abcdef0123456789")).toBe(true);
    for (const value of [
      "plan-apply-abcdef012345678",
      "plan-apply-abcdef0123456789a",
      "xplan-apply-abcdef0123456789",
      "plan-apply-ABCDEF0123456789",
    ])
      expect(isPlanApplyJournalId(value)).toBe(false);
    expect(contentHash("bytes")).toBe(sha("bytes"));
    expect(PLAN_APPLY_JOURNAL_VERSION).toBe("kibi.plan-apply-journal.v1");
  });
});

describe("journal location", () => {
  test("uses the branch-keyed recovery directory until the store exists", () => {
    const ws = workspace();
    expect(openPlanApplyJournal(ws.context, hashA)).toStrictEqual({
      journalId: idA,
      journalPath: path.join(ws.fallbackJournals, `${idA}.json`),
      branch: "develop",
      existing: null,
    });
    mkdirSync(ws.storePath, { recursive: true });
    expect(openPlanApplyJournal(ws.context, hashA).journalPath).toBe(
      path.join(ws.fallbackJournals, `${idA}.json`),
    );
  });

  test("treats a store path that is a file as no store", () => {
    const ws = workspace();
    mkdirSync(path.dirname(ws.storePath), { recursive: true });
    writeFileSync(ws.storePath, "not a directory");
    expect(openPlanApplyJournal(ws.context, hashA).journalPath).toBe(
      path.join(ws.fallbackJournals, `${idA}.json`),
    );
  });

  test("uses the store directory once the store manifest exists", () => {
    const ws = workspace({ storeReady: true });
    expect(openPlanApplyJournal(ws.context, hashA).journalPath).toBe(
      path.join(ws.storeJournals, `${idA}.json`),
    );
  });

  test("finds an existing journal in either directory, the store's first", () => {
    const ws = workspace({ storeReady: true });
    const fallback = storeJournal(ws, journal("committed", { files: [] }));
    expect(openPlanApplyJournal(ws.context, hashA)).toStrictEqual({
      journalId: idA,
      journalPath: fallback,
      branch: "develop",
      existing: journal("committed"),
    });
    mkdirSync(ws.storeJournals, { recursive: true });
    const primary = path.join(ws.storeJournals, `${idA}.json`);
    writeFileSync(
      primary,
      JSON.stringify(journal("rolled_back", { branch: "primary" })),
    );
    const opened = openPlanApplyJournal(ws.context, hashA);
    expect(opened.journalPath).toBe(primary);
    expect(opened.existing?.branch).toBe("primary");
    expect(openPlanApplyJournalById(ws.context, idA)).toStrictEqual({
      journalPath: primary,
      journal: journal("rolled_back", { branch: "primary" }),
    });
  });

  test("resolves the branch from the workspace when the context has none", () => {
    const ws = workspace();
    const saved = process.env.KIBI_BRANCH;
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    try {
      const { branchAttachment: _branch, ...context } = ws.context;
      expect(() =>
        openPlanApplyJournal(context as OperationContext, hashA),
      ).toThrow(
        "Apply plan failed before any write: the KB branch could not be resolved for the plan journal",
      );
    } finally {
      if (saved === undefined)
        Reflect.deleteProperty(process.env, "KIBI_BRANCH");
      else process.env.KIBI_BRANCH = saved;
    }
  });
});

describe("journal records", () => {
  test("are published whole, private and without temporary files", () => {
    const ws = workspace();
    const { journalPath } = openPlanApplyJournal(ws.context, hashA);
    const record = journal("prepared", {
      files: [fileWrite("docs/a.md", null, "A")],
    });
    const handle = createPlanApplyJournal(journalPath, record);
    expect(handle).toStrictEqual({ journalPath, journal: record });
    expect(readFileSync(journalPath, "utf8")).toBe(
      `${JSON.stringify(record, null, 2)}\n`,
    );
    expect(statSync(journalPath).mode & 0o777).toBe(0o600);
    expect(statSync(ws.fallbackJournals).mode & 0o777).toBe(0o700);
    expect(readdirSync(ws.fallbackJournals)).toStrictEqual([`${idA}.json`]);
  });

  test("remove the temporary file when the rename fails", () => {
    const ws = workspace();
    const target = path.join(ws.fallbackJournals, `${idA}.json`);
    mkdirSync(path.join(target, "occupied"), { recursive: true });
    expect(() => createPlanApplyJournal(target, journal("prepared"))).toThrow();
    expect(readdirSync(ws.fallbackJournals)).toStrictEqual([`${idA}.json`]);
  });

  test("keep their payload until a terminal state compacts it", () => {
    const ws = workspace();
    const { journalPath } = openPlanApplyJournal(ws.context, hashA);
    const files = [fileWrite("docs/a.md", null, "A")];
    const handle: PlanApplyJournalHandle = createPlanApplyJournal(
      journalPath,
      journal("prepared", { files }),
    );
    recordPlanApplyJournal(
      handle,
      { state: "store_committing" },
      new Date("2026-09-06T00:00:00Z"),
    );
    const committing = journal("store_committing", {
      files,
      updatedAt: "2026-09-06T00:00:00.000Z",
    });
    expect(handle.journal).toStrictEqual(committing);
    expect(readJournal(journalPath)).toStrictEqual(committing);
    const resolution = {
      action: "completed",
      by: "apply",
      detail: "done",
    } as const;
    recordPlanApplyJournal(
      handle,
      { state: "committed", resolution },
      new Date("2026-09-07T00:00:00Z"),
    );
    const committed = journal("committed", {
      updatedAt: "2026-09-07T00:00:00.000Z",
      resolution,
      store: { ...journal("prepared").store, entries: [] },
    });
    expect(handle.journal).toStrictEqual(committed);
    expect(readJournal(journalPath)).toStrictEqual(committed);
    recordPlanApplyJournal(
      { journalPath, journal: journal("prepared", { files }) },
      { state: "rolled_back" },
      new Date("2026-09-08T00:00:00Z"),
    );
    expect(readJournal(journalPath).files).toStrictEqual([]);
    const before = Date.now();
    recordPlanApplyJournal(handle, {});
    const stamped = Date.parse(handle.journal.updatedAt);
    expect(stamped).toBeGreaterThanOrEqual(before - 1000);
    expect(stamped).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe("journal parsing", () => {
  const invalid = (ws: Workspace, record: unknown, id = idA) => {
    const target = storeJournal(ws, record, id);
    expect(() => openPlanApplyJournalById(ws.context, id)).toThrow(
      `Plan application journal ${target} cannot be recovered automatically: invalid (journal fields are missing or inconsistent). Kibi will not apply or recover plans on this branch until it is resolved`,
    );
  };

  test("accepts every state and every file shape", () => {
    const ws = workspace();
    const files = [
      fileWrite("docs/new.md", null, "new", "entity-document"),
      fileWrite("docs/old.md", "old", null, "relationship-shard"),
      fileWrite("docs/edit.md", "a", "b"),
    ];
    for (const state of [
      "prepared",
      "store_committing",
      "store_committed",
    ] as const) {
      const record = journal(state, { files });
      storeJournal(ws, record);
      expect(openPlanApplyJournalById(ws.context, idA).journal).toStrictEqual(
        record,
      );
    }
    for (const state of ["committed", "rolled_back"] as const) {
      const record = journal(state, {
        store: { ...journal(state).store, entries: [] },
      });
      storeJournal(ws, record);
      expect(openPlanApplyJournalById(ws.context, idA).journal).toStrictEqual(
        record,
      );
    }
  });

  test("refuses inconsistent journal fields", () => {
    const ws = workspace();
    const base = journal("prepared");
    const broken: unknown[] = [
      { ...base, version: "kibi.plan-apply-journal.v0" },
      { ...base, journalId: planApplyJournalId("b".repeat(64)) },
      { ...base, planHash: `${"a".repeat(63)}g` },
      { ...base, planHash: `${"a".repeat(64)}a` },
      { ...base, planHash: `a${"b".repeat(63)}` },
      { ...base, branch: 7 },
      { ...base, state: "applied" },
      { ...base, files: {} },
      { ...base, store: undefined },
      { ...base, store: { ...base.store, entityIds: "REQ-1" } },
      { ...base, store: { ...base.store, entityIds: ["REQ-1", 2] } },
      { ...base, store: { ...base.store, preCommitFingerprint: 1 } },
      { ...base, store: { ...base.store, entries: {} } },
      { ...base, store: { ...base.store, entries: [] } },
      {
        ...base,
        state: "store_committed",
        store: { ...base.store, entries: [] },
      },
      { ...base, summary: undefined },
    ];
    for (const record of broken) invalid(ws, record);
  });

  test("refuses a planHash that is not a string", () => {
    const ws = workspace();
    invalid(ws, { ...journal("prepared"), planHash: 7 });
    invalid(ws, { ...journal("prepared"), planHash: [hashA] });
  });

  test("refuses file records whose bytes and hashes disagree", () => {
    const ws = workspace();
    const good = fileWrite("docs/a.md", "a", "b");
    const broken: unknown[] = [
      null,
      "docs/a.md",
      { ...good, path: 7 },
      { ...good, path: "" },
      { ...good, path: "/abs/a.md" },
      { ...good, path: "docs/../a.md" },
      { ...good, path: "docs\\..\\a.md" },
      { ...good, origin: "other" },
      { ...good, mode: "move" },
      { ...good, beforeHash: contentHash("x") },
      { ...good, before: 7 },
      { ...good, before: null },
      { ...good, after: 7 },
      { ...good, afterHash: contentHash("x") },
      { ...good, after: null },
      { ...good, mode: "delete" },
      { ...fileWrite("docs/a.md", "a", null), mode: "write" },
      { ...fileWrite("docs/a.md", "a", null), afterHash: contentHash("") },
    ];
    for (const entry of broken)
      invalid(ws, journal("prepared", { files: [good, entry as never] }));
    const nullBefore = fileWrite("docs/a.md", null, "b");
    invalid(
      ws,
      journal("prepared", {
        files: [{ ...nullBefore, beforeHash: contentHash("") }],
      }),
    );
  });

  test("refuses unreadable and unparseable journals", () => {
    const ws = workspace();
    const target = path.join(ws.fallbackJournals, `${idA}.json`);
    mkdirSync(target, { recursive: true });
    expect(() => openPlanApplyJournalById(ws.context, idA)).toThrow(
      /^Plan application journal .* cannot be recovered automatically: unreadable \(EISDIR/,
    );
    const other = planApplyJournalId("b".repeat(64));
    storeJournal(ws, journal("prepared"), other);
    writeFileSync(path.join(ws.fallbackJournals, `${other}.json`), "{");
    let thrown: unknown;
    try {
      openPlanApplyJournalById(ws.context, other);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(OperationError);
    expect((thrown as OperationError).code).toBe(
      "PARTIAL_COMMIT_REPAIR_REQUIRED",
    );
    expect((thrown as OperationError).retryable).toBe(false);
    expect((thrown as OperationError).detail).toStartWith(
      `Plan application journal ${path.join(ws.fallbackJournals, `${other}.json`)} cannot be recovered automatically: invalid (JSON Parse error`,
    );
    expect((thrown as OperationError).detail).toEndWith(
      "). Kibi will not apply or recover plans on this branch until it is resolved: restore each listed file to its journaled before or after bytes and retry, or reconcile the workspace and branch store by hand (kibi sync) and remove the journal",
    );
  });

  test("opening by id needs a valid id, a branch and an existing journal", () => {
    const ws = workspace();
    expect(() => openPlanApplyJournalById(ws.context, "plan-apply-x")).toThrow(
      "Plan journal ID is invalid",
    );
    expect(() =>
      openPlanApplyJournalById(detachedContext(ws.root), idA),
    ).toThrow(
      "Plan journal recovery failed: the KB branch could not be resolved",
    );
    expect(() => openPlanApplyJournalById(ws.context, idA)).toThrow(
      `Plan journal ${idA} does not exist for branch develop`,
    );
    expect(() => openPlanApplyJournal(detachedContext(ws.root), hashA)).toThrow(
      "Apply plan failed before any write: the KB branch could not be resolved for the plan journal",
    );
  });
});

describe("pending source receipts", () => {
  const receipts = (root: string) => {
    const directory = path.join(root, ".kb", "recovery", "pending-sources");
    return existsSync(directory)
      ? readdirSync(directory).map(
          (name) =>
            JSON.parse(readFileSync(path.join(directory, name), "utf8")) as {
              path: string;
              afterHash: string;
            },
        )
      : [];
  };

  test("bind written files and retire deleted ones", () => {
    const ws = workspace();
    writePendingSourceReceipt(ws.root, "docs/gone.md", "1".repeat(64));
    reconcilePendingSourceReceipts(ws.root, [
      { path: "docs/a.md", afterHash: "2".repeat(64) },
      { path: "docs/b.md", mode: "write", afterHash: null },
      { path: "docs/gone.md", mode: "delete", afterHash: null },
    ]);
    expect(
      receipts(ws.root).map((receipt) => [receipt.path, receipt.afterHash]),
    ).toStrictEqual([["docs/a.md", "2".repeat(64)]]);
    reconcilePendingSourceReceipts(ws.root, [
      { path: "docs/a.md", mode: "write", afterHash: "3".repeat(64) },
    ]);
    expect(receipts(ws.root).map((receipt) => receipt.afterHash)).toStrictEqual(
      ["3".repeat(64)],
    );
  });
});

describe("publishing workspace files", () => {
  test("stages, syncs and renames on a capable port", async () => {
    const ws = workspace();
    const { port, calls, staged } = recordingPort(ws.root);
    await publishWorkspaceFile(port, path.join(ws.root, "docs/a.md"), "A");
    expect(calls).toStrictEqual([
      "mkdir docs",
      "write docs/a.md.stage",
      "fsync docs/a.md.stage",
      "rename docs/a.md.stage docs/a.md",
      "fsync docs",
    ]);
    expect(staged[0]).toMatch(
      new RegExp(
        `^${path.join(ws.root, "docs/a.md").replaceAll(".", "\\.")}\\.kibi-stage-${process.pid}-[0-9a-f-]{36}$`,
      ),
    );
    expect(ws.read("docs/a.md")).toBe("A");
  });

  test("writes in place without rename and skips syncs without fsync", async () => {
    const ws = workspace();
    const direct = recordingPort(ws.root, {}, ["rename"]);
    await publishWorkspaceFile(direct.port, path.join(ws.root, "a.md"), "A");
    expect(direct.calls).toStrictEqual([
      "mkdir ",
      "write a.md",
      "fsync a.md",
      "fsync ",
    ]);
    const plain = recordingPort(ws.root, {}, ["rename", "fsync"]);
    await publishWorkspaceFile(plain.port, path.join(ws.root, "b.md"), "B");
    expect(plain.calls).toStrictEqual(["mkdir ", "write b.md"]);
    const unsynced = recordingPort(ws.root, {}, ["fsync"]);
    await publishWorkspaceFile(unsynced.port, path.join(ws.root, "c.md"), "C");
    expect(unsynced.calls).toStrictEqual([
      "mkdir ",
      "write c.md.stage",
      "rename c.md.stage c.md",
    ]);
    expect([ws.read("a.md"), ws.read("b.md"), ws.read("c.md")]).toStrictEqual([
      "A",
      "B",
      "C",
    ]);
  });

  test("ignores a failed directory sync", async () => {
    const ws = workspace();
    const { port } = recordingPort(ws.root, {
      fsync: async (file) => {
        if (!file.includes("kibi-stage")) throw new Error("no dir sync");
      },
    });
    await publishWorkspaceFile(port, path.join(ws.root, "a.md"), "A");
    expect(ws.read("a.md")).toBe("A");
  });

  test("removes the staged file when publishing fails", async () => {
    const ws = workspace();
    const failure = new Error("rename failed");
    const { port, calls } = recordingPort(ws.root, {
      rename: async () => {
        throw failure;
      },
    });
    await expect(
      publishWorkspaceFile(port, path.join(ws.root, "a.md"), "A"),
    ).rejects.toBe(failure);
    expect(calls.at(-1)).toBe("unlink a.md.stage");
    expect(
      readdirSync(ws.root).filter((name) => name.startsWith("a.md")),
    ).toStrictEqual([]);
    const stubborn = recordingPort(ws.root, {
      rename: async () => {
        throw failure;
      },
      unlink: async () => {
        throw new Error("unlink failed");
      },
    });
    await expect(
      publishWorkspaceFile(stubborn.port, path.join(ws.root, "b.md"), "B"),
    ).rejects.toBe(failure);
    const unlinkless = recordingPort(
      ws.root,
      {
        rename: async () => {
          throw failure;
        },
      },
      ["unlink"],
    );
    await expect(
      publishWorkspaceFile(unlinkless.port, path.join(ws.root, "c.md"), "C"),
    ).rejects.toBe(failure);
    expect(unlinkless.calls).toStrictEqual([
      "mkdir ",
      "write c.md.stage",
      "fsync c.md.stage",
      "rename c.md.stage c.md",
    ]);
  });

  test("publishes journaled files in order and deletes with a sync", async () => {
    const ws = workspace();
    ws.write("docs/gone.md", "old");
    const { port, calls } = recordingPort(ws.root, {}, ["rename"]);
    await publishJournaledFiles(port, ws.root, [
      fileWrite("docs/b.md", null, "B"),
      fileWrite("docs/gone.md", "old", null),
      fileWrite("docs/a.md", null, "A"),
    ]);
    expect(calls).toStrictEqual([
      "mkdir docs",
      "write docs/b.md",
      "fsync docs/b.md",
      "fsync docs",
      "unlink docs/gone.md",
      "fsync docs",
      "mkdir docs",
      "write docs/a.md",
      "fsync docs/a.md",
      "fsync docs",
    ]);
    expect([ws.read("docs/a.md"), ws.read("docs/gone.md")]).toStrictEqual([
      "A",
      null,
    ]);
    const unsynced = recordingPort(ws.root, {}, ["fsync"]);
    await publishJournaledFiles(unsynced.port, ws.root, [
      fileWrite("docs/a.md", "A", null),
    ]);
    expect(unsynced.calls).toStrictEqual(["unlink docs/a.md"]);
    const failingSync = recordingPort(ws.root, {
      fsync: async () => {
        throw new Error("no dir sync");
      },
    });
    await publishJournaledFiles(failingSync.port, ws.root, [
      fileWrite("docs/b.md", "B", null),
    ]);
    expect(ws.read("docs/b.md")).toBeNull();
  });
});

describe("restoring journaled files", () => {
  test("restores before-bytes in reverse order, skipping restored files", async () => {
    const ws = workspace();
    ws.write("docs/a.md", "A2");
    ws.write("docs/b.md", "B1");
    ws.write("docs/c.md", "elsewhere");
    ws.write("docs/new.md", "N");
    const { port, calls } = recordingPort(ws.root, {}, ["rename", "fsync"]);
    const restored = await restoreJournaledFiles(port, ws.root, "journal", [
      fileWrite("docs/a.md", "A1", "A2"),
      fileWrite("docs/b.md", "B1", "B2"),
      fileWrite("docs/c.md", "C1", "C2"),
      fileWrite("docs/new.md", null, "N"),
    ]);
    expect(restored).toStrictEqual(["docs/new.md", "docs/c.md", "docs/a.md"]);
    expect(calls).toStrictEqual([
      "unlink docs/new.md",
      "mkdir docs",
      "write docs/c.md",
      "mkdir docs",
      "write docs/a.md",
    ]);
    expect(
      ["a", "b", "c", "new"].map((name) => ws.read(`docs/${name}.md`)),
    ).toStrictEqual(["A1", "B1", "C1", null]);
  });
});

describe("store fingerprints", () => {
  test("hash the touched entities inside Prolog from a fresh read", async () => {
    const events: string[] = [];
    const prolog = {
      invalidateCache: () => events.push("invalidate"),
      query: async (goal: string) => {
        events.push(goal);
        return { success: true, bindings: { FingerprintHash: "'abc'" } };
      },
    } as unknown as PrologPort;
    expect(await storeFingerprint(prolog, ["REQ-1", "it's"])).toBe(
      contentHash("abc"),
    );
    expect(events).toStrictEqual([
      "invalidate",
      `findall(Hex, (findall(Id-Entities-Relationships, (member(Id, ['REQ-1', 'it''s']), findall(Type-Sorted, (kb_entity(Id, Type, Props), msort(Props, Sorted)), Entities), findall(Rel-To, (member(Rel, [${RELATIONSHIP_TYPES.join(", ")}]), kb_relationship(Rel, Id, To)), Unsorted), msort(Unsorted, Relationships)), State), format(string(StateText), '~q', [State]), sha:sha_hash(StateText, Digest, [algorithm(sha256)]), sha:hash_atom(Digest, Hex)), [FingerprintHash])`,
    ]);
  });

  test("strip only the outer quotes and tolerate a missing binding", async () => {
    const { prolog } = fingerprintProlog(['"a\'b"', "plain"]);
    expect(await storeFingerprint(prolog, [])).toBe(contentHash("a'b"));
    expect(await storeFingerprint(prolog, [])).toBe(contentHash("plain"));
    const unbound = {
      query: async () => ({ success: true, bindings: {} }),
    } as unknown as PrologPort;
    expect(await storeFingerprint(unbound, [])).toBe(contentHash(""));
  });
});

describe("recovering one journal", () => {
  const dates = () => {
    let day = 10;
    const calls: string[] = [];
    return {
      calls,
      now: () => {
        const date = new Date(`2026-09-${day++}T00:00:00Z`);
        calls.push(date.toISOString());
        return date;
      },
    };
  };
  const created = (ws: Workspace, record: PlanApplyJournal) => {
    const { journalPath } = openPlanApplyJournal(ws.context, record.planHash);
    return createPlanApplyJournal(journalPath, record);
  };

  test("leaves a terminal journal alone, even without a filesystem", async () => {
    const ws = workspace();
    const context = { ...ws.context, fs: undefined };
    for (const [state, text] of [
      ["committed", "committed"],
      ["rolled_back", "rolled back"],
    ] as const) {
      expect(
        await recoverPlanApplyJournal(
          context,
          { journalPath: "unused", journal: journal(state) },
          { prolog: async () => undefined },
        ),
      ).toStrictEqual({
        journalId: idA,
        planHash: hashA,
        action: "none",
        state,
        restoredPaths: [],
        detail: `Journal ${idA} is already ${text}; nothing to recover.`,
      });
    }
  });

  test("rolls back a prepared journal without asking the store", async () => {
    const ws = workspace();
    ws.write("docs/a.md", "A2");
    ws.write("docs/new.md", "N");
    ws.write("docs/a.md.kibi-stage-1-orphan", "partial");
    ws.write("docs/b.md.kibi-stage-1-kept", "other target");
    mkdirSync(path.join(ws.root, "docs", "a.md.kibi-stage-dir"), {
      recursive: true,
    });
    writeFileSync(
      path.join(ws.root, "docs", "a.md.kibi-stage-dir", "inner"),
      "x",
    );
    const files = [
      fileWrite("docs/a.md", "A1", "A2"),
      fileWrite("docs/new.md", null, "N"),
      fileWrite("missing/dir/x.md", null, "X"),
    ];
    const handle = created(ws, journal("prepared", { files }));
    let asked = 0;
    const clock = dates();
    const result = await recoverPlanApplyJournal(ws.context, handle, {
      prolog: async () => {
        asked += 1;
        return undefined;
      },
      now: clock.now,
    });
    const detail = `Rolled back interrupted plan ${hashA.slice(0, 12)} (journal ${idA}): the store commit was never submitted; restored 2 of 3 journaled file(s) to their before-bytes.`;
    expect(result).toStrictEqual({
      journalId: idA,
      planHash: hashA,
      action: "rolled_back",
      state: "rolled_back",
      restoredPaths: ["docs/new.md", "docs/a.md"],
      detail,
    });
    expect(asked).toBe(0);
    expect(clock.calls).toStrictEqual(["2026-09-10T00:00:00.000Z"]);
    expect(readJournal(handle.journalPath)).toStrictEqual(
      journal("rolled_back", {
        updatedAt: "2026-09-10T00:00:00.000Z",
        resolution: { action: "rolled_back", by: "recovery", detail },
        store: { ...journal("prepared").store, entries: [] },
      }),
    );
    expect(readdirSync(path.join(ws.root, "docs")).sort()).toStrictEqual([
      "a.md",
      "a.md.kibi-stage-dir",
      "b.md.kibi-stage-1-kept",
    ]);
    expect(ws.read("docs/a.md")).toBe("A1");
  });

  test("completes a store_committed journal and binds its receipts", async () => {
    const ws = workspace();
    ws.write("docs/a.md", "A1");
    const files = [
      fileWrite("docs/a.md", "A1", "A2"),
      fileWrite("docs/b.md", null, "B"),
    ];
    const handle = created(ws, journal("store_committed", { files }));
    const clock = dates();
    const result = await recoverPlanApplyJournal(ws.context, handle, {
      prolog: async () => {
        throw new Error("not needed");
      },
      now: clock.now,
    });
    const detail = `Completed interrupted plan ${hashA.slice(0, 12)} (journal ${idA}): the store had accepted the batch; published 2 of 2 journaled file(s) at their after-bytes.`;
    expect(result).toStrictEqual({
      journalId: idA,
      planHash: hashA,
      action: "completed",
      state: "committed",
      restoredPaths: ["docs/a.md", "docs/b.md"],
      detail,
    });
    expect(clock.calls).toHaveLength(1);
    expect(readJournal(handle.journalPath).resolution).toStrictEqual({
      action: "completed",
      by: "recovery",
      detail,
    });
    expect(readJournal(handle.journalPath).state).toBe("committed");
    expect(
      readdirSync(path.join(ws.root, ".kb", "recovery", "pending-sources")),
    ).toHaveLength(2);
  });

  test("lets the store fingerprint decide a store_committing journal", async () => {
    const ws = workspace();
    const files = [fileWrite("docs/a.md", "A1", "A2")];
    ws.write("docs/a.md", "A2");
    const unchanged = fingerprintProlog([]);
    const pre = contentHash("same");
    const rolled = await recoverPlanApplyJournal(
      ws.context,
      created(
        ws,
        journal("store_committing", {
          files,
          store: { ...journal("prepared").store, preCommitFingerprint: pre },
        }),
      ),
      {
        prolog: async () => fingerprintProlog(["same"]).prolog,
        now: dates().now,
      },
    );
    expect(rolled.detail).toBe(
      `Rolled back interrupted plan ${hashA.slice(0, 12)} (journal ${idA}): the store shows the batch never took effect; restored 1 of 1 journaled file(s) to their before-bytes.`,
    );
    expect(ws.read("docs/a.md")).toBe("A1");
    expect(unchanged.goals).toStrictEqual([]);

    const clock = dates();
    const states: string[] = [];
    const handle = created(
      ws,
      journal("store_committing", {
        files,
        store: { ...journal("prepared").store, preCommitFingerprint: pre },
      }),
    );
    const completed = await recoverPlanApplyJournal(ws.context, handle, {
      prolog: async () => {
        states.push(readJournal(handle.journalPath).state);
        return fingerprintProlog(["moved"]).prolog;
      },
      now: clock.now,
    });
    expect(completed.detail).toBe(
      `Completed interrupted plan ${hashA.slice(0, 12)} (journal ${idA}): the store shows the batch took effect; published 1 of 1 journaled file(s) at their after-bytes.`,
    );
    expect(states).toStrictEqual(["store_committing"]);
    expect(clock.calls).toStrictEqual([
      "2026-09-10T00:00:00.000Z",
      "2026-09-11T00:00:00.000Z",
    ]);
    expect(ws.read("docs/a.md")).toBe("A2");
  });

  test("records the store decision before touching files", async () => {
    const ws = workspace();
    ws.write("docs/a.md", "changed elsewhere");
    const handle = created(
      ws,
      journal("store_committing", {
        files: [fileWrite("docs/a.md", "A1", "A2")],
      }),
    );
    await expect(
      recoverPlanApplyJournal(ws.context, handle, {
        prolog: async () => fingerprintProlog(["moved"]).prolog,
        now: dates().now,
      }),
    ).rejects.toThrow(
      `Plan application journal ${handle.journalPath} cannot be recovered automatically: docs/a.md changed outside the journal`,
    );
    expect(readJournal(handle.journalPath).state).toBe("store_committed");
  });

  test("refuses, changing nothing, when files changed outside the journal", async () => {
    const ws = workspace();
    ws.write("docs/a.md", "A2");
    ws.write("docs/b.md", "foreign");
    ws.write("docs/c.md", "foreign");
    const handle = created(
      ws,
      journal("prepared", {
        files: [
          fileWrite("docs/a.md", "A1", "A2"),
          fileWrite("docs/b.md", "B1", "B2"),
          fileWrite("docs/c.md", "C1", "C2"),
        ],
      }),
    );
    let thrown: unknown;
    try {
      await recoverPlanApplyJournal(ws.context, handle, {
        prolog: async () => undefined,
      });
    } catch (error) {
      thrown = error;
    }
    expect((thrown as OperationError).detail).toStartWith(
      `Plan application journal ${handle.journalPath} cannot be recovered automatically: docs/b.md, docs/c.md changed outside the journal (neither the journaled before nor after bytes). Kibi will not`,
    );
    expect(ws.read("docs/a.md")).toBe("A2");
    expect(readJournal(handle.journalPath).state).toBe("prepared");
  });

  test("keeps the journal store_committed when receipts cannot be bound", async () => {
    const ws = workspace();
    ws.write(".kb/recovery/pending-sources", "a file, not a directory");
    const handle = created(
      ws,
      journal("store_committed", {
        files: [fileWrite("docs/a.md", null, "A")],
      }),
    );
    const result = await recoverPlanApplyJournal(ws.context, handle, {
      prolog: async () => undefined,
    });
    expect(result).toStrictEqual({
      journalId: idA,
      planHash: hashA,
      action: "completed",
      state: "committed",
      restoredPaths: ["docs/a.md"],
      detail: `Completed interrupted plan ${hashA.slice(0, 12)} (journal ${idA}): the store had accepted the batch; published 1 of 1 journaled file(s) at their after-bytes.`,
      receiptFailure: expect.stringContaining("EEXIST") as unknown as string,
    });
    expect(readJournal(handle.journalPath).state).toBe("store_committed");
  });

  test("stamps the recovery with the current time by default", async () => {
    const ws = workspace();
    const handle = created(ws, journal("prepared"));
    const before = Date.now();
    await recoverPlanApplyJournal(ws.context, handle, {
      prolog: async () => undefined,
    });
    expect(
      Date.parse(readJournal(handle.journalPath).updatedAt),
    ).toBeGreaterThanOrEqual(before - 1000);
    for (const state of ["store_committing", "store_committed"] as const) {
      const committed = created(ws, journal(state));
      await recoverPlanApplyJournal(ws.context, committed, {
        prolog: async () => fingerprintProlog(["moved"]).prolog,
      });
      const recorded = readJournal(committed.journalPath);
      expect(recorded.state).toBe("committed");
      expect(Date.parse(recorded.updatedAt)).toBeGreaterThanOrEqual(
        before - 1000,
      );
    }
  });

  test("needs a filesystem and, mid-commit, a working engine", async () => {
    const ws = workspace();
    const handle = { journalPath: "unused", journal: journal("prepared") };
    await expect(
      recoverPlanApplyJournal({ ...ws.context, fs: undefined }, handle, {
        prolog: async () => undefined,
      }),
    ).rejects.toThrow(
      `Plan journal ${idA} recovery requires a filesystem-capable runtime`,
    );
    const committing = {
      journalPath: "unused",
      journal: journal("store_committing"),
    };
    const failures: unknown[] = [];
    for (const prolog of [
      async () => undefined,
      async () =>
        ({
          query: async () => ({ success: false, bindings: {} }),
        }) as unknown as PrologPort,
    ])
      await recoverPlanApplyJournal(ws.context, committing, { prolog }).catch(
        (error: unknown) => failures.push(error),
      );
    expect(
      failures.map((error) => [
        error instanceof OperationError,
        (error as OperationError).code,
        (error as OperationError).detail,
        (error as OperationError).retryable,
      ]),
    ).toStrictEqual([
      [
        true,
        "PLAN_APPLY_RECOVERY_REQUIRED",
        `Plan journal ${idA} was interrupted during its store commit; recovering it needs the branch engine, which is unavailable. Retry kb_apply_plan with recoveryJournalId=${idA} once the engine is available`,
        false,
      ],
      [
        true,
        "PLAN_APPLY_RECOVERY_REQUIRED",
        `Plan journal ${idA} was interrupted during its store commit and the store could not be inspected (store fingerprint query failed: unknown error). Retry kb_apply_plan with recoveryJournalId=${idA}`,
        false,
      ],
    ]);
  });
});

describe("recovering every pending journal", () => {
  const hashes = ["c", "a", "e", "b", "d"].map((c) => c.repeat(64));

  test("finishes incomplete journals of both directories in path order", async () => {
    const ws = workspace({ storeReady: true });
    for (const hash of hashes) {
      const id = planApplyJournalId(hash);
      mkdirSync(ws.storeJournals, { recursive: true });
      writeFileSync(
        path.join(ws.storeJournals, `${id}.json`),
        JSON.stringify(journal("prepared", {}, hash)),
      );
    }
    storeJournal(
      ws,
      journal("prepared", {}, "f".repeat(64)),
      planApplyJournalId("f".repeat(64)),
    );
    storeJournal(
      ws,
      journal(
        "committed",
        { store: { ...journal("prepared").store, entries: [] } },
        "9".repeat(64),
      ),
      planApplyJournalId("9".repeat(64)),
    );
    storeJournal(
      ws,
      journal(
        "rolled_back",
        { store: { ...journal("prepared").store, entries: [] } },
        "8".repeat(64),
      ),
      planApplyJournalId("8".repeat(64)),
    );
    writeFileSync(path.join(ws.fallbackJournals, "notes.json"), "{");
    writeFileSync(path.join(ws.fallbackJournals, `${idA}.yaml`), "{");
    const recoveries = await recoverPendingPlanApplyJournals(ws.context, {
      prolog: async () => undefined,
    });
    expect(recoveries.map((recovery) => recovery.planHash[0])).toStrictEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
    expect(recoveries.every((r) => r.action === "rolled_back")).toBe(true);
    expect(planRecoveryNotes(recoveries)).toStrictEqual(
      recoveries.map((recovery) => recovery.detail),
    );
  });

  test("finds nothing without a filesystem, a branch or journals", async () => {
    const ws = workspace();
    storeJournal(ws, journal("prepared"));
    const options = { prolog: async () => undefined };
    expect(
      await recoverPendingPlanApplyJournals(
        { ...ws.context, fs: undefined },
        options,
      ),
    ).toStrictEqual([]);
    expect(
      await recoverPendingPlanApplyJournals(detachedContext(ws.root), options),
    ).toStrictEqual([]);
    expect(
      await recoverPendingPlanApplyJournals(workspace().context, options),
    ).toStrictEqual([]);
  });

  test("refuse further writes while receipts stay unbound", async () => {
    const ws = workspace();
    ws.write(".kb/recovery/pending-sources", "a file, not a directory");
    storeJournal(
      ws,
      journal("store_committed", {
        files: [fileWrite("docs/a.md", null, "A")],
      }),
    );
    const options = { prolog: async () => undefined };
    let thrown: unknown;
    try {
      await settlePendingPlanApplyJournals(ws.context, options);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(OperationError);
    expect((thrown as OperationError).code).toBe(
      "PLAN_APPLY_RECOVERY_REQUIRED",
    );
    expect((thrown as OperationError).retryable).toBe(false);
    expect((thrown as OperationError).detail).toMatch(
      new RegExp(
        `^Completed interrupted plan ${hashA.slice(0, 12)} \\(journal ${idA}\\): the store had accepted the batch; published 1 of 1 journaled file\\(s\\) at their after-bytes\\. Binding its new source files to pending-source receipts failed \\(.*EEXIST.*\\); run kb_apply_plan with recoveryJournalId=${idA} before further writes$`,
      ),
    );
    const explicit = await settlePendingPlanApplyJournals(
      ws.context,
      options,
      idA,
    );
    expect(explicit.map((recovery) => recovery.journalId)).toStrictEqual([idA]);
    expect(explicit[0]?.receiptFailure).toContain("EEXIST");
  });

  test("settles cleanly when every recovery finished", async () => {
    const ws = workspace();
    storeJournal(ws, journal("prepared"));
    const settled = await settlePendingPlanApplyJournals(ws.context, {
      prolog: async () => undefined,
    });
    expect(settled.map((recovery) => recovery.action)).toStrictEqual([
      "rolled_back",
    ]);
  });
});

describe("recovery notes", () => {
  test("list only journals a recovery changed", () => {
    const recovery = (action: "none" | "completed", detail: string) => ({
      journalId: idA,
      planHash: hashA,
      action,
      state: "committed" as const,
      restoredPaths: [],
      detail,
    });
    expect(
      planRecoveryNotes([
        recovery("none", "skip"),
        recovery("completed", "kept"),
      ]),
    ).toStrictEqual(["kept"]);
  });

  test("decorate failures, keeping typed errors typed", () => {
    const original = new Error("plain");
    expect(withPlanRecoveryNotes(original, [])).toBe(original);
    const decorated = withPlanRecoveryNotes(original, ["a.", "b."]);
    expect(decorated).toBe(original);
    expect(original.message).toBe("plain [settled before this failure: a. b.]");
    const bare = withPlanRecoveryNotes("text", ["a."]) as Error;
    expect(bare).toBeInstanceOf(Error);
    expect(bare.message).toBe("text [settled before this failure: a.]");
    const operation = withPlanRecoveryNotes(
      new OperationError("CODE", "failed", true),
      ["a."],
    ) as OperationError;
    expect([
      operation instanceof OperationError,
      operation.code,
      operation.detail,
      operation.retryable,
    ]).toStrictEqual([
      true,
      "CODE",
      "failed [settled before this failure: a.]",
      true,
    ]);
    const input = withPlanRecoveryNotes(new InputError("BAD", "bad"), [
      "a.",
    ]) as InputError;
    expect([
      input instanceof InputError,
      input.code,
      input.detail,
    ]).toStrictEqual([true, "BAD", "bad [settled before this failure: a.]"]);
  });
});
