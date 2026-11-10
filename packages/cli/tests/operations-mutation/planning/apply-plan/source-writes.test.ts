import { describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OperationError } from "../../../../src/cli-errors.js";
import * as syncModule from "../../../../src/commands/sync.js";
import * as deleteModule from "../../../../src/operations/mutation/delete.js";
import * as journalModule from "../../../../src/operations/mutation/plan-apply-journal.js";
import * as lockModule from "../../../../src/operations/mutation/workspace-mutation-lock.js";
import { executeApplyPlan } from "../../../../src/operations/planning/apply-plan.js";
import type { SourceWritePlan } from "../../../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import { tempWorkspace } from "../../workspace.js";
import {
  type HarnessOptions,
  cleanUpAfterEach,
  deletionPlan,
  harness,
  sha,
  track,
} from "./harness.js";

cleanUpAfterEach();

type Fs = NonNullable<OperationContext["fs"]>;

const write = (
  file: string,
  body: string,
  before?: string,
): SourceWritePlan => ({
  path: file,
  mode: "write",
  beforeHash: before === undefined ? null : sha(before),
  afterHash: sha(body),
  body,
});
const remove = (file: string, before: string): SourceWritePlan => ({
  path: file,
  mode: "delete",
  beforeHash: sha(before),
  afterHash: null,
});

function stubDelete(
  impl: () => Promise<unknown> = async () => ({
    content: [],
    structuredContent: { deleted: 1, skipped: 0, errors: [] },
  }),
) {
  return track(
    spyOn(deleteModule, "executeDelete").mockImplementation(impl as never),
  );
}

function setup(sourceWrites: SourceWritePlan[], options: HarnessOptions = {}) {
  const plan = deletionPlan({ sourceWrites });
  const h = harness(options);
  const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
  const journalPath = `.kb/recovery/${journalId}.json`;
  const journal = () => JSON.parse(h.read(journalPath));
  const run = (onCommitted?: () => void) =>
    executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      h.context,
      onCommitted,
    );
  return { ...h, plan, journalId, journalPath, journal, run };
}

const fail = (run: Promise<unknown>) =>
  run.then(
    () => {
      throw new Error("expected a failure");
    },
    (error: unknown) => error as Error,
  );

describe("entity deletion plans", () => {
  test("a deletion without source writes commits through the delete operation", async () => {
    const remover = stubDelete();
    const { run, plan, files, context } = setup([]);
    let committed = 0;
    const result = await run(() => {
      committed += 1;
    });
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `Applied entity deletion plan ${plan.planHash.slice(0, 12)}.`,
        },
      ],
      structuredContent: {
        version: "kibi.entity-deletion-apply-result.v1",
        outcome: "applied",
        planHash: plan.planHash,
        deleted: 1,
        sourcePaths: [],
      } as never,
    });
    expect(committed).toBe(1);
    const [input, passed] = remover.mock.calls[0] as [
      unknown,
      OperationContext,
    ];
    expect(input).toEqual({ ids: ["REQ-gone"] });
    expect(passed.sourceFirst).toBe(false);
    expect(passed.sourcePlanApplication).toBe(true);
    expect(passed.sourceMutationLockHeld).toBe(true);
    expect(passed.workspaceRoot).toBe(context.workspaceRoot);
    expect(files(".kb/recovery")).toEqual([]);
  });

  test("source writes are journaled, published and marked compiled", async () => {
    stubDelete();
    const s = setup(
      [
        write("docs/new.md", "new\n"),
        write("docs/old.md", "changed\n", "old\n"),
        remove("docs/gone.md", "gone\n"),
      ],
      {
        files: { "docs/old.md": "old\n", "docs/gone.md": "gone\n" },
      },
    );
    const result = await s.run();
    expect(result.structuredContent).toEqual({
      version: "kibi.entity-deletion-apply-result.v1",
      outcome: "applied",
      planHash: s.plan.planHash,
      deleted: 1,
      sourcePaths: ["docs/new.md", "docs/old.md", "docs/gone.md"],
      recoveryJournalId: s.journalId,
    } as never);
    expect(s.read("docs/new.md")).toBe("new\n");
    expect(s.read("docs/old.md")).toBe("changed\n");
    expect(s.exists("docs/gone.md")).toBe(false);
    const stage = (index: number, kind: string) =>
      path.join(s.root, ".kb", "recovery", `${s.journalId}-${index}.${kind}`);
    expect(s.journal()).toEqual({
      version: 1,
      planHash: s.plan.planHash,
      state: "compiled_published",
      entries: [
        {
          path: "docs/new.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha("new\n"),
          beforeExisted: false,
          beforeStage: stage(0, "before"),
          afterStage: stage(0, "after"),
        },
        {
          path: "docs/old.md",
          mode: "write",
          beforeHash: sha("old\n"),
          afterHash: sha("changed\n"),
          beforeExisted: true,
          beforeStage: stage(1, "before"),
          afterStage: stage(1, "after"),
        },
        {
          path: "docs/gone.md",
          mode: "delete",
          beforeHash: sha("gone\n"),
          afterHash: null,
          beforeExisted: true,
          beforeStage: stage(2, "before"),
          afterStage: stage(2, "after"),
        },
      ],
    });
    expect(s.read(s.journalPath).endsWith("}\n")).toBe(true);
    expect(s.read(s.journalPath)).toContain('\n  "version": 1,');
    expect(
      s.files(".kb/recovery").filter((file) => !file.includes("pending-")),
    ).toEqual(
      [
        s.journalPath,
        `.kb/recovery/${s.journalId}-0.after`,
        `.kb/recovery/${s.journalId}-1.after`,
        `.kb/recovery/${s.journalId}-1.before`,
        `.kb/recovery/${s.journalId}-2.before`,
      ].sort(),
    );
    expect(s.read(`.kb/recovery/${s.journalId}-1.before`)).toBe("old\n");
    expect(s.read(`.kb/recovery/${s.journalId}-0.after`)).toBe("new\n");
    expect(s.files("docs")).toEqual(["docs/new.md", "docs/old.md"]);
  });

  test("a failed compiled retraction keeps the sources and asks for repair", async () => {
    for (const thrown of [new Error("store down"), "plain failure"]) {
      const remover = stubDelete(async () => {
        throw thrown;
      });
      const s = setup([write("docs/a.md", "a\n")]);
      let committed = 0;
      const result = await s.run(() => {
        committed += 1;
      });
      const detail = thrown instanceof Error ? thrown.message : thrown;
      expect(result.structuredContent).toEqual({
        version: "kibi.entity-deletion-apply-result.v1",
        outcome: "applied",
        planHash: s.plan.planHash,
        deleted: 0,
        sourcePaths: ["docs/a.md"],
        recoveryJournalId: s.journalId,
        status: "committed_with_repairs",
        nextActions: [
          {
            operation: "kb_apply_plan",
            input: { recoveryJournalId: s.journalId },
            detail,
            reason:
              "The deletion source commit is authoritative but compiled retraction failed; repair from the journal without retrying deletion.",
            required: true,
          },
        ],
      } as never);
      expect(committed).toBe(1);
      expect(s.journal().state).toBe("repair_required");
      expect(s.read("docs/a.md")).toBe("a\n");
      remover.mockRestore();
    }
  });

  test("a failed retraction without source writes reports the skipped ids", async () => {
    stubDelete(async () => {
      throw new Error("store down");
    });
    const plan = deletionPlan({ entityIds: ["REQ-a", "REQ-b"] });
    const h = harness();
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      h.context,
    );
    expect(result.structuredContent).toMatchObject({
      deleted: 0,
      status: "committed_with_repairs",
      nextActions: [{ input: { recoveryJournalId: null } }],
    });
    expect(h.files(".kb/recovery")).toEqual([]);
  });

  test("source writes need a filesystem", async () => {
    stubDelete();
    const s = setup([write("docs/a.md", "a\n")], { fs: null });
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: sourceWrites require a filesystem-capable runtime",
    );
  });
});

describe("source write targets", () => {
  test.each([
    ["", "Apply plan failed: sourceWrites.path must be workspace-relative: "],
    [
      "/etc/x.md",
      "Apply plan failed: sourceWrites.path must be workspace-relative: /etc/x.md",
    ],
    [
      "docs/../../x.md",
      "Apply plan failed: sourceWrites.path must be workspace-relative: docs/../../x.md",
    ],
    [
      "docs\\..\\x.md",
      "Apply plan failed: sourceWrites.path must be workspace-relative: docs\\..\\x.md",
    ],
    [
      ".kb",
      "Apply plan failed: sourceWrites.path cannot target Kibi's derived .kb runtime trees",
    ],
    [
      ".kb/branches/develop/kb.rdf",
      "Apply plan failed: sourceWrites.path cannot target Kibi's derived .kb runtime trees",
    ],
  ])("path %p is refused", async (file, message) => {
    stubDelete();
    const s = setup([write("docs/ok.md", "ok\n"), write(file, "x\n")]);
    expect((await fail(s.run())).message).toBe(message);
    expect(s.exists("docs/ok.md")).toBe(false);
    expect(s.files(".kb/recovery")).toEqual([s.journalPath]);
    expect(s.journal().state).toBe("rolled_back");
    expect(
      s.journal().entries.map((entry: { path: string }) => entry.path),
    ).toEqual(["docs/ok.md"]);
  });

  test("a path holding dots in a name is a normal target", async () => {
    stubDelete();
    const s = setup([write("docs/..x.md", "x\n"), write(".", "x\n")]);
    const error = await fail(s.run());
    expect(error.message).not.toContain("workspace-relative");
    expect(error.message).not.toContain("symlink");
    expect(s.exists("docs/..x.md")).toBe(false);
  });

  test("a symlink out of the workspace is refused", async () => {
    stubDelete();
    const outside = tempWorkspace();
    const s = setup([write("linked/x.md", "x\n")]);
    symlinkSync(outside, path.join(s.root, "linked"));
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: sourceWrites.path follows a symlink outside the workspace: linked/x.md",
    );
  });

  test("a symlink inside the workspace is allowed", async () => {
    stubDelete();
    const s = setup([write("linked/x.md", "x\n")]);
    mkdirSync(path.join(s.root, "real"));
    symlinkSync(path.join(s.root, "real"), path.join(s.root, "linked"));
    await s.run();
    expect(s.read("real/x.md")).toBe("x\n");
  });

  test("a stale before hash is refused", async () => {
    stubDelete();
    const s = setup([write("docs/a.md", "new\n", "old\n")], {
      files: { "docs/a.md": "other\n" },
    });
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: source hash changed for docs/a.md",
    );
    const absent = setup([write("docs/a.md", "new\n", "old\n")]);
    expect((await fail(absent.run())).message).toBe(
      "Apply plan failed: source hash changed for docs/a.md",
    );
  });

  test.each([
    [{ body: undefined }],
    [{ afterHash: null }],
    [{ afterHash: sha("other") }],
  ])("a write %p must hash its staged body", async (edit) => {
    stubDelete();
    const s = setup([{ ...write("docs/a.md", "a\n"), ...edit }]);
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: afterHash does not match staged body for docs/a.md",
    );
  });

  test("a delete must carry a null after hash", async () => {
    stubDelete();
    const s = setup(
      [{ ...remove("docs/a.md", "a\n"), afterHash: sha("a\n") }],
      {
        files: { "docs/a.md": "a\n" },
      },
    );
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: delete source write must have a null afterHash for docs/a.md",
    );
  });

  test("an empty body is a valid write", async () => {
    stubDelete();
    const s = setup([write("docs/empty.md", "")]);
    await s.run();
    expect(s.read("docs/empty.md")).toBe("");
    expect(s.read(`.kb/recovery/${s.journalId}-0.after`)).toBe("");
  });
});

describe("publishing through constrained filesystems", () => {
  test("without rename the body is written in place", async () => {
    stubDelete();
    const { rename: _rename, ...fs } = nodeFilesystem;
    const s = setup([write("docs/a.md", "a\n")], { fs: fs as Fs });
    await s.run();
    expect(s.read("docs/a.md")).toBe("a\n");
    expect(s.files("docs")).toEqual(["docs/a.md"]);
  });

  test("without rename or unlink the staged copy stays behind", async () => {
    stubDelete();
    const { rename: _rename, unlink: _unlink, ...fs } = nodeFilesystem;
    const s = setup([write("docs/a.md", "a\n")], { fs: fs as Fs });
    await s.run();
    expect(s.files("docs")).toHaveLength(2);
  });

  test("a staged copy that cannot be removed is ignored", async () => {
    stubDelete();
    const { rename: _rename, ...base } = nodeFilesystem;
    const fs = {
      ...base,
      unlink: async () => {
        throw new Error("no unlink");
      },
    };
    const s = setup([write("docs/a.md", "a\n")], { fs: fs as Fs });
    await s.run();
    expect(s.read("docs/a.md")).toBe("a\n");
  });

  test("a delete needs unlink support", async () => {
    stubDelete();
    const { unlink: _unlink, ...fs } = nodeFilesystem;
    const s = setup([remove("docs/a.md", "a\n")], {
      fs: fs as Fs,
      files: { "docs/a.md": "a\n" },
    });
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: delete requires filesystem unlink support: docs/a.md",
    );
    expect(s.read("docs/a.md")).toBe("a\n");
    expect(s.journal().state).toBe("rolled_back");
  });

  test("a failed rename removes its staged copy and rolls back", async () => {
    stubDelete();
    let renames = 0;
    const fs = {
      ...nodeFilesystem,
      rename: async (from: string, to: string) => {
        renames += 1;
        if (renames === 2) throw new Error("rename failed");
        await nodeFilesystem.rename?.(from, to);
      },
    };
    const s = setup(
      [
        write("docs/new.md", "new\n"),
        write("docs/old.md", "changed\n", "old\n"),
      ],
      { fs: fs as Fs, files: { "docs/old.md": "old\n" } },
    );
    let committed = 0;
    expect(
      (
        await fail(
          s.run(() => {
            committed += 1;
          }),
        )
      ).message,
    ).toBe("rename failed");
    expect(committed).toBe(0);
    expect(s.files("docs")).toEqual(["docs/old.md"]);
    expect(s.read("docs/old.md")).toBe("old\n");
    expect(s.journal().state).toBe("rolled_back");
    expect(s.journal().entries).toHaveLength(2);
  });

  test("a failed staged write without unlink rolls back by rewriting", async () => {
    stubDelete();
    const { unlink: _unlink, ...base } = nodeFilesystem;
    const fs = {
      ...base,
      rename: async () => {
        throw new Error("rename failed");
      },
    };
    const s = setup([write("docs/new.md", "new\n")], { fs: fs as Fs });
    expect((await fail(s.run())).message).toBe("rename failed");
    expect(s.read("docs/new.md")).toBe("");
  });

  test("rollback failures keep the original error", async () => {
    stubDelete();
    let failing = false;
    const fs = {
      ...nodeFilesystem,
      rename: async () => {
        failing = true;
        throw new Error("rename failed");
      },
      unlink: async () => {
        throw new Error("unlink failed");
      },
      mkdir: async (dir: string) => {
        if (failing) throw new Error("mkdir failed");
        await nodeFilesystem.mkdir(dir);
      },
    };
    const s = setup([write("docs/new.md", "new\n")], { fs: fs as Fs });
    expect((await fail(s.run())).message).toBe("rename failed");
    expect(s.journal().state).toBe("publishing_sources");
  });

  test("a receipt failure after the commit asks for repair", async () => {
    stubDelete();
    for (const thrown of [
      new Error("receipt failed"),
      "receipt text",
      new OperationError("RECEIPT", "typed", false),
    ]) {
      const spy = track(
        spyOn(
          journalModule,
          "reconcilePendingSourceReceipts",
        ).mockImplementation(() => {
          throw thrown;
        }),
      );
      const s = setup([write("docs/a.md", "a\n")]);
      let committed = 0;
      const error = (await fail(
        s.run(() => {
          committed += 1;
        }),
      )) as OperationError;
      spy.mockRestore();
      expect(committed).toBe(1);
      expect(s.read("docs/a.md")).toBe("a\n");
      expect(s.journal().state).toBe("repair_required");
      expect(error).toBeInstanceOf(OperationError);
      if (thrown instanceof OperationError) {
        expect(error).toBe(thrown);
        continue;
      }
      expect(error.code).toBe("SOURCE_COMMIT_REPAIR_REQUIRED");
      expect(error.retryable).toBe(false);
      const detail = thrown instanceof Error ? thrown.message : thrown;
      expect(error.message).toBe(
        `Source plan ${s.plan.planHash} committed its authoritative bytes, but postcommit repair metadata failed: ${detail}; recovery journal ${s.journalId} is marked repair_required; use kb_apply_plan recoveryJournalId=${s.journalId} instead of retrying the original mutation`,
      );
    }
  });

  test("new and deleted files are bound to pending receipts", async () => {
    stubDelete();
    const receipts = track(
      spyOn(journalModule, "reconcilePendingSourceReceipts"),
    );
    const writes = [write("docs/a.md", "a\n"), remove("docs/b.md", "b\n")];
    const s = setup(writes, { files: { "docs/b.md": "b\n" } });
    await s.run();
    expect(receipts.mock.calls).toEqual([[s.root, writes]]);
  });

  test("sources are committed before the compiled retraction runs", async () => {
    let seen: unknown;
    const s = setup([write("docs/a.md", "a\n")]);
    stubDelete(async () => {
      seen = s.journal().state;
      return { content: [], structuredContent: { deleted: 0 } };
    });
    await s.run();
    expect(seen).toBe("sources_committed");
  });

  test("a crash before publishing leaves the prepared journal", async () => {
    stubDelete();
    let mkdirs = 0;
    const fs = {
      ...nodeFilesystem,
      mkdir: async (dir: string) => {
        mkdirs += 1;
        if (mkdirs > 1) throw new Error("mkdir failed");
        await nodeFilesystem.mkdir(dir);
      },
    };
    const s = setup([write("docs/a.md", "a\n")], { fs: fs as Fs });
    expect((await fail(s.run())).message).toBe("mkdir failed");
    expect(s.read(s.journalPath)).toBe(
      `${JSON.stringify(
        {
          version: 1,
          planHash: s.plan.planHash,
          state: "prepared",
          entries: [
            {
              path: "docs/a.md",
              mode: "write",
              beforeHash: null,
              afterHash: sha("a\n"),
              beforeExisted: false,
              beforeStage: path.join(
                s.root,
                ".kb",
                "recovery",
                `${s.journalId}-0.before`,
              ),
              afterStage: path.join(
                s.root,
                ".kb",
                "recovery",
                `${s.journalId}-0.after`,
              ),
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
  });
});

describe("re-running a journaled source plan", () => {
  function journalFor(
    s: ReturnType<typeof setup>,
    state: string,
    overrides: Record<string, unknown> = {},
  ) {
    return { ...s.journal(), state, ...overrides };
  }

  async function primed(
    writes: SourceWritePlan[],
    files: Record<string, string> = {},
  ) {
    stubDelete();
    const s = setup(writes, { files });
    await s.run();
    return s;
  }

  test.each([
    "committed",
    "sources_committed",
    "compiled_published",
    "repair_required",
  ])(
    "a %s journal whose files hold the after bytes refuses a retry",
    async (state) => {
      const s = await primed(
        [write("docs/a.md", "a\n"), remove("docs/b.md", "b\n")],
        {
          "docs/b.md": "b\n",
        },
      );
      writeFileSync(
        path.join(s.root, s.journalPath),
        JSON.stringify(journalFor(s, state)),
      );
      let committed = 0;
      expect(
        (
          await fail(
            s.run(() => {
              committed += 1;
            }),
          )
        ).message,
      ).toBe(
        `MUTATION_ALREADY_COMMITTED: source plan ${s.plan.planHash} already crossed the authoritative commit boundary; use kb_apply_plan recoveryJournalId=${s.journalId} instead of retrying the original mutation`,
      );
      expect(committed).toBe(0);
    },
  );

  test("a committed journal whose files drifted applies again", async () => {
    const s = await primed([write("docs/a.md", "a\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "committed")),
    );
    writeFileSync(path.join(s.root, "docs/a.md"), "drift\n");
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: source hash changed for docs/a.md",
    );
  });

  test("a committed journal whose written file vanished applies again", async () => {
    const s = await primed([write("docs/a.md", "a\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "committed")),
    );
    const { unlinkSync } = await import("node:fs");
    unlinkSync(path.join(s.root, "docs/a.md"));
    await s.run();
    expect(s.read("docs/a.md")).toBe("a\n");
  });

  test("a committed delete whose file came back applies again", async () => {
    const s = await primed([remove("docs/b.md", "b\n")], {
      "docs/b.md": "b\n",
    });
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "committed")),
    );
    writeFileSync(path.join(s.root, "docs/b.md"), "b\n");
    await s.run();
    expect(s.exists("docs/b.md")).toBe(false);
  });

  test.each(["prepared", "publishing_sources"])(
    "a %s journal restores every before image",
    async (state) => {
      const s = await primed(
        [
          write("docs/new.md", "new\n"),
          write("docs/old.md", "changed\n", "old\n"),
        ],
        { "docs/old.md": "old\n" },
      );
      writeFileSync(
        path.join(s.root, s.journalPath),
        JSON.stringify(journalFor(s, state)),
      );
      let committed = 0;
      const result = await s.run(() => {
        committed += 1;
      });
      expect(committed).toBe(1);
      expect(result.structuredContent).toMatchObject({
        sourcePaths: ["docs/new.md", "docs/old.md"],
        recoveryJournalId: s.journalId,
      });
      expect(s.exists("docs/new.md")).toBe(false);
      expect(s.read("docs/old.md")).toBe("old\n");
      expect(s.journal().state).toBe("compiled_published");
      expect(s.read(s.journalPath)).toContain('"state": "compiled_published"');
    },
  );

  test("a rolled-back restore is written as a formatted journal", async () => {
    const s = await primed([write("docs/new.md", "new\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "prepared")),
    );
    const marks = track(spyOn(nodeFilesystem, "writeFile"));
    await s.run();
    const journalWrites = marks.mock.calls.filter(
      ([file]) => file === path.join(s.root, s.journalPath),
    );
    expect(journalWrites[0]?.[1]).toBe(
      `${JSON.stringify(journalFor(s, "rolled_back"), null, 2)}\n`,
    );
  });

  test("a restore without unlink support leaves new files", async () => {
    stubDelete();
    const { unlink: _unlink, ...fs } = nodeFilesystem;
    const s = setup([write("docs/new.md", "new\n")], { fs: fs as Fs });
    await s.run();
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "prepared")),
    );
    await s.run();
    expect(s.read("docs/new.md")).toBe("new\n");
  });

  test("a target changed outside the journal refuses the restore", async () => {
    const s = await primed([write("docs/new.md", "new\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "prepared")),
    );
    writeFileSync(path.join(s.root, "docs/new.md"), "other\n");
    expect((await fail(s.run())).message).toBe(
      "Apply plan recovery refused: docs/new.md changed outside its journal",
    );
  });

  test("a vanished target is restorable when it had no before image", async () => {
    const s = await primed([write("docs/new.md", "new\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "prepared")),
    );
    const { unlinkSync } = await import("node:fs");
    unlinkSync(path.join(s.root, "docs/new.md"));
    const error = await fail(s.run());
    expect(error.message).toContain("ENOENT");
  });

  test.each([
    ["version", { version: 2 }],
    ["planHash", { planHash: "b".repeat(64) }],
    ["entries", { entries: "x" }],
    ["state", { state: "unknown" }],
    ["entry kind", { entries: [null] }],
    ["entry count", { entries: [] }],
  ])("a journal with a foreign %s is ignored", async (_name, edit) => {
    const s = await primed([write("docs/a.md", "a\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "committed", edit)),
    );
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: source hash changed for docs/a.md",
    );
  });

  test.each([
    ["path", { path: "docs/b.md" }],
    ["mode", { mode: "delete" }],
    ["beforeHash", { beforeHash: sha("x") }],
    ["afterHash", { afterHash: sha("x") }],
  ])("a journal entry with another %s is ignored", async (_name, edit) => {
    const s = await primed([
      write("docs/z.md", "z\n"),
      write("docs/a.md", "a\n"),
    ]);
    const journal = s.journal();
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(
        journalFor(s, "prepared", {
          entries: [journal.entries[0], { ...journal.entries[1], ...edit }],
        }),
      ),
    );
    expect((await fail(s.run())).message).toBe(
      "Apply plan failed: source hash changed for docs/z.md",
    );
  });

  test("a journal entry without mode matches a plain write", async () => {
    const { mode: _mode, ...modeless } = write("docs/a.md", "a\n");
    const s = await primed([modeless as SourceWritePlan]);
    const journal = s.journal();
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "committed")),
    );
    expect(journal.entries[0].mode).toBe("write");
    expect((await fail(s.run())).message).toStartWith(
      "MUTATION_ALREADY_COMMITTED",
    );
  });

  test("a rolled-back journal is applied again", async () => {
    const s = await primed([write("docs/a.md", "a\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify(journalFor(s, "rolled_back")),
    );
    const { unlinkSync } = await import("node:fs");
    unlinkSync(path.join(s.root, "docs/a.md"));
    await s.run();
    expect(s.read("docs/a.md")).toBe("a\n");
    expect(s.journal().state).toBe("compiled_published");
  });
});

describe("source journal recovery", () => {
  function stubSync(result: Record<string, unknown> = {}) {
    return track(
      spyOn(syncModule, "syncCommand").mockImplementation(
        async () => ({ branch: "develop", ...result }) as never,
      ),
    );
  }

  async function committedJournal(
    writes: SourceWritePlan[],
    files: Record<string, string> = {},
  ) {
    stubDelete(async () => {
      throw new Error("store down");
    });
    const s = setup(writes, { files });
    await s.run();
    const recover = (journalId = s.journalId, onCommitted?: () => void) =>
      executeApplyPlan(
        { recoveryJournalId: journalId } as never,
        s.context,
        onCommitted,
      );
    return { ...s, recover };
  }

  test("a repair_required journal replays and rebuilds", async () => {
    const s = await committedJournal(
      [write("docs/a.md", "a\n"), remove("docs/b.md", "b\n")],
      { "docs/b.md": "b\n" },
    );
    const sync = stubSync({
      entityCounts: { req: 2, test: 3 },
      relationshipCount: 4,
    });
    const receipts = track(
      spyOn(journalModule, "reconcilePendingSourceReceipts"),
    );
    let committed = 0;
    const result = await s.recover(undefined, () => {
      committed += 1;
    });
    expect(committed).toBe(1);
    expect(sync.mock.calls).toEqual([
      [{ workspaceRoot: s.root, rebuild: true }],
    ]);
    const writes = [
      {
        path: "docs/a.md",
        mode: "write",
        beforeHash: null,
        afterHash: sha("a\n"),
        body: "a\n",
      },
      {
        path: "docs/b.md",
        mode: "delete",
        beforeHash: sha("b\n"),
        afterHash: null,
      },
    ];
    expect(receipts.mock.calls).toStrictEqual([
      [s.root, s.journal().entries],
      [s.root, writes],
    ]);
    expect(result).toEqual({
      content: [
        { type: "text", text: `Repaired source journal ${s.journalId}.` },
      ],
      structuredContent: {
        version: "kibi.plan-apply-result.v1",
        outcome: "replayed",
        planHash: s.plan.planHash,
        changedEntities: 5,
        changedRelationships: 4,
        changedPaths: ["docs/a.md", "docs/b.md"],
        finalSnapshots: {
          branch: "develop",
          kbSnapshotId: "recovered",
          workspaceSnapshot: "recovered",
        },
        validationSummary: {
          stepsValidated: 0,
          stepsApplied: 0,
          sourceHashesChecked: 2,
          notes: [
            "Compiled state rebuilt from the authoritative recovery journal.",
          ],
        },
        recoveryJournalId: s.journalId,
      } as never,
    });
    expect(s.journal().state).toBe("committed");
  });

  test("a failure after the replayed commit releases the lock as committed", async () => {
    const s = await committedJournal([write("docs/a.md", "a\n")]);
    track(
      spyOn(syncModule, "syncCommand").mockImplementation(async () => {
        throw new Error("sync failed");
      }),
    );
    const release = track(
      spyOn(lockModule, "releaseWorkspaceMutationLock").mockImplementation(
        () => undefined,
      ),
    );
    track(
      spyOn(lockModule, "acquireWorkspaceMutationLock").mockImplementation(
        async () => ({ token: "t" }) as never,
      ),
    );
    const error = await fail(s.recover());
    expect(error.message).toBe("sync failed");
    expect(release.mock.calls[0]?.slice(1)).toEqual([{ error }, true]);
  });

  test("a sync without counts reports zero changes", async () => {
    const s = await committedJournal([write("docs/a.md", "a\n")]);
    stubSync();
    const result = await s.recover();
    expect(result.structuredContent).toMatchObject({
      changedEntities: 0,
      changedRelationships: 0,
    });
  });

  test.each(["sources_committed", "compiled_published"])(
    "a %s journal is recoverable",
    async (state) => {
      const s = await committedJournal([write("docs/a.md", "a\n")]);
      writeFileSync(
        path.join(s.root, s.journalPath),
        JSON.stringify({ ...s.journal(), state }),
      );
      stubSync();
      await expect(s.recover()).resolves.toBeDefined();
    },
  );

  test.each([
    ["version", { version: 2 }],
    ["planHash", { planHash: 7 }],
    ["entries", { entries: "x" }],
    ["state", { state: "prepared" }],
    ["missing state", { state: undefined }],
  ])("a journal with a bad %s is refused", async (_name, edit) => {
    const s = await committedJournal([write("docs/a.md", "a\n")]);
    writeFileSync(
      path.join(s.root, s.journalPath),
      JSON.stringify({ ...s.journal(), ...edit }),
    );
    expect((await fail(s.recover())).message).toBe(
      "Source recovery requires a committed or repair_required journal",
    );
  });

  test("recovery needs a filesystem and a plain journal id", async () => {
    const h = harness({ fs: null });
    expect(
      (
        await fail(
          executeApplyPlan(
            { recoveryJournalId: "source-writes-x" } as never,
            h.context,
          ),
        )
      ).message,
    ).toBe("Source recovery requires a filesystem-capable runtime");
    const s = harness();
    for (const id of ["a/b", "x y", ""]) {
      expect(
        (
          await fail(
            executeApplyPlan({ recoveryJournalId: id } as never, s.context),
          )
        ).message,
      ).toBe("Source recovery journal ID is invalid");
    }
    expect(
      (
        await fail(
          executeApplyPlan(
            { recoveryJournalId: "A-b_c.d" } as never,
            s.context,
          ),
        )
      ).message,
    ).toContain("ENOENT");
  });
});
