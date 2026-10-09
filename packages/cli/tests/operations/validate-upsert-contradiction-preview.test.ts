// implements REQ-kibi-operation-interface-parity, REQ-kibi-truthful-consistency
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildUpsertContradictionPreviewGoal } from "../../src/operations/mutation/contradictions.js";
import { executeUpsert } from "../../src/operations/mutation/upsert.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

type Recorded = { goals: string[]; context: OperationContext };

/**
 * A store whose preview goal refuses with the commit's structured
 * contradiction record; every other read succeeds with no rows.
 */
async function recordingContext(refusePreview: boolean): Promise<Recorded> {
  const root = await mkdtemp(path.join(tmpdir(), "kibi-dryrun-preview-"));
  workspaces.push(root);
  const goals: string[] = [];
  const prolog: PrologPort = {
    query: async (goal): Promise<PrologQueryResult> => {
      const text = Array.isArray(goal) ? goal.join(", ") : goal;
      goals.push(text);
      if (text.startsWith("kb_preview_upsert_contradiction(")) {
        return refusePreview
          ? {
              success: false,
              bindings: {},
              error: "(stage=contradiction_check)",
              errorRecord: {
                code: "contradiction",
                message: "Contradiction detected",
                conflicts: [
                  {
                    otherId: "REQ-QUOTA-CALL",
                    reason:
                      "Value conflict on client.call_quota.remaining: gt 0 vs eq 0",
                  },
                ],
              },
            }
          : { success: true, bindings: {} };
      }
      if (text.startsWith("kb_commit_upsert(")) {
        throw new Error("a dry run must never reach the commit goal");
      }
      return { success: true, bindings: { Results: "[]" } };
    },
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    goals,
    context: {
      workspaceRoot: root,
      signal: new AbortController().signal,
      clock: () => new Date("2026-10-09T00:00:00.000Z"),
      prolog,
      branchAttachment: {
        gitBranch: "develop",
        kbBranch: "develop",
        storePath: path.join(root, ".kb", "branches", "develop"),
        kind: "exact",
        migrationRequired: false,
      },
    },
  };
}

const REQUIREMENT = {
  type: "req",
  id: "REQ-quota-free-tier",
  properties: { title: "Free-tier remaining quota is zero", status: "open" },
  relationships: [
    {
      type: "relates_to",
      from: "REQ-quota-free-tier",
      to: "REQ-QUOTA-CALL",
    },
  ],
} as const;

describe("kb_upsert dryRun previews the commit-time contradiction check", () => {
  test("the preview goal stages the same entity and relationships as the commit, inside a rolled-back transaction", () => {
    const goal = buildUpsertContradictionPreviewGoal({
      entity: { type: "req", id: "REQ-a", title: "A" },
      relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-b" }],
      skipContradictionCheck: false,
    });
    expect(goal.startsWith("kb_preview_upsert_contradiction(req, [")).toBe(
      true,
    );
    expect(goal).toContain("rel(relates_to, 'REQ-a', 'REQ-b'");
    expect(goal).not.toContain("ChangeKind");
  });

  test("a requirement the commit would refuse is reported invalid with the commit's message", async () => {
    const { goals, context } = await recordingContext(true);
    const result = await executeUpsert(
      { ...REQUIREMENT, dryRun: true },
      context,
    );
    const payload = result.structuredContent as unknown as {
      valid: boolean;
      errors: string[];
      dryRun: boolean;
      skippedEffects: string[];
    };
    expect(payload.dryRun).toBe(true);
    expect(payload.skippedEffects).toEqual(["kb-write", "workspace-write"]);
    expect(payload.valid).toBe(false);
    expect(payload.errors).toHaveLength(1);
    expect(payload.errors[0]).toContain(
      "Contradiction detected for requirement REQ-quota-free-tier",
    );
    expect(payload.errors[0]).toContain("Conflicts with REQ-QUOTA-CALL");
    expect(payload.errors[0]).toContain("(stage=contradiction_check)");
    expect(
      goals.filter((goal) =>
        goal.startsWith("kb_preview_upsert_contradiction("),
      ),
    ).toHaveLength(1);
    expect(goals.some((goal) => goal.startsWith("kb_commit_upsert("))).toBe(
      false,
    );
  });

  test("a requirement the commit would accept stays valid", async () => {
    const { goals, context } = await recordingContext(false);
    const result = await executeUpsert(
      { ...REQUIREMENT, dryRun: true },
      context,
    );
    const payload = result.structuredContent as unknown as {
      valid: boolean;
      errors: string[];
    };
    expect(payload.errors).toEqual([]);
    expect(payload.valid).toBe(true);
    expect(
      goals.some((goal) => goal.startsWith("kb_preview_upsert_contradiction(")),
    ).toBe(true);
  });

  test("the preview is skipped where the commit skips the check: non-requirements and _skipContradictionCheck", async () => {
    const skipped = await recordingContext(true);
    const skippedResult = await executeUpsert(
      { ...REQUIREMENT, dryRun: true, _skipContradictionCheck: true },
      skipped.context,
    );
    expect(
      (skippedResult.structuredContent as unknown as { valid: boolean }).valid,
    ).toBe(true);
    expect(
      skipped.goals.some((goal) =>
        goal.startsWith("kb_preview_upsert_contradiction("),
      ),
    ).toBe(false);

    const fact = await recordingContext(true);
    const factResult = await executeUpsert(
      {
        type: "fact",
        id: "FACT-quota-note",
        properties: {
          title: "Quota note",
          status: "active",
          fact_kind: "observation",
        },
        dryRun: true,
      },
      fact.context,
    );
    expect(
      (factResult.structuredContent as unknown as { valid: boolean }).valid,
    ).toBe(true);
    expect(
      fact.goals.some((goal) =>
        goal.startsWith("kb_preview_upsert_contradiction("),
      ),
    ).toBe(false);
  });
});
