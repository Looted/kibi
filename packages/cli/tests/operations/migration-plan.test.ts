import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { branchMigrationApprovalHash } from "../../src/commands/branch.js";
import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import {
  buildActionsFromCheck,
  buildActionsFromStatus,
  buildMigrationPlan,
  digestMigrationPlan,
  mergeMigrationPlans,
  migrationAction,
  migrationPlanHash,
} from "../../src/public/operations/migration-plan.js";
import {
  branchStorePath,
  legacyBranchStorePath,
} from "../../src/utils/branch-store-locator.js";

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

  test("emits a hash-bound legacy branch action only for a same-identity move", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-legacy-plan-"));
    try {
      const store = legacyBranchStorePath(root, "main");
      mkdirSync(store, { recursive: true });
      writeFileSync(join(store, "kb.rdf"), "facts\n");
      const legacyAttachment = {
        gitBranch: "main",
        kbBranch: "main",
        kind: "legacy_compat",
        migrationRequired: true,
      };
      const legacy = buildActionsFromStatus({
        workspaceRoot: root,
        branchAttachment: legacyAttachment,
        branchStore: { state: "healthy", path: ".kb/branches/main" },
      });
      const approvalHash = branchMigrationApprovalHash(
        "main",
        "main",
        store,
        branchStorePath(root, "main"),
      );
      expect(legacy.actions[0]).toMatchObject({
        id: "branch-legacy-attachment",
        code: "legacy_branch_storage",
        state: "ready",
        safety: "automatic",
        autoApplicable: true,
        invocation: {
          kind: "cli",
          command_argv: [
            "kibi",
            "branch",
            "migrate",
            "--from",
            "main",
            "--to",
            "main",
            "--apply",
            "--approval-hash",
            approvalHash,
          ],
        },
        evidence: { attachment: legacyAttachment, approvalHash },
      });

      // A different store body is a different approval.
      writeFileSync(join(store, "kb.rdf"), "changed\n");
      const changed = buildActionsFromStatus({
        workspaceRoot: root,
        branchAttachment: legacyAttachment,
        branchStore: { state: "healthy", path: ".kb/branches/main" },
      });
      expect(changed.planHash).not.toBe(legacy.planHash);

      // Kibi never moves one branch's store to another branch.
      const crossBranch = buildActionsFromStatus({
        workspaceRoot: root,
        branchAttachment: { ...legacyAttachment, gitBranch: "develop" },
        branchStore: { state: "healthy", path: ".kb/branches/main" },
      });
      expect(crossBranch.actions[0]).toMatchObject({
        code: "ambiguous_branch_attachment",
        state: "blocked",
        safety: "operator",
        invocation: { kind: "review" },
      });

      // Nor onto a hashed store that already exists.
      mkdirSync(branchStorePath(root, "main"), { recursive: true });
      const occupied = buildActionsFromStatus({
        workspaceRoot: root,
        branchAttachment: legacyAttachment,
        branchStore: { state: "healthy", path: ".kb/branches/main" },
      });
      expect(occupied.actions[0]).toMatchObject({ state: "blocked" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a store compiled by another CLI contract is resynced automatically", () => {
    const cache = ".kb/branches/develop/sync-cache.json";
    const current = {
      status: "current" as const,
      currentVersion: 4,
      latestVersion: 4,
      needsMigration: false,
      warning: null,
      configHash: "a",
    };
    const freshnessActions = (
      plan: ReturnType<typeof buildActionsFromStatus>,
    ) => plan.actions.filter((action) => action.category === "freshness");

    const compilerOnly = buildActionsFromStatus({
      workspaceRoot: "/tmp/project",
      branchStore: { state: "healthy", path: ".kb/branches/develop" },
      staleReasons: [
        {
          code: "compiler_changed",
          path: cache,
          remediation: { command_argv: ["kibi", "sync"], applyRequired: false },
        },
      ],
      configStatus: current,
    });
    expect(freshnessActions(compilerOnly)).toHaveLength(1);
    expect(freshnessActions(compilerOnly)[0]).toMatchObject({
      id: "freshness-resync",
      code: "freshness_resync",
      safety: "automatic",
      autoApplicable: true,
      dispositionRequired: false,
      invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
      affectedFiles: [cache],
    });

    const withSource = buildActionsFromStatus({
      workspaceRoot: "/tmp/project",
      branchStore: { state: "healthy", path: ".kb/branches/develop" },
      staleReasons: [
        { code: "compiler_changed", path: cache },
        {
          code: "indexed_source_newer",
          path: ".kb/requirements/REQ-a.md",
        },
      ],
      configStatus: current,
    });
    const freshness = freshnessActions(withSource);
    expect(freshness.map((action) => action.id)).toEqual(["freshness-resync"]);
    expect(
      (
        freshness[0]?.evidence as {
          reasons: Array<{ code: string }>;
        }
      ).reasons.map((reason) => reason.code),
    ).toEqual(["compiler_changed", "indexed_source_newer"]);
    expect(freshness[0]?.affectedFiles).toEqual([
      ".kb/branches/develop/sync-cache.json",
      ".kb/requirements/REQ-a.md",
    ]);
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
          approvedPlanHash: "0a".repeat(32),
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
  test("collapses parity findings explained by untracked files into one action", () => {
    const parity = (from: string, to: string, file?: string) => ({
      rule: "source-relationship-parity",
      entityId: from,
      description: `Authored relationship is missing from the compiled KB: implements ${from}->${to}`,
      evidence: {
        direction: "authored_to_compiled",
        relationship: { type: "implements", from, to },
        ...(file === undefined
          ? {}
          : { untrackedSources: [{ entityId: from, file }] }),
      },
    });
    const actions = buildActionsFromCheck({
      violations: [
        parity("SYM-a", "REQ-1", ".kb/symbols.yaml"),
        parity("SYM-b", "REQ-1", ".kb/symbols.yaml"),
        parity("REQ-2", "FACT-1", ".kb/requirements/REQ-2.md"),
        parity("SYM-c", "REQ-3"),
      ],
    });
    const grouped = actions.filter(
      (action) => action.code === "untracked_knowledge_sources",
    );
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      id: "untracked-knowledge-sources",
      safety: "review",
      affectedFiles: [".kb/requirements/REQ-2.md", ".kb/symbols.yaml"],
      evidence: { relationshipCount: 3 },
    });
    // A parity finding with another cause keeps its own action.
    expect(
      actions.filter(
        (action) => action.code === "check_source-relationship-parity",
      ),
    ).toHaveLength(1);
  });

  test("the remaining-plan digest lists a bounded slice of automatic actions", () => {
    const plan = buildMigrationPlan({
      evaluatedDomains: ["semantic"],
      actions: Array.from({ length: 30 }, (_, index) =>
        migrationAction({
          id: `auto-${String(index).padStart(2, "0")}`,
          code: "predicate_schema_alignment",
          category: "semantic",
          safety: "automatic",
          autoApplicable: true,
          state: "ready",
          invocation: { kind: "operation", name: "kb_upsert", input: {} },
        }),
      ),
    });
    const digest = digestMigrationPlan(plan);
    expect(digest.automaticActions).toHaveLength(20);
    expect(Object.keys(digest.automaticActions[0] ?? {}).sort()).toEqual([
      "autoApplicable",
      "code",
      "dependsOn",
      "id",
      "state",
    ]);
    expect(digest.automaticSummary).toEqual({
      total: 30,
      ready: 30,
      blocked: 0,
      omitted: 10,
    });
  });
});
