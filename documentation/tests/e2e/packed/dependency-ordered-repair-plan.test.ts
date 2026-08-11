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
  return JSON.parse(result.stdout) as T;
}

function writeRequirement(sandbox: TestSandbox, id: string) {
  writeFileSync(
    join(sandbox.repoDir, "documentation", "requirements", `${id}.md`),
    `---
id: ${id}
title: Packed repair plan fixture ${id}
status: open
priority: must
---

${id} must remain traceable.
`,
  );
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
      mkdirSync(join(sandbox.repoDir, "documentation", "requirements"), {
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
      "fails pagination closed and orders non-auto-applicable batches without writes",
      { timeout: 300_000 },
      async () => {
        if (!hasProlog) return;
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
