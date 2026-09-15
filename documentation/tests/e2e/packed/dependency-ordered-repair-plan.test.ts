import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type RepairPlanResult = {
  repairPlan?: {
    version: string;
    planId: string;
    readOnly: boolean;
    status: string;
    scope: {
      complete: boolean;
      actionableRequirements: number;
      returnedActionableRequirements: number;
      excludedByPagination: number;
    };
    summary: { requirementCount: number; readyBatchCount: number };
    batches: Array<{
      id: string;
      requirementId: string;
      phase: string;
      state: string;
      dependsOn: string[];
      autoApplicable: boolean;
    }>;
  };
  legacyMigrationPlan?: {
    version: string;
    planId: string;
    readOnly: boolean;
    status: string;
    scope: {
      candidateRequirements: number;
      selectedRequirements: number;
      limit: number;
      nextOffset: number | null;
    };
    batches: Array<{
      requirementId: string;
      state: string;
      autoApplicable: boolean;
      sourceText: string | null;
      sourceBinding: { status: string; sourceHash: string | null };
      propositions: Array<{
        claimText: string;
        disposition: string;
        reviewRequired: boolean;
        span: { start: number; end: number };
        predicateCandidates: Array<{ writeEligible: boolean }>;
      }>;
    }>;
  };
};

type RepairPlanBatch = NonNullable<
  RepairPlanResult["repairPlan"]
>["batches"][number];

type RepairPlan = NonNullable<RepairPlanResult["repairPlan"]>;
type LegacyMigrationPlan = NonNullable<RepairPlanResult["legacyMigrationPlan"]>;

function assertDependencyOrderedPlan(plan: RepairPlan) {
  assert.strictEqual(plan.readOnly, true);
  assert.strictEqual(plan.status, "ready");
  assert.strictEqual(plan.scope.complete, true);
  assert.strictEqual(plan.summary.requirementCount, 2);
  assert.strictEqual(plan.summary.readyBatchCount, 2);
  assert.ok(plan.batches.every((batch) => !batch.autoApplicable));

  for (const requirementId of ["REQ-PACKED-PLAN-A", "REQ-PACKED-PLAN-B"]) {
    const requirementBatches: RepairPlanBatch[] = plan.batches.filter(
      (batch) => batch.requirementId === requirementId,
    );
    assert.ok(requirementBatches.length > 1);
    assert.strictEqual(requirementBatches[0]?.phase, "semantic_inventory");
    assert.strictEqual(requirementBatches[0]?.state, "ready");
    assert.ok(
      requirementBatches
        .slice(1)
        .every(
          (batch) => batch.state === "blocked" && batch.dependsOn.length > 0,
        ),
    );
  }
}

function assertLegacyMigrationPlan(plan: LegacyMigrationPlan) {
  assert.strictEqual(plan.version, "kibi.legacy-migration-plan.v1");
  assert.strictEqual(plan.readOnly, true);
  assert.strictEqual(plan.scope.selectedRequirements, 1);
  assert.strictEqual(plan.scope.limit, 1);
  assert.strictEqual(plan.scope.nextOffset, 1);
  assert.strictEqual(plan.batches.length, 1);
  const batch = plan.batches[0];
  assert.strictEqual(batch?.requirementId, "REQ-PACKED-PLAN-A");
  assert.strictEqual(batch?.state, "ready_for_review");
  assert.strictEqual(batch?.autoApplicable, false);
  assert.strictEqual(batch?.sourceBinding.status, "compatible");
  assert.match(batch?.sourceBinding.sourceHash ?? "", /^[a-f0-9]{64}$/);
  assert.strictEqual(
    batch?.sourceText,
    "REQ-PACKED-PLAN-A must remain traceable.",
  );
  assert.ok((batch?.propositions.length ?? 0) > 0);
  for (const proposition of batch?.propositions ?? []) {
    assert.strictEqual(proposition.reviewRequired, true);
    assert.ok(proposition.disposition.length > 0);
    assert.strictEqual(
      proposition.claimText,
      batch?.sourceText?.slice(proposition.span.start, proposition.span.end),
    );
    assert.ok(
      proposition.predicateCandidates.every(
        (candidate) => candidate.writeEligible === false,
      ),
    );
  }
}

async function cliJson<T>(sandbox: TestSandbox, args: readonly string[]) {
  const result = await kibi(sandbox, [...args]);
  assert.strictEqual(
    result.exitCode,
    0,
    `${args.join(" ")} failed: ${result.stdout}${result.stderr}`,
  );
  const parsed = JSON.parse(result.stdout) as { data?: T };
  return (parsed.data ?? parsed) as T;
}

function writeRequirement(sandbox: TestSandbox, id: string) {
  const relativePath = `.kb/requirements/${id}.md`;
  writeFileSync(
    join(sandbox.repoDir, relativePath),
    `---
id: ${id}
title: Packed repair plan fixture ${id}
status: open
priority: must
---

${id} must remain traceable.
`,
  );
  stageSourceFile(sandbox, relativePath);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: dependency-ordered repair plans", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(async () => {
      hasProlog = checkPrologAvailable();
      if (!hasProlog) return;
      tarballs = await packAll();
    });

    beforeEach(async () => {
      if (!hasProlog) return;
      sandbox = createSandbox();
      await sandbox.install(tarballs);
      await sandbox.initGitRepo();
      await kibi(sandbox, ["init"]);
      mkdirSync(join(sandbox.repoDir, ".kb", "requirements"), {
        recursive: true,
      });
      writeRequirement(sandbox, "REQ-PACKED-PLAN-A");
      writeRequirement(sandbox, "REQ-PACKED-PLAN-B");
      const sync = await kibi(sandbox, ["sync"]);
      assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
    });

    afterEach(async () => {
      if (sandbox) await sandbox.cleanup();
    });

    it(
      "routes Python coordinate misses to authored repair and recovers after explicit coarse anchoring",
      { timeout: 300_000 },
      async () => {
        if (!hasProlog) return;
        writeFileSync(
          join(sandbox.repoDir, "application.py"),
          "class Service:\n    def decide(self):\n        return True\n",
        );
        stageSourceFile(sandbox, "application.py");
        const requestPath = join(sandbox.repoDir, "coordinate-upsert.json");
        const upsert = async (coarse: boolean) => {
          writeFileSync(
            requestPath,
            JSON.stringify({
              type: "symbol",
              id: "SYM-PY-COORD",
              properties: {
                title: "Service.decide",
                status: "active",
                sourceFile: "application.py",
                symbol_role: "behavioral",
                ...(coarse ? { granularity_reason: "extractor-miss" } : {}),
              },
              relationships: [
                {
                  from: "SYM-PY-COORD",
                  to: "REQ-PACKED-PLAN-A",
                  type: "implements",
                },
              ],
            }),
          );
          for (const command of ["validate-upsert", "upsert"]) {
            const result = await kibi(sandbox, [
              command,
              "--input",
              requestPath,
            ]);
            assert.strictEqual(
              result.exitCode,
              0,
              result.stdout + result.stderr,
            );
            assert.strictEqual(
              JSON.parse(result.stdout).status,
              "success",
              result.stdout,
            );
          }
          stageSourceFile(sandbox, ".kb/symbols.yaml");
        };
        type Coverage = {
          rows: Array<{
            id: string;
            proofGaps: string[];
            proofStages: {
              sourceCoordinates: { status: string; missingSymbols: string[] };
            };
          }>;
          repairPlan: {
            batches: Array<{
              requirementId: string;
              phase: string;
              workflowSteps: string[];
              writePolicy: string;
            }>;
          };
          migrationPlan: {
            actions: Array<{
              code: string;
              safety: string;
              autoApplicable: boolean;
              affectedEntityIds: string[];
              invocation: { kind: string };
            }>;
          };
        };
        const coverage = () =>
          cliJson<Coverage>(sandbox, [
            "coverage",
            "--by",
            "req",
            "--include-passing",
            "--format",
            "json",
          ]);
        await upsert(false);
        for (let attempt = 0; attempt < 2; attempt++) {
          const refresh = await kibi(sandbox, [
            "sync",
            "--refresh-symbol-coordinates",
          ]);
          assert.strictEqual(
            refresh.exitCode,
            0,
            refresh.stdout + refresh.stderr,
          );
          assert.match(refresh.stdout, /refreshed=0, unchanged=0, failed=1/);
          assert.match(refresh.stdout, /failed SYM-PY-COORD/);
          const report = await coverage();
          assert.ok(
            report.rows
              .find((row) => row.id === "REQ-PACKED-PLAN-A")
              ?.proofGaps.includes("missing_symbol_coordinates"),
          );
          const batch = report.repairPlan.batches.find(
            (batch) =>
              batch.requirementId === "REQ-PACKED-PLAN-A" &&
              batch.phase === "source_coordinates",
          );
          assert.strictEqual(
            batch?.writePolicy,
            "review_then_sequential_upsert",
          );
          assert.deepStrictEqual(batch?.workflowSteps.slice(0, 3), [
            "kb_query",
            "kb_validate_upsert",
            "kb_upsert",
          ]);
          const action = report.migrationPlan.actions.find(
            (action) =>
              action.code === "coverage_source_coordinates" &&
              action.affectedEntityIds.includes("REQ-PACKED-PLAN-A"),
          );
          assert.strictEqual(action?.safety, "review");
          assert.strictEqual(action?.autoApplicable, false);
          assert.strictEqual(action?.invocation.kind, "review");
        }
        await upsert(true);
        const refresh = await kibi(sandbox, [
          "sync",
          "--refresh-symbol-coordinates",
        ]);
        assert.strictEqual(
          refresh.exitCode,
          0,
          refresh.stdout + refresh.stderr,
        );
        const recovered = await coverage();
        const requirement = recovered.rows.find(
          (row) => row.id === "REQ-PACKED-PLAN-A",
        );
        assert.ok(requirement);
        assert.ok(
          !requirement.proofGaps.includes("missing_symbol_coordinates"),
        );
        assert.strictEqual(
          requirement.proofStages.sourceCoordinates.status,
          "passed",
        );
        assert.ok(
          !recovered.repairPlan.batches.some(
            (batch) =>
              batch.requirementId === "REQ-PACKED-PLAN-A" &&
              batch.phase === "source_coordinates",
          ),
        );
      },
    );

    it(
      "fails pagination closed and orders non-auto-applicable batches without writes",
      { timeout: 300_000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        const beforeStatus = await cliJson<{
          snapshotId: string;
          dirty: boolean;
        }>(sandbox, ["status", "--format", "json"]);

        const partial = await cliJson<RepairPlanResult>(sandbox, [
          "coverage",
          "--by",
          "req",
          "--limit",
          "1",
          "--format",
          "json",
        ]);
        assert.strictEqual(partial.repairPlan?.version, "kibi.repair-plan.v1");
        assert.strictEqual(partial.repairPlan?.status, "partial");
        assert.strictEqual(partial.repairPlan?.scope.complete, false);
        assert.strictEqual(
          partial.repairPlan?.scope.returnedActionableRequirements,
          1,
        );
        assert.strictEqual(partial.repairPlan?.scope.excludedByPagination, 1);

        const complete = await cliJson<RepairPlanResult>(sandbox, [
          "coverage",
          "--by",
          "req",
          "--limit",
          "100",
          "--format",
          "json",
        ]);
        const repeated = await cliJson<RepairPlanResult>(sandbox, [
          "coverage",
          "--by",
          "req",
          "--limit",
          "100",
          "--format",
          "json",
        ]);
        const plan = complete.repairPlan;
        assert.ok(plan);
        assertDependencyOrderedPlan(plan);
        assert.strictEqual(repeated.repairPlan?.planId, plan.planId);

        const migration = await cliJson<RepairPlanResult>(sandbox, [
          "coverage",
          "--by",
          "req",
          "--limit",
          "100",
          "--include-migration-preview",
          "--migration-limit",
          "1",
          "--migration-predicate-min-score",
          "0",
          "--format",
          "json",
        ]);
        const repeatedMigration = await cliJson<RepairPlanResult>(sandbox, [
          "coverage",
          "--by",
          "req",
          "--limit",
          "100",
          "--include-migration-preview",
          "--migration-limit",
          "1",
          "--migration-predicate-min-score",
          "0",
          "--format",
          "json",
        ]);
        const migrationPlan = migration.legacyMigrationPlan;
        assert.ok(migrationPlan);
        assertLegacyMigrationPlan(migrationPlan);
        assert.strictEqual(
          repeatedMigration.legacyMigrationPlan?.planId,
          migrationPlan.planId,
        );

        const symbolCoverage = await cliJson<RepairPlanResult>(sandbox, [
          "coverage",
          "--by",
          "symbol",
          "--include-passing",
          "--format",
          "json",
        ]);
        assert.strictEqual(symbolCoverage.repairPlan, undefined);

        const table = await kibi(sandbox, [
          "coverage",
          "--by",
          "req",
          "--limit",
          "100",
          "--include-migration-preview",
        ]);
        assert.strictEqual(table.exitCode, 0, `${table.stdout}${table.stderr}`);
        assert.match(table.stdout, /Repair plan/);
        assert.match(table.stdout, /semantic_inventory/);
        assert.match(table.stdout, /Legacy migration preview/);

        const afterStatus = await cliJson<{
          snapshotId: string;
          dirty: boolean;
        }>(sandbox, ["status", "--format", "json"]);
        assert.strictEqual(afterStatus.snapshotId, beforeStatus.snapshotId);
        assert.strictEqual(afterStatus.dirty, beforeStatus.dirty);
      },
    );
  });
}
