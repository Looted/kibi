import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FRESHNESS_RESYNC,
  MIGRATION_PLAN_DIGEST_VERSION,
  MIGRATION_PLAN_VERSION,
  type MigrationAction,
  type MigrationConfigStatus,
  PREDICATE_SCHEMA_ALIGNMENT_CODE,
  UNTRACKED_KNOWLEDGE_SOURCES_CODE,
  buildActionsFromCheck,
  buildActionsFromCoverage,
  buildActionsFromStatus,
  buildMigrationPlan,
  compareReadyActionIds,
  digestMigrationPlan,
  mergeMigrationPlans,
  migrationAction,
  migrationPlanHash,
  readMigrationConfigStatus,
  withoutActionCodes,
} from "../../../src/public/operations/migration-plan.js";
import {
  defaultKbManifest,
  writeKbManifest,
} from "../../../src/utils/kb-manifest.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-migrate-")));
  roots.push(root);
  return root;
}

function write(root: string, file: string, contents: string): void {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), contents);
}

const act = (
  id: string,
  extra: Partial<MigrationAction> = {},
): MigrationAction => migrationAction({ id, code: `code_${id}`, ...extra });

const ids = (actions: readonly MigrationAction[]) =>
  actions.map((action) => action.id);

describe("constants", () => {
  test("pin the plan vocabulary", () => {
    expect(MIGRATION_PLAN_VERSION).toBe("kibi.migration-plan.v2");
    expect(MIGRATION_PLAN_DIGEST_VERSION).toBe("kibi.migration-plan-digest.v2");
    expect(FRESHNESS_RESYNC).toBe("freshness_resync");
    expect(PREDICATE_SCHEMA_ALIGNMENT_CODE).toBe("predicate_schema_alignment");
    expect(UNTRACKED_KNOWLEDGE_SOURCES_CODE).toBe(
      "untracked_knowledge_sources",
    );
  });
});

describe("migrationAction", () => {
  test("fills defaults", () => {
    expect(migrationAction({ id: "a", code: "c" })).toStrictEqual({
      id: "a",
      code: "c",
      category: "quality",
      state: "ready",
      safety: "review",
      invocation: {
        kind: "review",
        instruction: "Review this migration action and choose a disposition.",
      },
      affectedEntityIds: [],
      affectedFiles: [],
      dependsOn: [],
      preconditions: [],
      postconditions: [],
      evidence: {},
      autoApplicable: false,
      dispositionRequired: false,
      allowedDispositions: ["fixed", "accepted", "deferred"],
    });
  });

  test("keeps given fields and sorts lists", () => {
    const given = {
      id: "a",
      code: "c",
      category: "schema" as const,
      state: "blocked" as const,
      safety: "automatic" as const,
      invocation: { kind: "cli" as const, command_argv: ["kibi"] },
      affectedEntityIds: ["b", "a", "b"],
      affectedFiles: ["y", "x"],
      dependsOn: ["z", "y", "z"],
      preconditions: [{ p: 1 }],
      postconditions: [{ q: 1 }],
      evidence: { e: 1 },
      autoApplicable: true,
      dispositionRequired: true,
      allowedDispositions: ["fixed" as const],
    };
    expect(migrationAction(given)).toStrictEqual({
      ...given,
      affectedEntityIds: ["a", "b"],
      affectedFiles: ["x", "y"],
      dependsOn: ["y", "z"],
    });
  });
});

describe("migrationPlanHash", () => {
  test("hashes sorted keys without volatile root fields", () => {
    const expected = createHash("sha256")
      .update('{"a":[{"b":1,"status":2}],"z":{"summary":3}}')
      .digest("hex");
    expect(
      migrationPlanHash({
        z: { summary: 3, planHash: "x" },
        planHash: "p",
        status: "s",
        summary: "m",
        a: [{ status: 2, b: 1, planHash: "y" }],
      }),
    ).toBe(expected);
    expect(migrationPlanHash("x")).toBe(
      createHash("sha256").update('"x"').digest("hex"),
    );
  });
});

describe("compareReadyActionIds", () => {
  test("compares known actions by state, safety, category and id", () => {
    const byId = new Map(
      [
        act("a", { state: "blocked" }),
        act("b", { state: "ready" }),
        act("c", { safety: "automatic" }),
        act("d", { safety: "review" }),
        act("e", { category: "branch" }),
        act("f", { category: "schema" }),
        act("g"),
        act("h"),
      ].map((action) => [action.id, action]),
    );
    expect(compareReadyActionIds("a", "b", byId)).toBeLessThan(0);
    expect(compareReadyActionIds("b", "a", byId)).toBeGreaterThan(0);
    expect(compareReadyActionIds("c", "d", byId)).toBeLessThan(0);
    expect(compareReadyActionIds("e", "f", byId)).toBeLessThan(0);
    expect(compareReadyActionIds("h", "g", byId)).toBeGreaterThan(0);
    expect(compareReadyActionIds("g", "g", byId)).toBe(0);
    expect(compareReadyActionIds("z", "g", byId)).toBeGreaterThan(0);
    expect(compareReadyActionIds("g", "z", byId)).toBeLessThan(0);
    expect(compareReadyActionIds("a", "x", byId)).toBeLessThan(0);
    byId.set("z1", act("z1", { state: "blocked" }));
    expect(compareReadyActionIds("g", "z1", byId)).toBeGreaterThan(0);
  });
});

describe("buildMigrationPlan", () => {
  test("is empty by default", () => {
    const plan = buildMigrationPlan();
    expect(plan).toStrictEqual({
      version: "kibi.migration-plan.v2",
      expected: {
        branch: null,
        kbBranch: null,
        kbSnapshotId: null,
        workspaceSnapshot: null,
        configHash: null,
      },
      scope: { evaluatedDomains: [], incompleteDomains: [], complete: true },
      actions: [],
      diagnostics: [],
      planHash: migrationPlanHash({
        version: "kibi.migration-plan.v2",
        expected: {
          branch: null,
          kbBranch: null,
          kbSnapshotId: null,
          workspaceSnapshot: null,
          configHash: null,
        },
        scope: { evaluatedDomains: [], incompleteDomains: [], complete: true },
        actions: [],
        diagnostics: [],
      }),
      status: "no_actions",
      summary: {
        actionCount: 0,
        readyActionCount: 0,
        blockedActionCount: 0,
        automaticActionCount: 0,
        reviewActionCount: 0,
        operatorActionCount: 0,
        executionActionCount: 0,
      },
    });
  });

  test("copies expectations and sorts domains and diagnostics", () => {
    const plan = buildMigrationPlan({
      expected: {
        branch: "b",
        kbBranch: "k",
        kbSnapshotId: "s",
        workspaceSnapshot: "w",
        configHash: "c",
      },
      evaluatedDomains: ["z", "a", "z"],
      incompleteDomains: ["q", "p"],
      diagnostics: ["y", "x"],
    });
    expect(plan.expected).toStrictEqual({
      branch: "b",
      kbBranch: "k",
      kbSnapshotId: "s",
      workspaceSnapshot: "w",
      configHash: "c",
    });
    expect(plan.scope).toStrictEqual({
      evaluatedDomains: ["a", "z"],
      incompleteDomains: ["p", "q"],
      complete: false,
    });
    expect(plan.diagnostics).toEqual(["x", "y"]);
    expect(plan.status).toBe("partial");
  });

  test("derives the status from actions and scope", () => {
    expect(buildMigrationPlan({ actions: [act("a")] }).status).toBe("ready");
    expect(
      buildMigrationPlan({ actions: [act("a", { state: "blocked" })] }).status,
    ).toBe("blocked");
    expect(
      buildMigrationPlan({
        actions: [act("a"), act("b", { state: "blocked" })],
      }).status,
    ).toBe("partial");
    expect(
      buildMigrationPlan({ actions: [act("a")], incompleteDomains: ["kb"] })
        .status,
    ).toBe("partial");
    expect(
      buildMigrationPlan({
        actions: [act("a", { state: "blocked" })],
        incompleteDomains: ["kb"],
      }).status,
    ).toBe("blocked");
  });

  test("counts actions by state and safety", () => {
    expect(
      buildMigrationPlan({
        actions: [
          act("a", { safety: "automatic" }),
          act("b", { safety: "review", state: "blocked" }),
          act("c", { safety: "operator" }),
          act("d", { safety: "execution" }),
          act("e", { safety: "execution" }),
        ],
      }).summary,
    ).toStrictEqual({
      actionCount: 5,
      readyActionCount: 4,
      blockedActionCount: 1,
      automaticActionCount: 1,
      reviewActionCount: 1,
      operatorActionCount: 1,
      executionActionCount: 2,
    });
  });

  test("keeps the last definition of an id", () => {
    const plan = buildMigrationPlan({
      actions: [act("a", { code: "first" }), act("a", { code: "second" })],
    });
    expect(plan.actions.map((action) => action.code)).toEqual(["second"]);
  });

  test("orders dependencies first, then canonically", () => {
    const plan = buildMigrationPlan({
      actions: [
        act("d", { dependsOn: ["b", "missing"] }),
        act("c", { dependsOn: ["a"] }),
        act("b"),
        act("a", { dependsOn: ["b"] }),
        act("e", { safety: "automatic" }),
        act("f", { state: "blocked" }),
      ],
    });
    expect(ids(plan.actions)).toEqual(["f", "e", "b", "a", "c", "d"]);
  });

  test("inserts freed actions after their equals", () => {
    const plan = buildMigrationPlan({
      actions: [
        act("root", { safety: "automatic" }),
        act("m", { dependsOn: ["root"] }),
        act("a"),
        act("z"),
        act("n", { dependsOn: ["root", "a"] }),
        act("b", { category: "branch" }),
      ],
    });
    expect(ids(plan.actions)).toEqual(["root", "b", "a", "m", "n", "z"]);
  });

  test("frees a dependent once all its dependencies are emitted", () => {
    const plan = buildMigrationPlan({
      actions: [
        act("x", { dependsOn: ["p", "q"] }),
        act("p"),
        act("q"),
        act("y", { dependsOn: ["p"] }),
      ],
    });
    expect(ids(plan.actions)).toEqual(["p", "q", "x", "y"]);
  });

  test("appends cyclic actions canonically", () => {
    const plan = buildMigrationPlan({
      actions: [
        act("c2", { dependsOn: ["c1"] }),
        act("c1", { dependsOn: ["c2"] }),
        act("free"),
        act("after", { dependsOn: ["c1"] }),
      ],
    });
    expect(ids(plan.actions)).toEqual(["free", "after", "c1", "c2"]);
  });
});

describe("mergeMigrationPlans", () => {
  test("returns an empty plan for no input", () => {
    expect(mergeMigrationPlans([])).toStrictEqual(buildMigrationPlan());
  });

  test("unions scope and diagnostics and prefers ready actions", () => {
    const first = buildMigrationPlan({
      expected: { branch: "main" },
      evaluatedDomains: ["a"],
      incompleteDomains: ["x"],
      actions: [act("one", { state: "blocked" }), act("two")],
      diagnostics: ["d1"],
    });
    const second = buildMigrationPlan({
      expected: { branch: "other" },
      evaluatedDomains: ["b", "a"],
      actions: [
        act("one", { code: "ready-one" }),
        act("two", { state: "blocked", code: "blocked-two" }),
        act("three", { state: "blocked" }),
      ],
      diagnostics: ["d2", "d1"],
    });
    const merged = mergeMigrationPlans([first, second]);
    expect(merged.expected.branch).toBe("main");
    expect(merged.scope).toStrictEqual({
      evaluatedDomains: ["a", "b"],
      incompleteDomains: ["x"],
      complete: false,
    });
    expect(merged.diagnostics).toEqual(["d1", "d2"]);
    expect(
      merged.actions.map((action) => [action.id, action.code, action.state]),
    ).toEqual([
      ["three", "code_three", "blocked"],
      ["one", "ready-one", "ready"],
      ["two", "code_two", "ready"],
    ]);
  });
});

describe("digestMigrationPlan", () => {
  test("lists automatic actions and groups the rest", () => {
    const automatic = Array.from({ length: 22 }, (_, index) =>
      act(`auto-${String(index).padStart(2, "0")}`, {
        safety: "automatic",
        autoApplicable: index % 2 === 0,
        state: index === 21 ? "blocked" : "ready",
      }),
    );
    const plan = buildMigrationPlan({
      actions: [
        ...automatic,
        act("r1", { code: "b_code" }),
        act("r2", { code: "b_code" }),
        act("r3", { code: "a_code" }),
        act("r4", { code: "a_code", state: "blocked" }),
        act("r5", { code: "c_code", safety: "operator" }),
      ],
    });
    expectGolden("migration-plan-digest", digestMigrationPlan(plan));
  });

  test("names one blocked automatic action and none", () => {
    const one = digestMigrationPlan(
      buildMigrationPlan({
        actions: [act("a", { safety: "automatic", state: "blocked" })],
      }),
    );
    expect(one.next).toBe(
      "This digest cannot be applied. Run kb_status, kb_check and kb_coverage (or kibi migrate) for the full plan and its action details. 1 automatic action is blocked: it waits for the actions in its dependsOn and needs no approval until a later plan shows it ready.",
    );
    expect(one.automaticSummary).toStrictEqual({
      total: 1,
      ready: 0,
      blocked: 1,
      omitted: 0,
    });
    const none = digestMigrationPlan(buildMigrationPlan());
    expect(none.next).toBe(
      "This digest cannot be applied. Run kb_status, kb_check and kb_coverage (or kibi migrate) for the full plan and its action details.",
    );
    expect(none.actionGroups).toEqual([]);
  });

  test("orders groups by count, code and state", () => {
    const digest = digestMigrationPlan(
      buildMigrationPlan({
        actions: [
          act("1", { code: "z" }),
          act("2", { code: "z" }),
          act("3", { code: "b", state: "blocked" }),
          act("4", { code: "b" }),
          act("5", { code: "a", state: "blocked" }),
          act("6", { code: "a", state: "blocked" }),
          act("7", { code: "c", state: "blocked" }),
          act("8", { code: "c" }),
        ],
      }),
    );
    expect(
      digest.actionGroups.map((group) => [
        group.code,
        group.state,
        group.count,
      ]),
    ).toEqual([
      ["a", "blocked", 2],
      ["z", "ready", 2],
      ["b", "blocked", 1],
      ["b", "ready", 1],
      ["c", "blocked", 1],
      ["c", "ready", 1],
    ]);
  });
});

describe("withoutActionCodes", () => {
  test("drops actions by code and keeps the plan otherwise", () => {
    const plan = buildMigrationPlan({
      expected: { branch: "b" },
      evaluatedDomains: ["e"],
      incompleteDomains: ["i"],
      actions: [act("a", { code: "drop" }), act("b")],
      diagnostics: ["d"],
    });
    expect(withoutActionCodes(plan, new Set(["none"]))).toBe(plan);
    const filtered = withoutActionCodes(plan, new Set(["drop"]));
    expect(filtered).toStrictEqual(
      buildMigrationPlan({
        expected: { branch: "b" },
        evaluatedDomains: ["e"],
        incompleteDomains: ["i"],
        actions: [act("b")],
        diagnostics: ["d"],
      }),
    );
  });
});

describe("buildActionsFromCheck", () => {
  test("is empty without findings", () => {
    expect(buildActionsFromCheck({})).toEqual([]);
  });

  test("plans violations and diagnostics", () => {
    expectGolden(
      "migration-plan-check-actions",
      buildActionsFromCheck({
        violations: [
          {
            rule: "required-fields",
            entityId: "REQ-1",
            suggestion: "Add a title.",
          },
          { rule: 3, description: "Described." },
          { entityId: 4 },
          {
            rule: "superseded-requirement-open",
            entityId: "REQ-OLD",
            source: ".kb/requirements/old.md",
          },
          {
            rule: "source-relationship-parity",
            evidence: {
              untrackedSources: [
                { file: "b.md", entityId: "E2" },
                { file: "a.md", entityId: "E1" },
                "skip",
                { file: 1, entityId: 2 },
              ],
              relationship: { from: "E1", to: "E2" },
            },
          },
          {
            rule: "source-relationship-parity",
            evidence: { untrackedSources: [{ file: "a.md" }] },
          },
          {
            rule: "source-relationship-parity",
            evidence: { untrackedSources: [] },
          },
          { rule: "source-relationship-parity", evidence: "none" },
          {
            rule: "source-relationship-parity",
            evidence: { untrackedSources: "a.md" },
          },
        ],
        qualityDiagnostics: [
          {
            id: "rule.x",
            entityId: "REQ-2",
            suggestion: "Fix x.",
            files: ["f.md", 3],
            blocking: true,
          },
          { id: 5, files: "f.md" },
          {
            id: "rule.exception-unapproved",
            entityId: "EXC-1",
          },
          {
            id: "rule.predicate-schema-conformance",
            source: ".kb/facts/p.md",
            evidence: {
              issue: "namespace",
              namespace: "ns",
              alignment: "align",
              rewrites: ["r"],
              repair: { type: "fact", id: "FACT-1", properties: { a: 1 } },
            },
          },
          {
            id: "rule.predicate-schema-conformance",
            source: 7,
            evidence: {
              repair: { type: "fact", id: "FACT-2", properties: {} },
            },
          },
          {
            id: "rule.predicate-schema-conformance",
            evidence: { repair: { type: "req", id: "R", properties: {} } },
          },
          {
            id: "rule.predicate-schema-conformance",
            evidence: { repair: { type: "fact", id: 1, properties: {} } },
          },
          {
            id: "rule.predicate-schema-conformance",
            evidence: { repair: { type: "fact", id: "F", properties: [] } },
          },
          {
            id: "rule.predicate-schema-conformance",
            evidence: { repair: "none" },
          },
          { id: "rule.predicate-schema-conformance", evidence: "none" },
        ],
      }),
    );
  });
});

describe("buildActionsFromCoverage", () => {
  test("is empty without plans", () => {
    expect(buildActionsFromCoverage({})).toEqual([]);
    expect(
      buildActionsFromCoverage({
        repairPlan: { batches: "x" },
        symbolRepairPlan: { repairs: "x" },
      }),
    ).toEqual([]);
  });

  test("plans repair batches and symbol repairs", () => {
    expectGolden(
      "migration-plan-coverage-actions",
      buildActionsFromCoverage({
        repairPlan: {
          batches: [
            "skip",
            {
              id: "b1",
              phase: "source_coordinates",
              requirementId: "REQ-1",
              state: "ready",
              writePolicy: "refresh_then_sync",
              dependsOn: ["b0", 3],
            },
            {
              id: "b2",
              phase: "source_coordinates",
              state: "blocked",
              writePolicy: "refresh_then_sync",
            },
            {
              id: "b3",
              phase: "source_coordinates",
              state: "ready",
              writePolicy: "review_then_sequential_upsert",
              objective: "Review it.",
            },
            { id: "b4", phase: "proof_evidence", state: "ready" },
            { phase: 1, requirementId: 2, dependsOn: "b1" },
          ],
        },
        symbolRepairPlan: {
          repairs: [
            "skip",
            { symbolId: "SYM-1", action: "refresh_coordinates" },
            { symbolId: "SYM-2", action: "relink" },
            { symbolId: 1, action: 2 },
          ],
        },
      }),
    );
  });
});

const CURRENT: MigrationConfigStatus = {
  status: "current",
  currentVersion: 14,
  latestVersion: 14,
  needsMigration: false,
  warning: null,
  configHash: "hash",
};

describe("readMigrationConfigStatus", () => {
  test("reads the lifecycle manifest", () => {
    const root = workspace();
    writeKbManifest(root, { ...defaultKbManifest(), schemaVersion: 12 });
    const status = readMigrationConfigStatus(root);
    expect(status).toMatchObject({
      status: "older",
      currentVersion: 12,
      latestVersion: 14,
      needsMigration: true,
      warning: null,
    });
    expect(status.configHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("falls back to the legacy config", () => {
    const root = workspace();
    expect(readMigrationConfigStatus(root)).toStrictEqual({
      status: "missing",
      currentVersion: null,
      latestVersion: 14,
      needsMigration: true,
      warning:
        "Kibi lifecycle manifest is missing; run 'kibi init' or 'kibi migrate' to create it.",
      configHash: null,
    });
    write(root, ".kb/config.json", '{"schemaVersion":"7"}');
    expect(readMigrationConfigStatus(root)).toMatchObject({
      status: "older",
      currentVersion: 7,
      configHash: null,
      warning:
        "Kibi lifecycle manifest is missing because this KB was written by an older Kibi; run 'kibi migrate --yes' (it creates the manifest from the legacy .kb/config.json; do not run kibi init first).",
    });
    write(root, ".kb/config.json", "{}");
    expect(readMigrationConfigStatus(root)).toMatchObject({
      status: "missing",
      currentVersion: null,
    });
    write(root, ".kb/config.json", "{oops");
    expect(readMigrationConfigStatus(root)).toMatchObject({
      status: "invalid",
      currentVersion: null,
    });
  });

  test("keeps the manifest warning for an invalid manifest", () => {
    const root = workspace();
    write(root, ".kb/manifest.json", "{oops");
    write(root, ".kb/config.json", '{"schemaVersion":5}');
    expect(readMigrationConfigStatus(root)).toMatchObject({
      currentVersion: 5,
      warning:
        "Kibi lifecycle manifest at .kb/manifest.json is not valid JSON; re-run 'kibi init'.",
    });
  });
});

describe("buildActionsFromStatus", () => {
  const status = (
    root: string,
    input: Partial<Parameters<typeof buildActionsFromStatus>[0]> = {},
  ) =>
    buildActionsFromStatus({
      workspaceRoot: root,
      configStatus: CURRENT,
      ...input,
    });

  test("plans nothing for a current workspace", () => {
    const root = workspace();
    const plan = status(root, {
      kbSnapshotId: "snap",
      workspaceSnapshot: "ws",
      branchAttachment: { gitBranch: "main", kbBranch: "main" },
    });
    expect(plan.status).toBe("no_actions");
    expect(plan.expected).toStrictEqual({
      branch: "main",
      kbBranch: "main",
      kbSnapshotId: "snap",
      workspaceSnapshot: "ws",
      configHash: "hash",
    });
    expect(plan.scope.evaluatedDomains).toEqual([
      "branch",
      "freshness",
      "package",
      "proof",
      "schema",
      "storage",
    ]);
    expect(
      status(root, { branchAttachment: { gitBranch: 1 } }).expected,
    ).toMatchObject({ branch: null, kbBranch: null });
  });

  test("reads the config status when none is given", () => {
    const root = workspace();
    const plan = buildActionsFromStatus({ workspaceRoot: root });
    expect(ids(plan.actions)).toEqual(["schema-config-upgrade"]);
    expect(plan.actions[0]?.code).toBe("schema_version_upgrade");
  });

  test("plans branch attachment repairs", () => {
    const root = workspace();
    expectGolden("migration-plan-status-branch", [
      status(root, {
        branchAttachment: {
          migrationRequired: true,
          kind: "legacy_compat",
          gitBranch: "main",
          kbBranch: "master",
          storePath: ".kb/branches/master",
        },
      }).actions,
      status(root, {
        branchAttachment: {
          migrationRequired: true,
          kind: "legacy_compat",
          gitBranch: "main",
        },
      }).actions,
      status(root, {
        branchAttachment: {
          migrationRequired: true,
          kind: "other",
          gitBranch: "main",
          kbBranch: "master",
        },
      }).actions,
      status(root, {
        branchAttachment: {
          migrationRequired: true,
          kind: "legacy_compat",
          kbBranch: "master",
        },
      }).actions,
      status(root, {
        branchAttachment: { migrationRequired: "yes", kind: "legacy_compat" },
      }).actions,
    ]);
    expect(
      status(root, {
        branchAttachment: { migrationRequired: true, kind: "other" },
      }).scope.incompleteDomains,
    ).toEqual(["kb"]);
  });

  test("plans branch store repairs", () => {
    const root = workspace();
    expectGolden("migration-plan-status-store", [
      status(root, { branchStore: { state: "missing", path: "p" } }),
      status(root, { branchStore: { state: "missing" } }).actions,
      status(root, { branchStore: { state: "incomplete", path: "p" } }).actions,
      status(root, { branchStore: { state: "unreadable" } }).actions,
      status(root, { branchStore: { state: "ok" } }).actions,
      status(root, { branchStore: { state: 1 } }).actions,
    ]);
  });

  test("plans schema upgrades", () => {
    const root = workspace();
    const older: MigrationConfigStatus = {
      ...CURRENT,
      status: "older",
      currentVersion: 12,
      needsMigration: true,
    };
    const calls: (number | null)[] = [];
    const sources = (currentSchemaVersion: number | null) => {
      calls.push(currentSchemaVersion);
      return {
        actions: [act("rewrite-1", { safety: "automatic" })],
        sourceRewriteActionIds: ["rewrite-1"],
        diagnostics: ["planned"],
      };
    };
    expectGolden("migration-plan-status-schema", [
      status(root, {
        configStatus: older,
        branchStore: { state: "missing" },
        planSchemaUpgradeSources: sources,
      }),
      status(root, { configStatus: older }).actions,
      status(root, {
        configStatus: { ...older, status: "newer" },
        planSchemaUpgradeSources: sources,
      }).actions,
      status(root, {
        configStatus: { ...older, status: "invalid" },
        planSchemaUpgradeSources: sources,
      }).actions,
    ]);
    expect(calls).toEqual([12, 12]);
  });

  test("plans legacy storage moves", () => {
    const root = workspace();
    write(root, ".kb/config.json", '{"schemaVersion":7}');
    write(root, "documentation/requirements/req-1.md", "---\nid: REQ-1\n---\n");
    let called = false;
    const plan = status(root, {
      configStatus: { ...CURRENT, needsMigration: false },
      planSchemaUpgradeSources: () => {
        called = true;
        return { actions: [], sourceRewriteActionIds: [], diagnostics: [] };
      },
    });
    expect(called).toBe(false);
    const upgrade = plan.actions.find(
      (action) => action.id === "schema-config-upgrade",
    );
    expect(upgrade).toMatchObject({
      code: "legacy_storage_migration",
      state: "ready",
      safety: "automatic",
      autoApplicable: true,
    });
    expect(upgrade?.affectedFiles).toContain(
      "documentation/requirements/req-1.md",
    );
    expect(plan.scope.incompleteDomains).toEqual(["kb"]);
    expect(
      (upgrade?.evidence.legacyStorage as { moves: unknown[] }).moves,
    ).toHaveLength(1);
  });

  test("blocks a legacy storage move it cannot perform", () => {
    const root = workspace();
    write(root, ".kb/config.json", "{oops");
    const plan = status(root);
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      code: "legacy_storage_migration",
      state: "blocked",
      safety: "operator",
      autoApplicable: false,
    });
    const invocation = plan.actions[0]?.invocation;
    expect(invocation?.kind).toBe("review");
    expect(invocation?.kind === "review" ? invocation.instruction : "").toMatch(
      /^Legacy knowledge files outside \.kb\/ cannot be migrated automatically: Legacy \.kb\/config\.json is malformed .* Then run 'kibi migrate --yes'\.$/,
    );
  });

  test("plans compiles and resyncs", () => {
    const root = workspace();
    const older: MigrationConfigStatus = {
      ...CURRENT,
      status: "older",
      needsMigration: true,
    };
    expectGolden("migration-plan-status-freshness", [
      status(root, {
        configStatus: older,
        branchStore: { state: "missing", path: "store" },
        staleReasons: [
          { code: "branch_store_not_compiled" },
          { code: "indexed_source_newer", path: "a.md" },
        ],
      }).actions,
      status(root, {
        configStatus: { ...older, status: "newer" },
        branchStore: { state: "incomplete" },
        staleReasons: [{ code: "branch_store_not_compiled" }],
      }).actions,
      status(root, {
        configStatus: older,
        branchStore: { state: "missing" },
        staleReasons: [
          { code: "knowledge_source_newer", path: "b.md" },
          { code: "documentation_source_newer", path: "a.md" },
          { code: "compiler_changed" },
          { code: "indexed_source_newer", path: "a.md" },
        ],
      }).actions,
      status(root, {
        staleReasons: [
          { code: "symbol_drift", path: "s.ts", remediation: "Fix it." },
          { path: 3 },
          { code: 5 },
        ],
      }).actions,
    ]);
  });

  test("plans proof snapshot findings", () => {
    const root = workspace();
    expectGolden("migration-plan-status-proof", [
      status(root, { proofSnapshotAvailable: false, proofSnapshotDirty: true })
        .actions,
      status(root, { proofSnapshotDirty: true }).actions,
      status(root, { proofSnapshotAvailable: true, proofSnapshotDirty: false })
        .actions,
    ]);
  });

  test("marks the KB domain incomplete for storage and schema findings", () => {
    const root = workspace();
    const incomplete = (input: Partial<Parameters<typeof status>[1]>) =>
      status(root, input).scope.incompleteDomains;
    expect(incomplete({ branchStore: { state: "unreadable" } })).toEqual([
      "kb",
    ]);
    expect(incomplete({ branchStore: { state: "missing" } })).toEqual(["kb"]);
    expect(
      incomplete({
        configStatus: { ...CURRENT, status: "invalid", needsMigration: true },
      }),
    ).toEqual(["kb"]);
    expect(
      incomplete({
        configStatus: { ...CURRENT, status: "older", needsMigration: true },
      }),
    ).toEqual(["kb"]);
    expect(incomplete({ proofSnapshotAvailable: false })).toEqual([]);
    expect(
      incomplete({
        branchAttachment: {
          migrationRequired: true,
          kind: "legacy_compat",
          gitBranch: "a",
          kbBranch: "b",
        },
      }),
    ).toEqual([]);
  });
});

describe("migration plan edges", () => {
  test("falls back to the default id and code", () => {
    const action = migrationAction({} as Parameters<typeof migrationAction>[0]);
    expect(action.id).toBe("migration-action-unknown");
    expect(action.code).toBe("migration_action");
  });

  test("orders actions with unknown dependencies as ready", () => {
    expect(
      ids(
        buildMigrationPlan({
          actions: [act("b"), act("a", { dependsOn: ["missing"] })],
        }).actions,
      ),
    ).toEqual(["a", "b"]);
    expect(
      ids(
        buildMigrationPlan({
          actions: [
            act("y", { dependsOn: ["x"] }),
            act("x", { dependsOn: ["y"] }),
            act("w"),
          ],
        }).actions,
      ),
    ).toEqual(["w", "x", "y"]);
  });

  test("digests several blocked automatic actions", () => {
    const digest = digestMigrationPlan(
      buildMigrationPlan({
        actions: [
          act("a", {
            safety: "automatic",
            state: "blocked",
            autoApplicable: true,
          }),
          act("b", { safety: "automatic", state: "blocked" }),
          act("c", { safety: "automatic", autoApplicable: true }),
        ],
      }),
    );
    expect(digest.automaticSummary).toStrictEqual({
      total: 3,
      ready: 1,
      blocked: 2,
      omitted: 0,
    });
    expect(digest.next).toEndWith(
      " 2 automatic actions are blocked: it waits for the actions in its dependsOn and needs no approval until a later plan shows it ready.",
    );
  });

  test("plans check findings outside the grouped rules", () => {
    const relationships = Array.from({ length: 21 }, (_, index) => ({
      rule: "source-relationship-parity",
      evidence: {
        untrackedSources: [{ file: "f.md" }],
        relationship: { n: index },
      },
    }));
    const actions = buildActionsFromCheck({
      violations: [
        { rule: "plain", entityId: "E" },
        { rule: "other", evidence: { untrackedSources: [{ file: "o.md" }] } },
        {
          rule: "source-relationship-parity",
          evidence: { untrackedSources: ["x.md"] },
        },
        ...relationships,
      ],
      qualityDiagnostics: [
        {
          id: "other",
          entityId: 7,
          evidence: {
            repair: { type: "fact", id: "F", properties: {} },
          },
        },
      ],
    });
    expect(ids(actions)).toEqual([
      "untracked-knowledge-sources",
      "check-plain-E-1",
      "check-other-workspace-2",
      "check-source-relationship-parity-workspace-3",
      "diagnostic-other-workspace-1",
    ]);
    expect(actions[0]?.evidence.relationshipCount).toBe(21);
    expect(actions[0]?.evidence.relationships).toHaveLength(20);
    expect(actions[0]?.affectedFiles).toEqual(["f.md"]);
    expect(actions[4]).toMatchObject({
      code: "quality_other",
      affectedEntityIds: [],
    });
    expect(
      buildActionsFromCheck({ violations: [{ rule: "plain" }] }),
    ).toHaveLength(1);
  });

  test("keeps a refresh batch outside source coordinates for review", () => {
    const [action] = buildActionsFromCoverage({
      repairPlan: {
        batches: [
          {
            id: "x",
            phase: "proof_evidence",
            writePolicy: "refresh_then_sync",
          },
        ],
      },
    });
    expect(action?.safety).not.toBe("automatic");
    expect(action?.autoApplicable).toBe(false);
  });

  test("reads a current manifest and a malformed legacy config", () => {
    const current = workspace();
    writeKbManifest(current, defaultKbManifest());
    expect(readMigrationConfigStatus(current)).toMatchObject({
      status: "current",
      needsMigration: false,
      warning: null,
    });
    const legacy = workspace();
    write(legacy, ".kb/config.json", "{oops");
    expect(readMigrationConfigStatus(legacy)).toMatchObject({
      status: "invalid",
      currentVersion: null,
      needsMigration: true,
    });
  });

  const fresh = (
    root: string,
    input: Partial<Parameters<typeof buildActionsFromStatus>[0]> = {},
  ) =>
    buildActionsFromStatus({
      workspaceRoot: root,
      configStatus: CURRENT,
      ...input,
    });
  const upgrade = (root: string) =>
    fresh(root).actions.find((action) => action.id === "schema-config-upgrade");

  test("plans legacy storage from each kind of finding", () => {
    const configOnly = workspace();
    write(configOnly, ".kb/config.json", "{}");
    expect(upgrade(configOnly)?.code).toBe("legacy_storage_migration");

    const moveOnly = workspace();
    write(moveOnly, "documentation/requirements/r.md", "r");
    expect(upgrade(moveOnly)?.affectedFiles).toContain(
      "documentation/requirements/r.md",
    );

    const removalOnly = workspace();
    write(removalOnly, "documentation/requirements/r.md", "same");
    write(removalOnly, ".kb/requirements/r.md", "same");
    const removal = upgrade(removalOnly);
    expect(removal?.affectedFiles).toContain("documentation/requirements/r.md");
    expect(
      (removal?.evidence.legacyStorage as { removals: unknown[] }).removals,
    ).toHaveLength(1);

    const conflicts = workspace();
    for (const name of ["a", "b"]) {
      write(conflicts, `documentation/requirements/${name}.md`, "old");
      write(conflicts, `.kb/requirements/${name}.md`, "new");
    }
    const blocked = upgrade(conflicts);
    const blockers = (blocked?.evidence.legacyStorage as { blockers: string[] })
      .blockers;
    expect(blockers).toHaveLength(2);
    expect(blocked?.invocation).toStrictEqual({
      kind: "review",
      instruction: `Legacy knowledge files outside .kb/ cannot be migrated automatically: ${blockers.join(" ")} Then run 'kibi migrate --yes'.`,
    });
  });

  test("compiles into the default store path and resyncs after store steps only", () => {
    const root = workspace();
    const compile = fresh(root, {
      staleReasons: [{ code: "branch_store_not_compiled" }],
    }).actions;
    expect(compile[0]?.affectedFiles).toEqual([".kb/branches"]);
    const resync = fresh(root, {
      branchStore: { state: "incomplete" },
      staleReasons: [{ code: "indexed_source_newer", path: "a.md" }],
    }).actions.find((action) => action.id === "freshness-resync");
    expect(resync?.dependsOn).toEqual([]);
  });
});
