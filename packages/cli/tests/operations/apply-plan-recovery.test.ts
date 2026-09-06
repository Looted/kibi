import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { initCommand } from "../../src/commands/init.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import {
  type CompilePlanV1,
  compilePlanHash,
} from "../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import { asApply } from "../helpers/coverage-casts.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Recovery fixtures may never start an engine.
    }
    removeTempDir(root);
  }
});

function compileBody(
  overrides: Partial<CompilePlanV1> = {},
): Omit<CompilePlanV1, "planHash"> {
  return {
    version: "kibi.compile-plan.v1",
    status: "ready",
    expected: {
      branch: "main",
      kbSnapshotId: "missing",
      workspaceSnapshot: "a".repeat(64),
      sourceHashes: {},
    },
    target: {
      mode: "create",
      requirementId: "REQ-apply",
      selectionReason: "test",
    },
    discovery: { candidates: [], abstained: true },
    propositions: [],
    contradictionAnalysis: { outcome: "no_conflict", witnesses: [] },
    proposals: [],
    steps: [
      {
        type: "req",
        id: "REQ-apply",
        properties: { title: "Apply", status: "open" },
        relationships: [],
      },
    ],
    sourceWrites: [],
    diagnostics: [],
    ...overrides,
  };
}

function compilePlan(overrides: Partial<CompilePlanV1> = {}): CompilePlanV1 {
  const body = compileBody(overrides);
  return { ...body, planHash: compilePlanHash(body) };
}

function filesystemContext(
  workspaceRoot: string,
  extra?: {
    workspaceHash?: string;
    query?: OperationContext["prolog"];
    fs?: OperationContext["fs"];
  },
): OperationContext {
  const query: OperationContext["prolog"] = extra?.query ?? {
    query: async (goal): Promise<PrologQueryResult> =>
      goal.includes("kb_commit_upsert")
        ? { success: true, bindings: { ChangeKind: "created" } }
        : { success: true, bindings: { Results: "[]" } },
    queryStatusJson: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog: query,
    fs: extra?.fs ?? nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: extra?.workspaceHash ?? "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: path.join(workspaceRoot, ".kb", "branches", "main"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

describe("compile plan source recovery and write fallbacks", () => {
  test("compiled-store failure marks the journal repair_required", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const body = "Requirement body for repair\n";
    const afterHash = sha(body);
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/REQ-repair.md",
          mode: "write",
          beforeHash: null,
          afterHash,
          body,
        },
      ],
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(cwd, {
        query: {
          query: async (goal): Promise<PrologQueryResult> =>
            goal.includes("kb_commit_upsert")
              ? { success: false, bindings: {}, error: "derived boom" }
              : { success: true, bindings: { Results: "[]" } },
          queryStatusJson: async () => ({ success: true, bindings: {} }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
      }),
    );
    expect(asApply(result.structuredContent).status).toBe("committed_with_repairs");
    const journalId = asApply(result.structuredContent).recoveryJournalId;
    expect(journalId).toBeString();
    const journal = JSON.parse(
      readFileSync(path.join(cwd, ".kb", "recovery", `${journalId}.json`), "utf8"),
    ) as { state: string };
    expect(journal.state).toBe("repair_required");
    expect(existsSync(path.join(cwd, "docs", "REQ-repair.md"))).toBe(true);
  });

  test("source writes fall back to write+unlink when rename is unavailable", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const body = "No rename body\n";
    const afterHash = sha(body);
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/no-rename.md",
          mode: "write",
          beforeHash: null,
          afterHash,
          body,
        },
      ],
    });
    const { rename: _rename, ...rest } = nodeFilesystem;
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(cwd, { fs: rest }),
    );
    expect(result.structuredContent.outcome).toBe("applied");
    expect(readFileSync(path.join(cwd, "docs", "no-rename.md"), "utf8")).toBe(
      body,
    );
  });

  test(
    "executeSourceRecovery rebuilds compiled state from a planted journal",
    async () => {
      const restoreEnv = isolateKibiEnv();
      restores.push(restoreEnv);
      const cwd = createGitWorkspace();
      roots.push(cwd);
      await withCwd(cwd, () => initCommand({}));
      const body = `---
id: REQ-RECOVER
title: Recovered
status: open
type: req
---

Must remain independently testable.
`;
      const afterHash = sha(body);
      const planHash = "a".repeat(64);
      const journalId = `source-writes-${planHash.slice(0, 16)}`;
      const recoveryDir = path.join(cwd, ".kb", "recovery");
      mkdirSync(recoveryDir, { recursive: true });
      const afterStage = path.join(recoveryDir, `${journalId}-0.after`);
      writeFileSync(afterStage, body);
      mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
      writeFileSync(
        path.join(cwd, ".kb", "requirements", "REQ-RECOVER.md"),
        body,
      );
      writeFileSync(
        path.join(recoveryDir, `${journalId}.json`),
        `${JSON.stringify(
          {
            version: 1,
            planHash,
            state: "repair_required",
            entries: [
              {
                path: ".kb/requirements/REQ-RECOVER.md",
                mode: "write",
                beforeHash: null,
                afterHash,
                beforeExisted: false,
                beforeStage: path.join(recoveryDir, `${journalId}-0.before`),
                afterStage,
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      const result = await executeApplyPlan(
        { recoveryJournalId: journalId },
        filesystemContext(cwd),
      );
      expect(result.structuredContent.outcome).toBe("replayed");
      expect(
        readFileSync(
          path.join(cwd, ".kb", "requirements", "REQ-RECOVER.md"),
          "utf8",
        ),
      ).toBe(body);
    },
    90_000,
  );

  test("source recovery rejects an invalid journal payload", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "recovery", "source-writes-deadbeefdeadbee.json"),
      `${JSON.stringify({ version: 2, planHash: "x", state: "prepared", entries: [] })}\n`,
    );
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "source-writes-deadbeefdeadbee" },
        filesystemContext(cwd),
      ),
    ).rejects.toThrow(/committed or repair_required journal/);
  });
});
