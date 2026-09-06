// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildActionsFromCheck,
  buildActionsFromCoverage,
  buildActionsFromStatus,
  buildMigrationPlan,
  mergeMigrationPlans,
  migrationAction,
  readMigrationConfigStatus,
} from "../../../src/public/operations/migration-plan.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("migration plan builders and config status", () => {
  test("buildActionsFromCheck uses description fallbacks and diagnostic files", () => {
    const actions = buildActionsFromCheck({
      violations: [
        { rule: "symbol-traceability", entityId: "REQ-1", suggestion: "Add a symbol." },
        { description: "No suggestion present" },
        { rule: 1, entityId: 2 },
      ],
      qualityDiagnostics: [
        {
          id: "telemetry_completeness_low",
          entityId: "REQ-1",
          suggestion: "Enable diagnostics.",
          blocking: true,
          files: ["src/a.ts", 12],
        },
        { files: "not-array" },
      ],
    });
    expect(actions.some((action) => action.code === "check_symbol-traceability")).toBe(
      true,
    );
    expect(actions.some((action) => action.invocation.kind === "review")).toBe(true);
    expect(
      actions.find((action) => action.code === "quality_telemetry_completeness_low")
        ?.affectedFiles,
    ).toEqual(["src/a.ts"]);
  });

  test("buildActionsFromCoverage maps automatic coordinate batches and review repairs", () => {
    const actions = buildActionsFromCoverage({
      repairPlan: {
        batches: [
          {
            id: "coords",
            phase: "source_coordinates",
            requirementId: "REQ-1",
            state: "ready",
            dependsOn: ["prior"],
          },
          {
            id: "proof",
            phase: "proof_evidence",
            state: "blocked",
            objective: "Collect receipts.",
            dependsOn: [1],
          },
          { phase: 12 },
        ],
      },
      symbolRepairPlan: {
        repairs: [
          { symbolId: "SYM-1", action: "refresh_coordinates" },
          { action: "review" },
          "skip",
        ],
      },
    });
    expect(
      actions.find((action) => action.id === "coverage-coords")?.autoApplicable,
    ).toBe(true);
    expect(
      actions.find((action) => action.id === "coverage-proof")?.safety,
    ).toBe("execution");
    expect(
      actions.find((action) => action.code === "symbol_refresh_coordinates")
        ?.autoApplicable,
    ).toBe(true);
    expect(actions.some((action) => action.id === "symbol-review-symbol")).toBe(true);
  });

  test("buildActionsFromStatus covers store, schema, freshness, and proof gates", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-mig-status-"));
    tempDirs.push(root);
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "config.json"), "{not json");
    const damaged = buildActionsFromStatus({
      workspaceRoot: root,
      branchAttachment: {
        gitBranch: "develop",
        kbBranch: "main",
        kind: "other",
        migrationRequired: true,
        storePath: ".kb/branches/develop",
      },
      branchStore: { state: "unreadable", path: ".kb/branches/develop" },
      staleReasons: [
        { code: "source_changed", path: "docs/a.md", remediation: "resync" },
        { code: 1 },
      ],
      proofSnapshotAvailable: false,
      configStatus: {
        status: "invalid",
        currentVersion: null,
        latestVersion: 4,
        needsMigration: true,
        warning: "bad",
        configHash: null,
      },
    });
    expect(damaged.actions.map((action) => action.code)).toEqual(
      expect.arrayContaining([
        "ambiguous_branch_attachment",
        "damaged_exact_branch_store",
        "invalid_schema_version",
        "source_changed",
        "proof_snapshot_unavailable",
      ]),
    );

    const missing = buildActionsFromStatus({
      workspaceRoot: root,
      branchStore: { state: "missing" },
      proofSnapshotDirty: true,
      configStatus: {
        status: "older",
        currentVersion: 3,
        latestVersion: 4,
        needsMigration: true,
        warning: null,
        configHash: "abc",
      },
    });
    expect(missing.actions.map((action) => action.code)).toEqual(
      expect.arrayContaining([
        "missing_exact_branch_store",
        "legacy_storage_migration",
        "proof_snapshot_dirty",
      ]),
    );

    const newer = buildActionsFromStatus({
      workspaceRoot: root,
      configStatus: {
        status: "newer",
        currentVersion: 99,
        latestVersion: 4,
        needsMigration: true,
        warning: null,
        configHash: "abc",
      },
    });
    expect(
      newer.actions.find((action) => action.category === "schema")?.state,
    ).toBe("blocked");
  });

  test("mergeMigrationPlans, empty inputs, and cyclic dependency order", () => {
    expect(mergeMigrationPlans([]).actions).toEqual([]);
    const cyclic = buildMigrationPlan({
      actions: [
        migrationAction({ id: "a", code: "x", dependsOn: ["b"] }),
        migrationAction({ id: "b", code: "y", dependsOn: ["a"] }),
      ],
    });
    expect(cyclic.actions.map((action) => action.id).sort()).toEqual(["a", "b"]);
    const merged = mergeMigrationPlans([
      buildMigrationPlan({
        evaluatedDomains: ["schema"],
        incompleteDomains: ["kb"],
        diagnostics: ["one"],
        actions: [migrationAction({ id: "keep", code: "x", state: "blocked" })],
      }),
      buildMigrationPlan({
        evaluatedDomains: ["quality"],
        diagnostics: ["two"],
        actions: [migrationAction({ id: "keep", code: "x", state: "ready" })],
      }),
    ]);
    expect(merged.actions[0]?.state).toBe("ready");
    expect(merged.scope.evaluatedDomains).toEqual(["quality", "schema"]);
  });

  test("readMigrationConfigStatus reads ok, missing, and malformed legacy config", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-mig-cfg-"));
    tempDirs.push(root);
    const missing = readMigrationConfigStatus(root);
    expect(missing.configHash).toBeNull();
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "config.json"),
      JSON.stringify({ schemaVersion: 3 }),
    );
    const legacy = readMigrationConfigStatus(root);
    expect(legacy.currentVersion).toBe(3);
    writeFileSync(path.join(root, ".kb", "config.json"), "{");
    expect(readMigrationConfigStatus(root).currentVersion).toBeNull();
  });
});
