// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildSchema6MigrationFragment,
  symbolLegacyLinkAction,
} from "../../../src/operations/migration/schema6.js";
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
        {
          rule: "symbol-traceability",
          entityId: "REQ-1",
          suggestion: "Add a symbol.",
        },
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
    expect(
      actions.some((action) => action.code === "check_symbol-traceability"),
    ).toBe(true);
    expect(actions.some((action) => action.invocation.kind === "review")).toBe(
      true,
    );
    expect(
      actions.find(
        (action) => action.code === "quality_telemetry_completeness_low",
      )?.affectedFiles,
    ).toEqual(["src/a.ts"]);
  });

  test("buildActionsFromCoverage maps automatic coordinate batches and review repairs", () => {
    const actions = buildActionsFromCoverage({
      repairPlan: {
        batches: [
          {
            id: "coords",
            phase: "source_coordinates",
            writePolicy: "refresh_then_sync",
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
    expect(actions.some((action) => action.id === "symbol-review-symbol")).toBe(
      true,
    );
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

  test("a schema upgrade plans the source rewrites kibi migrate performs with it", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-mig-sources-"));
    tempDirs.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    // A link on the class is coarse: its methods are the behavioral symbols.
    writeFileSync(
      path.join(root, "src", "greeter.ts"),
      "export class Greeter {\n  greet(): string {\n    return 'hi';\n  }\n  wave(): string {\n    return 'wave';\n  }\n}\n",
    );
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-greet.md"),
      "---\nid: REQ-greet\ntitle: Greet\nstatus: open\n---\n\nThe greeter must greet.\n",
    );
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-greeter\n    title: Greeter\n    sourceFile: src/greeter.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-greet\n",
    );
    writeFileSync(
      path.join(root, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 8,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    const configStatus = readMigrationConfigStatus(root);
    expect(configStatus).toMatchObject({
      currentVersion: 8,
      needsMigration: true,
    });
    const plan = buildActionsFromStatus({
      workspaceRoot: root,
      branchStore: { state: "healthy", path: ".kb/branches/x" },
      configStatus,
      planSchemaUpgradeSources: (currentSchemaVersion) =>
        buildSchema6MigrationFragment({
          workspaceRoot: root,
          currentSchemaVersion,
        }),
    });
    const mark = plan.actions.find(
      (action) => action.id === "symbol-legacy-link-mark",
    );
    expect(mark).toMatchObject({
      code: "symbol_legacy_link_mark",
      safety: "automatic",
      affectedEntityIds: ["SYM-greeter"],
      affectedFiles: [".kb/symbol-coordinates.yaml", ".kb/symbols.yaml"],
    });
    // Bound to the same manifest bytes kibi migrate plans from.
    expect(mark?.evidence.manifestHash).toBe(
      symbolLegacyLinkAction(root)?.evidence.manifestHash,
    );
    const upgrade = plan.actions.find(
      (action) => action.id === "schema-config-upgrade",
    );
    expect(upgrade?.affectedFiles).toEqual(
      expect.arrayContaining([".gitignore", ".kb/manifest.json"]),
    );
    expect(upgrade?.affectedFiles).not.toContain(".kb/");
    expect(upgrade?.dependsOn).toContain("symbol-legacy-link-mark");
    // The plan is a pure function of the workspace: replanning keeps its hash.
    expect(
      buildActionsFromStatus({
        workspaceRoot: root,
        branchStore: { state: "healthy", path: ".kb/branches/x" },
        configStatus,
        planSchemaUpgradeSources: (currentSchemaVersion) =>
          buildSchema6MigrationFragment({
            workspaceRoot: root,
            currentSchemaVersion,
          }),
      }).planHash,
    ).toBe(plan.planHash);

    // Without a source planner the upgrade still declares that it may
    // rewrite authored .kb/ files and .gitignore.
    const unplanned = buildActionsFromStatus({
      workspaceRoot: root,
      branchStore: { state: "healthy", path: ".kb/branches/x" },
      configStatus,
    }).actions.find((action) => action.id === "schema-config-upgrade");
    expect(unplanned?.affectedFiles).toEqual(
      expect.arrayContaining([".gitignore", ".kb/"]),
    );
    expect(unplanned?.evidence.sourceRewrites).toEqual(expect.any(String));
  });

  test("mergeMigrationPlans, empty inputs, and cyclic dependency order", () => {
    expect(mergeMigrationPlans([]).actions).toEqual([]);
    const cyclic = buildMigrationPlan({
      actions: [
        migrationAction({ id: "a", code: "x", dependsOn: ["b"] }),
        migrationAction({ id: "b", code: "y", dependsOn: ["a"] }),
      ],
    });
    expect(cyclic.actions.map((action) => action.id).sort()).toEqual([
      "a",
      "b",
    ]);
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

  test("a legacy cutover blocked by a destination conflict waits on an operator and no longer gates the compile", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-mig-status-"));
    tempDirs.push(root);
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "config.json"),
      JSON.stringify({ paths: { symbols: "docs/symbols.yaml" } }),
    );
    writeFileSync(path.join(root, "docs", "symbols.yaml"), "symbols: []\n");
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-a\n",
    );
    const current = {
      status: "current" as const,
      currentVersion: 8,
      latestVersion: 8,
      needsMigration: false,
      warning: null,
      configHash: "abc",
    };
    const plan = buildActionsFromStatus({
      workspaceRoot: root,
      branchStore: { state: "healthy", path: ".kb/branches/x" },
      staleReasons: [{ code: "branch_store_not_compiled" }],
      configStatus: current,
    });
    const cutover = plan.actions.find(
      (action) => action.id === "schema-config-upgrade",
    );
    expect(cutover).toMatchObject({
      code: "legacy_storage_migration",
      state: "blocked",
      safety: "operator",
      autoApplicable: false,
    });
    expect(cutover?.invocation.kind).toBe("review");
    expect(
      (cutover?.evidence.legacyStorage as { blockers: string[] }).blockers,
    ).toHaveLength(1);
    expect(cutover?.affectedFiles).toContain("docs/symbols.yaml");
    const compile = plan.actions.find(
      (action) => action.id === "branch-store-compile",
    );
    expect(compile?.state).toBe("ready");
    expect(compile?.dependsOn).not.toContain("schema-config-upgrade");

    // Without the conflict the cutover stays an automatic step the compile waits on.
    rmSync(path.join(root, ".kb", "symbols.yaml"));
    const movable = buildActionsFromStatus({
      workspaceRoot: root,
      branchStore: { state: "healthy", path: ".kb/branches/x" },
      staleReasons: [{ code: "branch_store_not_compiled" }],
      configStatus: current,
    });
    expect(
      movable.actions.find((action) => action.id === "schema-config-upgrade"),
    ).toMatchObject({ state: "ready", safety: "automatic" });
    expect(
      movable.actions.find((action) => action.id === "branch-store-compile")
        ?.dependsOn,
    ).toContain("schema-config-upgrade");
  });

  test("legacy copies left after the config was retired still reach the plan", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-mig-retired-"));
    tempDirs.push(root);
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    mkdirSync(path.join(root, "documentation", "requirements"), {
      recursive: true,
    });
    const req = "---\nid: REQ-1\ntype: req\ntitle: one\nstatus: open\n---\n";
    writeFileSync(path.join(root, ".kb", "requirements", "REQ-1.md"), req);
    writeFileSync(
      path.join(root, "documentation", "requirements", "REQ-1.md"),
      req,
    );
    const current = {
      status: "current" as const,
      currentVersion: 8,
      latestVersion: 8,
      needsMigration: false,
      warning: null,
      configHash: null,
    };
    const status = () =>
      buildActionsFromStatus({
        workspaceRoot: root,
        branchStore: { state: "healthy", path: ".kb/branches/x" },
        configStatus: current,
      }).actions.find((action) => action.id === "schema-config-upgrade");

    // An identical copy is removed by 'kibi migrate --yes'.
    expect(status()).toMatchObject({
      code: "legacy_storage_migration",
      state: "ready",
      safety: "automatic",
      affectedFiles: expect.arrayContaining([
        "documentation/requirements/REQ-1.md",
      ]),
      evidence: {
        legacyStorage: {
          removals: [
            {
              path: "documentation/requirements/REQ-1.md",
              duplicateOf: ".kb/requirements/REQ-1.md",
            },
          ],
        },
      },
    });

    // A stale subset of the symbols manifest waits on an operator.
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-a\n  - id: SYM-b\n",
    );
    writeFileSync(
      path.join(root, "documentation", "symbols.yaml"),
      "symbols:\n  - id: SYM-a\n",
    );
    const blocked = status();
    expect(blocked).toMatchObject({ state: "blocked", safety: "operator" });
    expect(
      blocked?.invocation.kind === "review"
        ? blocked.invocation.instruction
        : "",
    ).toContain("stale subset of .kb/symbols.yaml");
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
