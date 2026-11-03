import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import * as deleteModule from "../../../src/operations/mutation/delete.js";
import * as journalModule from "../../../src/operations/mutation/plan-apply-journal.js";
import { executeApplyPlan } from "../../../src/operations/planning/apply-plan.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { scratch } from "../helpers.js";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

type Write = {
  path: string;
  mode: "write" | "delete";
  beforeHash: string | null;
  afterHash: string | null;
  body?: string;
};

function deletionPlan(sourceWrites: readonly Write[]) {
  const body = {
    version: "kibi.entity-deletion-plan.v1" as const,
    entityIds: ["FACT-gone"],
    sourceHashes: {},
    sourceWrites,
    supersessionRequired: false,
  };
  return { ...body, planHash: sha(JSON.stringify(body)) };
}

function workspace(files: Record<string, string> = {}) {
  const made = scratch({ ".kb/.keep": "", ...files });
  cleanups.push(made.cleanup);
  return made.root;
}

function ctx(root: string, fs: OperationContext["fs"] | null = nodeFilesystem) {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    ...(fs === null ? {} : { fs }),
  } as OperationContext;
}

function stubDelete(): void {
  spies.push(
    spyOn(deleteModule, "executeDelete").mockResolvedValue({
      content: [],
      structuredContent: { deleted: 1, skipped: 0, errors: [] },
    } as never),
  );
}

const apply = (
  plan: ReturnType<typeof deletionPlan>,
  context: OperationContext,
) =>
  executeApplyPlan({ plan, approvedPlanHash: plan.planHash } as never, context);

const journalOf = (root: string, plan: { planHash: string }) =>
  path.join(
    root,
    ".kb",
    "recovery",
    `source-writes-${plan.planHash.slice(0, 16)}.json`,
  );

const after = "after\n";
const before = "before\n";
const rewrite = (file: string): Write => ({
  path: file,
  mode: "write",
  beforeHash: sha(before),
  afterHash: sha(after),
  body: after,
});

describe("entity deletion source writes", () => {
  test("need a filesystem-capable runtime", async () => {
    const root = workspace();
    await expect(
      apply(deletionPlan([rewrite("docs/a.md")]), ctx(root, null)),
    ).rejects.toThrow();
  });

  test("publish through write and unlink when the port has no rename", async () => {
    stubDelete();
    const root = workspace({ "docs/a.md": before, "docs/b.md": before });
    const { rename: _rename, ...withoutRename } = nodeFilesystem;
    const plan = deletionPlan([
      rewrite("docs/a.md"),
      {
        path: "docs/b.md",
        mode: "delete",
        beforeHash: sha(before),
        afterHash: null,
      },
    ]);
    const result = await apply(plan, ctx(root, withoutRename as never));
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      deleted: 1,
    });
    expect(readFileSync(path.join(root, "docs/a.md"), "utf8")).toBe(after);
    expect(existsSync(path.join(root, "docs/b.md"))).toBe(false);
    expect(readdirSync(path.join(root, "docs"))).toStrictEqual(["a.md"]);
  });

  test("refuse to delete without unlink support and restore the originals", async () => {
    const root = workspace({ "docs/a.md": before, "docs/b.md": before });
    const { unlink: _unlink, ...withoutUnlink } = nodeFilesystem;
    const plan = deletionPlan([
      rewrite("docs/a.md"),
      {
        path: "docs/b.md",
        mode: "delete",
        beforeHash: sha(before),
        afterHash: null,
      },
    ]);
    await expect(
      apply(plan, ctx(root, withoutUnlink as never)),
    ).rejects.toThrow(
      "Apply plan failed: delete requires filesystem unlink support: docs/b.md",
    );
    expect(readFileSync(path.join(root, "docs/a.md"), "utf8")).toBe(before);
    expect(JSON.parse(readFileSync(journalOf(root, plan), "utf8")).state).toBe(
      "rolled_back",
    );
  });

  test("remove the staged file and a new file when publishing fails", async () => {
    const root = workspace();
    const failing = {
      ...nodeFilesystem,
      rename: async () => {
        throw new Error("rename failed");
      },
    };
    const plan = deletionPlan([
      {
        path: "docs/new.md",
        mode: "write",
        beforeHash: null,
        afterHash: sha(after),
        body: after,
      },
    ]);
    await expect(apply(plan, ctx(root, failing as never))).rejects.toThrow(
      "rename failed",
    );
    expect(readdirSync(path.join(root, "docs"))).toStrictEqual([]);
  });

  test("keep going when restoring an original also fails", async () => {
    const root = workspace({ "docs/a.md": before });
    const failing = {
      ...nodeFilesystem,
      rename: async () => {
        throw new Error("rename failed");
      },
      writeFile: async (target: string, body: string) => {
        if (target.endsWith("docs/a.md") || target.endsWith(".json"))
          if (body === before || body.includes('"rolled_back"'))
            throw new Error("restore failed");
        return nodeFilesystem.writeFile(target, body);
      },
    };
    await expect(
      apply(deletionPlan([rewrite("docs/a.md")]), ctx(root, failing as never)),
    ).rejects.toThrow("rename failed");
  });

  test("mark the journal repair_required when post-commit repair fails", async () => {
    const root = workspace({ "docs/a.md": before });
    spies.push(
      spyOn(journalModule, "reconcilePendingSourceReceipts").mockImplementation(
        () => {
          throw new Error("receipt store down");
        },
      ),
    );
    const plan = deletionPlan([rewrite("docs/a.md")]);
    const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
    await expect(apply(plan, ctx(root))).rejects.toThrow(
      `Source plan ${plan.planHash} committed its authoritative bytes, but postcommit repair metadata failed: receipt store down; recovery journal ${journalId} is marked repair_required; use kb_apply_plan recoveryJournalId=${journalId} instead of retrying the original mutation`,
    );
    expect(JSON.parse(readFileSync(journalOf(root, plan), "utf8")).state).toBe(
      "repair_required",
    );
    expect(readFileSync(path.join(root, "docs/a.md"), "utf8")).toBe(after);
  });

  test("refuse to replay a plan whose sources are already committed", async () => {
    const root = workspace({ "docs/a.md": after });
    const plan = deletionPlan([rewrite("docs/a.md")]);
    const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
    const entry = (afterHash: string | null) => ({
      path: "docs/a.md",
      mode: "write",
      beforeHash: sha(before),
      afterHash,
      beforeExisted: true,
      beforeStage: "x.before",
      afterStage: "x.after",
    });
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      journalOf(root, plan),
      JSON.stringify({
        version: 1,
        planHash: plan.planHash,
        state: "committed",
        entries: [entry(sha(after))],
      }),
    );
    await expect(apply(plan, ctx(root))).rejects.toThrow(
      `MUTATION_ALREADY_COMMITTED: source plan ${plan.planHash} already crossed the authoritative commit boundary; use kb_apply_plan recoveryJournalId=${journalId} instead of retrying the original mutation`,
    );
    // A committed journal whose file no longer holds the after-image is not
    // a replay: the plan's own hashes decide, and the file is not at before.
    writeFileSync(path.join(root, "docs/a.md"), "edited\n");
    await expect(apply(plan, ctx(root))).rejects.toThrow(
      "Apply plan failed: source hash changed for docs/a.md",
    );
  });
});
