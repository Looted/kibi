import { describe, expect, test } from "bun:test";
import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import {
  buildActionsFromStatus,
  buildMigrationPlan,
  mergeMigrationPlans,
  migrationPlanHash,
} from "../../src/public/operations/migration-plan.js";

describe("kibi.migration-plan.v2", () => {
  test("hashes equivalent action graphs deterministically", () => {
    const first = buildMigrationPlan({
      evaluatedDomains: ["schema", "branch"],
      actions: [
        {
          id: "schema-config-upgrade",
          code: "schema_version_upgrade",
          category: "schema",
          state: "ready",
          safety: "automatic",
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedEntityIds: [],
          affectedFiles: [".kb/config.json"],
          dependsOn: [],
          preconditions: [],
          postconditions: [],
          evidence: {},
          autoApplicable: true,
          dispositionRequired: false,
          allowedDispositions: ["fixed", "accepted", "deferred"],
        },
      ],
    });
    const second = buildMigrationPlan({
      evaluatedDomains: ["branch", "schema"],
      actions: [...first.actions].reverse(),
    });
    expect(second.planHash).toBe(first.planHash);
    expect(migrationPlanHash({ ...first, planHash: "ignored" })).toBe(
      first.planHash,
    );
  });

  test("emits a safe exact legacy branch action and does not normalize other branches", () => {
    const legacy = buildActionsFromStatus({
      workspaceRoot: "/tmp/project",
      branchAttachment: {
        gitBranch: "master",
        kbBranch: "main",
        kind: "legacy_compat",
        migrationRequired: true,
      },
      branchStore: { state: "healthy", path: ".kb/branches/main" },
      configStatus: {
        status: "current",
        currentVersion: 4,
        latestVersion: 4,
        needsMigration: false,
        warning: null,
        configHash: "a",
      },
    });
    expect(legacy.actions[0]).toMatchObject({
      code: "legacy_branch_storage",
      safety: "automatic",
      autoApplicable: true,
    });

    const ambiguous = buildActionsFromStatus({
      workspaceRoot: "/tmp/project",
      branchAttachment: {
        gitBranch: "develop",
        kbBranch: "main",
        kind: "legacy_compat",
        migrationRequired: true,
      },
      branchStore: { state: "healthy", path: ".kb/branches/main" },
    });
    expect(ambiguous.actions[0]).toMatchObject({
      code: "ambiguous_branch_attachment",
      safety: "operator",
      autoApplicable: false,
    });
  });

  test("merges status and quality fragments without losing a ready action", () => {
    const status = buildMigrationPlan({
      evaluatedDomains: ["schema"],
      actions: [
        {
          id: "schema-config-upgrade",
          code: "schema_version_upgrade",
          category: "schema",
          state: "ready",
          safety: "automatic",
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedEntityIds: [],
          affectedFiles: [],
          dependsOn: [],
          preconditions: [],
          postconditions: [],
          evidence: {},
          autoApplicable: true,
          dispositionRequired: false,
          allowedDispositions: ["fixed", "accepted", "deferred"],
        },
      ],
    });
    const quality = buildMigrationPlan({
      evaluatedDomains: ["quality"],
      actions: [
        {
          id: "diagnostic-telemetry-workspace",
          code: "quality_telemetry",
          category: "quality",
          state: "ready",
          safety: "review",
          invocation: { kind: "review", instruction: "Review telemetry." },
          affectedEntityIds: [],
          affectedFiles: [],
          dependsOn: [],
          preconditions: [],
          postconditions: [],
          evidence: {},
          autoApplicable: false,
          dispositionRequired: true,
          allowedDispositions: ["fixed", "accepted", "deferred"],
        },
      ],
    });
    const merged = mergeMigrationPlans([status, quality]);
    expect(merged.scope.evaluatedDomains).toEqual(["quality", "schema"]);
    expect(merged.actions.map((action) => action.id)).toEqual([
      "schema-config-upgrade",
      "diagnostic-telemetry-workspace",
    ]);
  });

  test("rejects stale hashes and non-automatic action approval", async () => {
    const plan = buildMigrationPlan({
      expected: { branch: "develop" },
      evaluatedDomains: ["quality"],
      actions: [
        {
          id: "review-contradiction",
          code: "contradiction_review",
          category: "semantic",
          state: "ready",
          safety: "review",
          invocation: { kind: "review", instruction: "Resolve contradiction." },
          affectedEntityIds: [],
          affectedFiles: [],
          dependsOn: [],
          preconditions: [],
          postconditions: [],
          evidence: {},
          autoApplicable: false,
          dispositionRequired: true,
          allowedDispositions: ["fixed", "accepted", "deferred"],
        },
      ],
    });
    const context = {
      workspaceRoot: "/tmp/migration-plan-test",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };
    await expect(
      executeApplyPlan(
        {
          plan,
          approvedPlanHash: "0".repeat(64),
          approvedActionIds: ["review-contradiction"],
        },
        context,
      ),
    ).rejects.toThrow("approvedPlanHash does not match");
    await expect(
      executeApplyPlan(
        {
          plan,
          approvedPlanHash: plan.planHash,
          approvedActionIds: ["review-contradiction"],
        },
        context,
      ),
    ).rejects.toThrow("is not automatic");
  });
});
