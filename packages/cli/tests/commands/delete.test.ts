import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createParityWorkspace } from "../parity/helpers.js";
import { runCliJsonRoute } from "../parity/runner.js";

type CliRun = Awaited<ReturnType<typeof runCliJsonRoute>>;

function envelope(result: CliRun): Record<string, unknown> {
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

type RouteData = {
  deleted: number;
  errors: string[];
  outcome?: string;
  dryRun?: boolean;
  deletionPlan: {
    version: string;
    planHash: string;
    entityIds: string[];
    sourceWrites: { path: string; mode: string }[];
  };
  nextActions: { operation: string; input: unknown }[];
  relationships_deleted?: number;
  wouldDelete?: unknown;
  sourceWrites: { path: string }[];
  skippedEffects?: string[];
  planHash?: string;
  sourcePaths?: string[];
  entities?: unknown[];
};

function dataOf(result: CliRun): RouteData {
  return envelope(result).data as RouteData;
}

async function upsertScenario(root: string, id: string): Promise<void> {
  const result = await runCliJsonRoute(root, "upsert", {
    type: "scenario",
    id,
    properties: { title: `Scenario ${id}`, status: "active" },
    document: {
      path: `scenarios/${id}.md`,
      body: "Given a scenario, when it is deleted, then it is gone.",
    },
  });
  expect(result.exitCode, result.stderr).toBe(0);
}

/** Every file under .kb/relationships plus the given sources, as bytes. */
async function snapshotFiles(
  root: string,
  extra: readonly string[],
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const shardDir = path.join(root, ".kb", "relationships");
  const shards = existsSync(shardDir) ? await readdir(shardDir) : [];
  for (const name of shards) {
    const absolute = path.join(shardDir, name);
    files.set(absolute, await readFile(absolute, "utf8"));
  }
  for (const relative of extra) {
    const absolute = path.join(root, relative);
    files.set(absolute, await readFile(absolute, "utf8"));
  }
  return files;
}

describe("delete JSON command", () => {
  test("refuses an authored requirement and points to the supersession upsert", async () => {
    // Given
    const workspace = await createParityWorkspace();

    try {
      const seeded = await runCliJsonRoute(workspace.root, "upsert", {
        type: "req",
        id: "REQ-DELETE-CLI",
        properties: { title: "Delete through CLI", status: "open" },
        document: { path: "requirements/REQ-DELETE-CLI.md" },
      });
      expect(seeded.exitCode, seeded.stderr).toBe(0);

      // When
      const result = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["REQ-DELETE-CLI", "REQ-MISSING"],
      });

      // Then
      expect(result.exitCode, result.stderr).toBe(0);
      const data = dataOf(result);
      expect(data.deleted).toBe(0);
      expect(data.outcome).toBe("supersession_required");
      expect(data.deletionPlan.version).toBe("kibi.entity-deletion-plan.v1");
      expect(data.deletionPlan.entityIds).toEqual(["REQ-DELETE-CLI"]);
      expect(data.deletionPlan.sourceWrites[0].mode).toBe("delete");
      // Only the genuinely failed id is an error; the plan is not.
      expect(data.errors).toEqual(["Entity REQ-MISSING does not exist"]);
      expect(data.nextActions).toEqual([
        expect.objectContaining({
          operation: "kb_upsert",
          required: true,
          input: expect.objectContaining({
            type: "req",
            relationships: [
              expect.objectContaining({
                type: "supersedes",
                to: "REQ-DELETE-CLI",
              }),
            ],
          }),
        }),
      ]);
      expect(
        existsSync(path.join(workspace.root, "requirements/REQ-DELETE-CLI.md")),
      ).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  }, 30_000);

  test("returns an authored deletion plan whose nextActions input applies unmodified", async () => {
    const workspace = await createParityWorkspace();

    try {
      await upsertScenario(workspace.root, "SCEN-DELETE-PLAN");
      const sourcePath = path.join(
        workspace.root,
        "scenarios/SCEN-DELETE-PLAN.md",
      );

      const planned = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SCEN-DELETE-PLAN"],
      });
      expect(planned.exitCode, planned.stderr).toBe(0);
      const result = envelope(planned);
      const data = dataOf(planned);
      expect(result.status).toBe("success");
      expect(data.outcome).toBe("plan_returned");
      expect(data.errors).toEqual([]);
      expect(data.deleted).toBe(0);
      expect(existsSync(sourcePath)).toBe(true);
      const expectedAction = {
        operation: "kb_apply_plan",
        input: {
          plan: data.deletionPlan,
          approvedPlanHash: data.deletionPlan.planHash,
        },
        reason: expect.any(String),
        required: true,
      };
      expect(data.nextActions).toEqual([expectedAction]);
      // The envelope surfaces the same typed next action.
      expect(result.nextActions).toEqual([expectedAction]);

      const applied = await runCliJsonRoute(
        workspace.root,
        "apply-plan",
        data.nextActions[0].input,
      );
      expect(applied.exitCode, applied.stderr).toBe(0);
      expect(dataOf(applied).deleted).toBe(1);
      expect(existsSync(sourcePath)).toBe(false);
    } finally {
      await workspace.cleanup();
    }
  }, 60_000);

  test("applies the freshly computed plan when approvedPlanHash matches", async () => {
    const workspace = await createParityWorkspace();

    try {
      await upsertScenario(workspace.root, "SCEN-DELETE-APPROVED");
      const sourcePath = path.join(
        workspace.root,
        "scenarios/SCEN-DELETE-APPROVED.md",
      );
      const planned = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SCEN-DELETE-APPROVED"],
      });
      expect(planned.exitCode, planned.stderr).toBe(0);
      const planHash = dataOf(planned).deletionPlan.planHash;

      // A different hash is refused before anything is written.
      const mismatch = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SCEN-DELETE-APPROVED"],
        approvedPlanHash: "0".repeat(64),
      });
      expect(mismatch.exitCode).not.toBe(0);
      const mismatchError = envelope(mismatch).error as Record<string, unknown>;
      expect(mismatchError.code).toBe("DELETE_PLAN_HASH_MISMATCH");
      expect(String(mismatchError.message)).toContain(planHash.slice(0, 12));
      expect(existsSync(sourcePath)).toBe(true);

      const applied = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SCEN-DELETE-APPROVED"],
        approvedPlanHash: planHash,
      });
      expect(applied.exitCode, applied.stderr).toBe(0);
      const data = dataOf(applied);
      expect(data.outcome).toBe("plan_applied");
      expect(data.deleted).toBe(1);
      expect(data.planHash).toBe(planHash);
      expect(data.sourcePaths).toContain("scenarios/SCEN-DELETE-APPROVED.md");
      expect(existsSync(sourcePath)).toBe(false);

      const query = await runCliJsonRoute(workspace.root, "query", {
        id: "SCEN-DELETE-APPROVED",
      });
      expect(query.exitCode, query.stderr).toBe(0);
      expect(dataOf(query).entities).toEqual([]);
    } finally {
      await workspace.cleanup();
    }
  }, 60_000);

  test("dryRun previews a relationship delete without changing sources or the store", async () => {
    const workspace = await createParityWorkspace();

    try {
      await upsertScenario(workspace.root, "SCEN-DELETE-DRY");
      await upsertScenario(workspace.root, "SCEN-DELETE-DRY-TARGET");
      const linked = await runCliJsonRoute(workspace.root, "upsert", {
        type: "scenario",
        id: "SCEN-DELETE-DRY",
        properties: { title: "Scenario SCEN-DELETE-DRY", status: "active" },
        relationships: [
          {
            type: "relates_to",
            from: "SCEN-DELETE-DRY",
            to: "SCEN-DELETE-DRY-TARGET",
          },
        ],
      });
      expect(linked.exitCode, linked.stderr).toBe(0);
      const selector = {
        type: "relates_to",
        from: "SCEN-DELETE-DRY",
        to: "SCEN-DELETE-DRY-TARGET",
      };
      const before = await snapshotFiles(workspace.root, [
        "scenarios/SCEN-DELETE-DRY.md",
      ]);

      const preview = await runCliJsonRoute(workspace.root, "delete", {
        relationships: [selector],
        dryRun: true,
      });

      expect(preview.exitCode, preview.stderr).toBe(0);
      const data = dataOf(preview);
      expect(data.outcome).toBe("dry_run");
      expect(data.dryRun).toBe(true);
      expect(data.relationships_deleted).toBe(0);
      expect(data.wouldDelete).toEqual(
        expect.objectContaining({ relationships: 1, compiledEdges: 1 }),
      );
      expect(data.sourceWrites.length).toBeGreaterThan(0);
      expect(data.skippedEffects).toEqual(["kb-write", "workspace-write"]);
      const effects = envelope(preview).effects as Record<string, unknown>[];
      expect(effects.map((effect) => effect.status)).toEqual([
        "not_applicable",
        "not_applicable",
      ]);
      expect(
        await snapshotFiles(workspace.root, ["scenarios/SCEN-DELETE-DRY.md"]),
      ).toEqual(before);

      // The compiled edge is still there: the real delete retracts it.
      const committed = await runCliJsonRoute(workspace.root, "delete", {
        relationships: [selector],
      });
      expect(committed.exitCode, committed.stderr).toBe(0);
      expect(dataOf(committed).relationships_deleted).toBe(1);
      expect(dataOf(committed).sourceWrites.map((write) => write.path)).toEqual(
        data.sourceWrites.map((write) => write.path),
      );
    } finally {
      await workspace.cleanup();
    }
  }, 60_000);

  test("dryRun on authored ids returns the plan and writes nothing", async () => {
    const workspace = await createParityWorkspace();

    try {
      await upsertScenario(workspace.root, "SCEN-DELETE-DRY-PLAN");
      const sourcePath = "scenarios/SCEN-DELETE-DRY-PLAN.md";
      const before = await snapshotFiles(workspace.root, [sourcePath]);

      const preview = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SCEN-DELETE-DRY-PLAN"],
        dryRun: true,
      });

      expect(preview.exitCode, preview.stderr).toBe(0);
      const data = dataOf(preview);
      expect(data.outcome).toBe("plan_returned");
      expect(data.dryRun).toBe(true);
      expect(data.deletionPlan.entityIds).toEqual(["SCEN-DELETE-DRY-PLAN"]);
      expect(await snapshotFiles(workspace.root, [sourcePath])).toEqual(before);

      const combined = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SCEN-DELETE-DRY-PLAN"],
        dryRun: true,
        approvedPlanHash: data.deletionPlan.planHash,
      });
      expect(combined.exitCode).not.toBe(0);
      expect(
        String(
          envelope(combined).error && JSON.stringify(envelope(combined).error),
        ),
      ).toContain("cannot be combined");
      expect(existsSync(path.join(workspace.root, sourcePath))).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  }, 60_000);

  test("composes two authored symbol deletions into one plan write", async () => {
    const workspace = await createParityWorkspace();

    try {
      const symbolsPath = path.join(workspace.root, "symbols.yaml");
      await writeFile(symbolsPath, "symbols: []\n", "utf8");
      const upsertSymbol = async (id: string, title: string) => {
        const result = await runCliJsonRoute(workspace.root, "upsert", {
          type: "symbol",
          id,
          properties: {
            title,
            status: "active",
            source: "symbols.yaml",
            sourceFile: "src/launcher.ts",
            symbol_role: "behavioral",
            granularity_reason: "legacy-link",
          },
          document: { path: "symbols.yaml" },
        });
        expect(result.exitCode, result.stderr).toBe(0);
      };

      await upsertSymbol("SYM-DELETE-FIRST", "first");
      await upsertSymbol("SYM-DELETE-SECOND", "second");

      const deletion = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SYM-DELETE-FIRST", "SYM-DELETE-SECOND"],
      });
      expect(deletion.exitCode, deletion.stderr).toBe(0);
      const deletionData = dataOf(deletion);
      expect(deletionData.deletionPlan.entityIds).toEqual([
        "SYM-DELETE-FIRST",
        "SYM-DELETE-SECOND",
      ]);
      expect(deletionData.deletionPlan.sourceWrites).toHaveLength(1);
      expect(deletionData.deletionPlan.sourceWrites[0].path).toBe(
        "symbols.yaml",
      );

      const applied = await runCliJsonRoute(workspace.root, "apply-plan", {
        plan: deletionData.deletionPlan,
        approvedPlanHash: deletionData.deletionPlan.planHash,
      });
      expect(applied.exitCode, applied.stderr).toBe(0);
      expect(dataOf(applied).deleted).toBe(2);

      const remaining = await readFile(symbolsPath, "utf8");
      expect(remaining).toBe("symbols: []\n");
    } finally {
      await workspace.cleanup();
    }
  }, 60_000);
});
