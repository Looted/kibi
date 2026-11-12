import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as cliJsonCommand from "../src/cli-json-command.js";
import * as initHelpers from "../src/commands/init-helpers.js";
import * as legacyStorage from "../src/commands/legacy-storage-migration.js";
import * as planRecord from "../src/commands/migrate-plan-record.js";
import {
  type MigrationAuditRecord,
  applyPlanCommand,
  describeMigrationRun,
  formatSchemaVersion,
  isBacklogAction,
  migrateCommand,
  planChangedMessage,
  warnMigrationRequiredWithoutYes,
} from "../src/commands/migrate.js";
import * as entityBodyContext from "../src/operations/migration/entity-body-context.js";
import * as entityType from "../src/operations/migration/entity-type.js";
import * as evidenceFloor from "../src/operations/migration/evidence-floor.js";
import * as firmSupersede from "../src/operations/migration/firm-supersede.js";
import { INLINE_IMPLEMENTS_REVIEW_CODE } from "../src/operations/migration/inline-implements-comments.js";
import * as inventory from "../src/operations/migration/inventory-rederive.js";
import * as originBackfill from "../src/operations/migration/origin-backfill.js";
import * as polarity from "../src/operations/migration/polarity-values.js";
import * as claims from "../src/operations/migration/proof-contract-claims.js";
import * as reqStatus from "../src/operations/migration/requirement-status.js";
import * as schema6 from "../src/operations/migration/schema6.js";
import * as sourcePaths from "../src/operations/migration/source-paths.js";
import * as superseded from "../src/operations/migration/superseded-closure.js";
import * as supersedesReason from "../src/operations/migration/supersedes-reason.js";
import * as coordinates from "../src/operations/migration/symbol-coordinates-refresh.js";
import * as legacyLinks from "../src/operations/migration/symbol-legacy-links.js";
import * as untrack from "../src/operations/migration/untrack-symbol-coordinates.js";
import {
  buildMigrationPlan,
  migrationAction,
} from "../src/public/operations/migration-plan.js";
import * as runtimeTypes from "../src/public/operations/runtime-types.js";
import { checkSpec } from "../src/public/operations/specs/check.js";
import { statusSpec } from "../src/public/operations/specs/discovery.js";
import { applyPlanSpec } from "../src/public/operations/specs/planning.js";
import { coverageSpec } from "../src/public/operations/specs/reporting.js";
import * as cliRuntime from "../src/runtime/cli-runtime.js";
import * as telemetry from "../src/usage-telemetry.js";
import * as branchResolver from "../src/utils/branch-resolver.js";
import * as kbManifest from "../src/utils/kb-manifest.js";
import * as mergeDriver from "../src/utils/merge-driver-setup.js";
import { LATEST_KB_SCHEMA_VERSION } from "../src/utils/schema-version.js";

const LATEST = LATEST_KB_SCHEMA_VERSION;
const roots: string[] = [];
let cwd = "";
let logs: string[] = [];
let errors: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-migrate-"));
  roots.push(dir);
  return dir;
}

function storagePlan(overrides: Record<string, unknown> = {}) {
  return {
    moves: [],
    legacyConfig: "absent",
    schemaVersion: null,
    semanticAdvisorBackfill: null,
    removals: [],
    blockers: [],
    ...overrides,
  };
}

const empty = () => ({ targets: [], skipped: [] });

function stubs() {
  return {
    attach: spyOn(branchResolver, "resolveBranchAttachment").mockReturnValue({
      kbBranch: "main",
      gitBranch: "main",
    } as never),
    status: spyOn(kbManifest, "readKbManifestStatus").mockReturnValue({
      state: "ok",
      manifest: { schemaVersion: LATEST },
    } as never),
    read: spyOn(kbManifest, "readKbManifest").mockReturnValue({
      schemaVersion: LATEST,
    } as never),
    write: spyOn(kbManifest, "writeKbManifest").mockReturnValue(
      undefined as never,
    ),
    defaults: spyOn(kbManifest, "defaultKbManifest").mockReturnValue({
      schemaVersion: LATEST,
      fresh: true,
    } as never),
    plan: spyOn(legacyStorage, "planLegacyStorageMigration").mockReturnValue(
      storagePlan() as never,
    ),
    applyStorage: spyOn(
      legacyStorage,
      "applyLegacyStorageMigration",
    ).mockReturnValue({
      movedFiles: [],
      untrackedMovedFiles: [],
      removedFiles: [],
      retiredLegacyConfig: false,
    } as never),
    before: spyOn(coordinates, "readGeneratedManifestBytes").mockReturnValue({
      bytes: "before",
    } as never),
    refresh: spyOn(
      coordinates,
      "refreshCoordinatesAfterMigration",
    ).mockResolvedValue({ outcome: "unchanged" } as never),
    planPolarity: spyOn(polarity, "planPolarityValueBackfill").mockReturnValue(
      [] as never,
    ),
    applyPolarity: spyOn(
      polarity,
      "applyPolarityValueBackfill",
    ).mockReturnValue(0),
    planTypes: spyOn(entityType, "planEntityTypeBackfill").mockReturnValue(
      empty() as never,
    ),
    applyTypes: spyOn(entityType, "applyEntityTypeBackfill").mockReturnValue(
      empty() as never,
    ),
    planStatuses: spyOn(
      reqStatus,
      "planRequirementStatusMappings",
    ).mockReturnValue([]),
    applyStatuses: spyOn(
      reqStatus,
      "applyDeliveredStatusMappings",
    ).mockReturnValue({ mapped: [], skipped: [] } as never),
    planDrift: spyOn(inventory, "planInventoryRederivation").mockReturnValue(
      [],
    ),
    applyDrift: spyOn(
      inventory,
      "applySafeInventoryRederivations",
    ).mockReturnValue({ rederived: [], manual: [] } as never),
    planClosures: spyOn(superseded, "planSupersededClosures").mockReturnValue({
      closures: [],
      cycles: [],
    } as never),
    applyClosures: spyOn(superseded, "applySupersededClosures").mockReturnValue(
      { closed: [], skipped: [] } as never,
    ),
    findRepairs: spyOn(sourcePaths, "findSourceRepairs").mockReturnValue([]),
    applyRepairs: spyOn(sourcePaths, "applySourcePathRepairs").mockReturnValue({
      rewritten: [],
      removed: [],
      skipped: [],
    } as never),
    planLinks: spyOn(legacyLinks, "planSymbolLegacyLinks").mockReturnValue({
      targets: [],
    } as never),
    applyLinks: spyOn(legacyLinks, "applySymbolLegacyLinks").mockReturnValue({
      marked: [],
      unmarked: [],
    } as never),
    planOrigin: spyOn(originBackfill, "planOriginBackfill").mockReturnValue({
      targets: [],
    } as never),
    applyOrigin: spyOn(originBackfill, "applyOriginBackfill").mockReturnValue({
      written: [],
      skipped: [],
      previouslyStamped: 0,
    } as never),
    ladder: spyOn(evidenceFloor, "readLadderFloorVerdicts").mockResolvedValue({
      ladder: true,
    } as never),
    planFloors: spyOn(evidenceFloor, "planEvidenceFloorPins").mockReturnValue({
      targets: [],
      kept: [],
      skipped: [],
      decidedBy: "ladder",
    } as never),
    applyFloors: spyOn(evidenceFloor, "applyEvidenceFloorPins").mockReturnValue(
      0,
    ),
    candidates: spyOn(
      claims,
      "readProofContractClaimCandidates",
    ).mockResolvedValue({ candidates: true } as never),
    planClaims: spyOn(claims, "planProofContractClaimPins").mockReturnValue({
      targets: [],
      review: [],
      skipped: [],
    } as never),
    applyClaims: spyOn(claims, "applyProofContractClaimPins").mockReturnValue({
      targets: [],
      review: [],
      skipped: [],
    } as never),
    review: spyOn(claims, "claimReviewInstruction").mockImplementation(
      ((row: { id: string }) => `Review ${row.id}`) as never,
    ),
    planReasons: spyOn(
      supersedesReason,
      "planSupersedesReasonAcknowledgement",
    ).mockReturnValue([]),
    mergeReasons: spyOn(
      supersedesReason,
      "mergeSupersedesAcknowledgements",
    ).mockImplementation(((existing: unknown, added: unknown) => ({
      existing,
      added,
    })) as never),
    planFirm: spyOn(
      firmSupersede,
      "planFirmSupersedeAcknowledgement",
    ).mockReturnValue([]),
    mergeFirm: spyOn(
      firmSupersede,
      "mergeFirmSupersedeAcknowledgements",
    ).mockImplementation(((existing: unknown, added: unknown) => ({
      existing,
      added,
    })) as never),
    planPins: spyOn(entityBodyContext, "planSemanticTextPins").mockReturnValue(
      empty() as never,
    ),
    applyPins: spyOn(
      entityBodyContext,
      "applySemanticTextPins",
    ).mockReturnValue(0),
    planTags: spyOn(
      entityBodyContext,
      "planContextMissingTags",
    ).mockReturnValue(empty() as never),
    applyTags: spyOn(
      entityBodyContext,
      "applyContextMissingTags",
    ).mockReturnValue(0),
    acknowledged: spyOn(
      entityBodyContext,
      "acknowledgedContextIds",
    ).mockReturnValue([]),
    tracked: spyOn(untrack, "isCoordinateArtifactTracked").mockReturnValue(
      false as never,
    ),
    untrack: spyOn(untrack, "untrackCoordinateArtifact").mockReturnValue({
      outcome: "not_tracked",
    } as never),
    gaps: spyOn(mergeDriver, "manifestMergeDriverGaps").mockReturnValue([]),
    setup: spyOn(mergeDriver, "mergeDriverSetup").mockReturnValue("Run: wire"),
    gitignore: spyOn(initHelpers, "updateGitIgnore").mockReturnValue(false),
    category: spyOn(telemetry, "noteCliErrorCategory").mockReturnValue(
      undefined as never,
    ),
  };
}

let s: ReturnType<typeof stubs>;

beforeEach(() => {
  cwd = tempDir();
  s = stubs();
  logs = [];
  errors = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
});

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const yes = () => migrateCommand({ yes: true, workspaceRoot: cwd });
const dry = () => migrateCommand({ dryRun: true, workspaceRoot: cwd });

function atVersion(version: unknown): void {
  s.read.mockReturnValue({ schemaVersion: version } as never);
  s.status.mockReturnValue({
    state: "ok",
    manifest: { schemaVersion: version },
  } as never);
}

const older = (version: number) =>
  `Warning: KB schemaVersion ${version} is older than the latest version ${LATEST}; run 'kibi migrate' to plan the upgrade.`;

const audit = (): Record<string, unknown> =>
  JSON.parse(
    fs.readFileSync(path.join(cwd, ".kb", "migrations", "main.json"), "utf8"),
  );

describe("small helpers", () => {
  test("format a schema version", () => {
    expect(formatSchemaVersion(undefined, null)).toBe("missing");
    expect(formatSchemaVersion("x", null)).toBe('invalid ("x")');
    expect(formatSchemaVersion("7", 7)).toBe("7");
  });

  test("warn that a migration needs --yes", () => {
    expect(warnMigrationRequiredWithoutYes()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "Warning: Migration required for this repository.",
      "No changes applied.",
      "Use --dry-run to preview or --yes to apply the migration.",
    ]);
  });

  test("describe a migration run", () => {
    const summary = {
      auditPath: ".kb/migrations/main.json",
      gitignoreUpdated: true,
      audit: {
        fromVersion: 4,
        toVersion: 14,
        symbolGranularityLegacyLinks: 1,
        entityOriginBackfill: 2,
        supersededRequirementsClosed: 3,
        sourcePathsRewritten: 4,
        sourcePathsRemoved: 5,
        legacyStatusesMapped: 6,
      },
    };
    expect(describeMigrationRun(summary as never)).toBe(
      "Migrated schema 4 -> 14 (audit .kb/migrations/main.json): legacy-link marks 1, origin backfill 2, superseded requirements closed 3, source paths rewritten 4, source paths removed 5, legacy statuses mapped 6; .gitignore updated.",
    );
    expect(
      describeMigrationRun({
        ...summary,
        gitignoreUpdated: false,
        audit: { ...summary.audit, fromVersion: null },
      } as never),
    ).toBe(
      "Migrated schema none -> 14 (audit .kb/migrations/main.json): legacy-link marks 1, origin backfill 2, superseded requirements closed 3, source paths rewritten 4, source paths removed 5, legacy statuses mapped 6; .gitignore unchanged.",
    );
  });
});

describe("branch and lifecycle preconditions", () => {
  test("refuse outside git, on a failed branch and on a legacy attachment", async () => {
    for (const code of ["NOT_A_GIT_REPO", "GIT_NOT_AVAILABLE"]) {
      s.attach.mockReturnValue({ error: "x", code } as never);
      errors = [];
      expect(await yes()).toStrictEqual({ exitCode: 1 });
      expect(errors).toStrictEqual([
        "Not in a git repository; set KIBI_BRANCH explicitly for migration audit metadata.",
      ]);
    }
    s.attach.mockReturnValue({ error: "boom", code: "OTHER" } as never);
    errors = [];
    expect(await yes()).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(["Failed to resolve active branch: boom"]);
    s.attach.mockReturnValue({
      kbBranch: "old",
      gitBranch: "new",
      migrationRequired: true,
    } as never);
    errors = [];
    expect(await yes()).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      "Legacy branch attachment for 'new' requires 'kibi branch migrate --from old --to new --apply' before schema migration.",
    ]);
    expect(s.attach).toHaveBeenCalledWith(cwd);
  });

  test("resolve the workspace from the working directory", async () => {
    const spy = spyOn(process, "cwd").mockReturnValue(cwd);
    await migrateCommand({ yes: true });
    expect(s.attach).toHaveBeenCalledWith(cwd);
    spy.mockRestore();
  });

  test("refuse a workspace without lifecycle state", async () => {
    s.status.mockReturnValue({ state: "missing" } as never);
    expect(await yes()).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      "Missing .kb/ lifecycle state. Run 'kibi init' to create the canonical layout before migrating.",
    ]);
    expect(s.write).not.toHaveBeenCalled();
  });

  test("write a baseline manifest only for a fresh workspace", async () => {
    s.status.mockReturnValue({ state: "missing" } as never);
    await migrateCommand({
      yes: true,
      workspaceRoot: cwd,
      initializeMissingConfig: true,
    });
    expect(s.write).toHaveBeenCalledWith(cwd, {
      schemaVersion: LATEST,
      fresh: true,
    });
    for (const plan of [
      storagePlan({ moves: [{ from: "a", to: "b" }] }),
      storagePlan({ legacyConfig: "present" }),
    ]) {
      s.write.mockClear();
      s.plan.mockReturnValue(plan as never);
      await migrateCommand({
        dryRun: true,
        workspaceRoot: cwd,
        initializeMissingConfig: true,
      });
      expect(s.write).not.toHaveBeenCalled();
    }
    s.write.mockClear();
    s.plan.mockReturnValue(storagePlan() as never);
    s.status.mockReturnValue({ state: "ok", manifest: {} } as never);
    await migrateCommand({
      dryRun: true,
      workspaceRoot: cwd,
      initializeMissingConfig: true,
    });
    expect(s.write).not.toHaveBeenCalled();
  });

  test("proceed without a manifest when legacy knowledge exists", async () => {
    s.status.mockReturnValue({ state: "missing" } as never);
    s.read.mockReturnValue(null as never);
    for (const plan of [
      storagePlan({ moves: [{ from: "a", to: "b" }] }),
      storagePlan({ legacyConfig: "present" }),
    ]) {
      s.plan.mockReturnValue(plan as never);
      errors = [];
      expect((await dry()).exitCode).toBe(0);
      expect(errors).toStrictEqual([]);
    }
  });

  test("block on files that cannot move", async () => {
    s.plan.mockReturnValue(
      storagePlan({ blockers: ["a exists", "b exists"] }) as never,
    );
    expect(await yes()).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(["Blocked: a exists", "Blocked: b exists"]);
  });

  test("refuse a schema from a newer Kibi", async () => {
    atVersion(LATEST + 1);
    expect(await yes()).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      `Unsupported schemaVersion ${LATEST + 1}. Upgrade kibi-cli before migrating this KB.`,
    ]);
    expect(logs).toContain(
      `Warning: ${(await import("../src/utils/schema-version.js")).getSchemaVersionStatus({ schemaVersion: LATEST + 1 }).warning}`,
    );
  });

  test("print the manifest warning before the schema warning", async () => {
    s.status.mockReturnValue({
      state: "invalid",
      warning: "manifest is broken",
    } as never);
    s.read.mockReturnValue(null as never);
    await dry();
    expect(logs[0]).toBe("Warning: manifest is broken");
    s.status.mockReturnValue({ state: "future", warning: "too new" } as never);
    logs = [];
    await dry();
    expect(logs[0]).toBe("Warning: too new");
  });
});

describe("current knowledge base", () => {
  test("report that nothing is needed", async () => {
    expect(await yes()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      `No migration needed: the KB is already at schemaVersion ${LATEST} on the canonical .kb/ layout.`,
    ]);
    expect(s.gitignore).toHaveBeenCalledWith(cwd);
    expect(s.applyPolarity).toHaveBeenCalledWith(cwd);
    expect(s.applyTypes).toHaveBeenCalledWith(cwd);
    expect(s.planPolarity).not.toHaveBeenCalled();
    expect(s.refresh).not.toHaveBeenCalled();
  });

  test("name existing audit metadata and leave .gitignore on a dry run", async () => {
    mkdirSync(path.join(cwd, ".kb", "migrations"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "migrations", "main.json"), "{}");
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      `No migration needed: the KB is already at schemaVersion ${LATEST} on the canonical .kb/ layout.`,
      `Existing migration audit metadata: ${path.join(".kb", "migrations", "main.json")}`,
    ]);
    expect(s.gitignore).not.toHaveBeenCalled();
    expect(s.planPolarity).toHaveBeenCalledWith(cwd);
    expect(s.applyPolarity).not.toHaveBeenCalled();
    expect(s.planTypes).toHaveBeenCalledWith(cwd);
  });

  const rewrites: Array<[string, () => void]> = [
    ["polarity", () => s.applyPolarity.mockReturnValue(2)],
    [
      "types",
      () =>
        s.applyTypes.mockReturnValue({
          targets: [{ type: "req" }],
          skipped: [],
        } as never),
    ],
    [
      "statuses",
      () => {
        s.planStatuses.mockReturnValueOnce([
          { requirementId: "R1", status: "done", automatic: {} },
        ] as never);
        s.applyStatuses.mockReturnValue({
          mapped: [{ requirementId: "R1", status: "done", automatic: {} }],
          skipped: [],
        } as never);
      },
    ],
    [
      "links",
      () =>
        s.applyLinks.mockReturnValue({ marked: ["S1"], unmarked: [] } as never),
    ],
    [
      "drift",
      () =>
        s.applyDrift.mockReturnValue({
          rederived: [{ outcome: "rederived", requirementId: "R1" }],
          manual: [],
        } as never),
    ],
    [
      "closed",
      () =>
        s.applyClosures.mockReturnValue({
          closed: [{ id: "R1" }],
          skipped: [],
        } as never),
    ],
    [
      "rewritten",
      () =>
        s.applyRepairs.mockReturnValue({
          rewritten: [{}],
          removed: [],
          skipped: [],
        } as never),
    ],
    [
      "removed",
      () =>
        s.applyRepairs.mockReturnValue({
          rewritten: [],
          removed: [{}],
          skipped: [],
        } as never),
    ],
  ];
  for (const [name, arrange] of rewrites) {
    test(`refresh coordinates and ask for a sync after ${name} rewrites`, async () => {
      arrange();
      expect(await yes()).toStrictEqual({ exitCode: 0 });
      expect(s.refresh).toHaveBeenCalledWith(cwd, { bytes: "before" });
      expect(logs.at(-1)).toBe(
        "Run 'kibi sync' to recompile the rewritten sources.",
      );
      expect(s.gitignore).toHaveBeenCalledWith(cwd);
    });
  }

  test("report remaining work without rewrites", async () => {
    s.planStatuses.mockReturnValue([
      {
        requirementId: "R1",
        path: "r1.md",
        status: "weird",
        automatic: null,
        extractionError: null,
        suggestedStatus: null,
      },
    ] as never);
    expect(await yes()).toStrictEqual({ exitCode: 0 });
    expect(s.refresh).not.toHaveBeenCalled();
    expect(logs).toStrictEqual([
      "Migration incomplete: 0 requirement(s) are not compiled, so kb_query, kb_coverage and kb_upsert do not see them, and 1 other item(s) need a decision.",
      "  R1 (r1.md): status weird is not a requirement status, so the proof ladder skips it. Set status to open, in_progress, closed or retired in the file.",
      "Run 'kibi migrate' for the remaining actions; rerun 'kibi migrate --yes' after fixing them.",
    ]);
  });

  test("report manual inventories and lifecycle items", async () => {
    s.applyDrift.mockReturnValue({
      rederived: [],
      manual: [
        {
          requirementId: "R2",
          path: "r2.md",
          reasons: ["a", "b"],
          rederivableByDroppingGrounding: false,
          orphanedGrounding: [],
        },
      ],
    } as never);
    s.planClosures.mockReturnValue({
      closures: [],
      cycles: [{ members: ["R3", "R4"] }],
    } as never);
    expect(await yes()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "Warning: R2 (r2.md) no longer matches the current semantic advisor and needs a manual fix: a; b. Run 'kibi migrate --format json' for the exact repair steps.",
      "Warning: Requirements R3, R4 supersede each other; decide which one is current, remove the supersedes link that points at it, and close the others.",
      "Migration incomplete: 1 requirement(s) are not compiled, so kb_query, kb_coverage and kb_upsert do not see them, and 1 other item(s) need a decision.",
      "  1 requirement inventory(ies) need the manual fix in the warnings above; kibi sync rejects them until then.",
      "  1 lifecycle item(s) need a person; see the warnings above.",
      "Run 'kibi migrate' for the remaining actions; rerun 'kibi migrate --yes' after fixing them.",
    ]);
  });

  test("print nothing remaining on a dry run with review items", async () => {
    s.planStatuses.mockReturnValue([
      {
        requirementId: "R1",
        path: "r1.md",
        status: "weird",
        automatic: null,
        extractionError: null,
        suggestedStatus: "open",
      },
    ] as never);
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "dry run: 1 requirement status(es) need a person to choose the current status: R1 (weird); kibi migrate --format json lists them as req_status_vocabulary_map.",
    ]);
    expect(s.gitignore).not.toHaveBeenCalled();
  });

  test("skip the refresh on a dry run with rewrites", async () => {
    s.planPolarity.mockReturnValue([{}] as never);
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(s.refresh).not.toHaveBeenCalled();
    expect(logs).toStrictEqual([]);
  });

  test("count manual drift and lifecycle items as work", async () => {
    s.planDrift.mockReturnValue([
      {
        requirementId: "R2",
        path: "r2.md",
        safe: false,
        reasons: ["a"],
        rederivableByDroppingGrounding: true,
        orphanedGrounding: [1, 2],
        summary: {},
      },
    ] as never);
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "Warning: R2 (r2.md) no longer matches the current semantic advisor and needs a manual fix: a. Run 'kibi migrate --format json' for the exact repair steps. Or approve semantic-inventory-rederive-drop-grounding-R2 with --apply-safe --approved-action to drop the 2 orphaned grounding link(s).",
    ]);
    s.planDrift.mockReturnValue([]);
    s.findRepairs.mockReturnValue([
      { file: "f.md", refused: "ambiguous" },
    ] as never);
    logs = [];
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "Warning: Path field of f.md not repaired: ambiguous; a person edits it by hand (kibi migrate --format json lists it as review_source_path_dangling).",
    ]);
  });
});

describe("helper output", () => {
  test("describe type statements on a dry run and an applied run", async () => {
    s.planTypes.mockReturnValue({
      targets: [{ type: "req" }, { type: "adr" }, { type: "req" }],
      skipped: [{ path: "x.md", reason: "no front matter" }],
    } as never);
    await dry();
    expect(logs).toStrictEqual([
      "dry run: would state the folder-implied type on 3 entity file(s) without one (1 adr, 2 req); no other line changes.",
      "Warning: Type not stated for x.md: no front matter.",
    ]);
    s.applyTypes.mockReturnValue({
      targets: [{ type: "req" }],
      skipped: [],
    } as never);
    logs = [];
    await yes();
    expect(logs[0]).toBe(
      "Stated the folder-implied type on 1 entity file(s) without one (1 req); no other line changes.",
    );
  });

  test("describe delivered status mappings", async () => {
    const findings = [
      {
        requirementId: "R1",
        status: "done",
        automatic: { status: "closed", tag: "implemented" },
      },
      { requirementId: "R2", status: "done", automatic: {} },
      { requirementId: "R3", status: "completed", automatic: null },
      { requirementId: "R6", status: "finished", automatic: {} },
    ];
    s.planStatuses.mockReturnValue(findings as never);
    await dry();
    expect(logs[0]).toBe(
      "dry run: would map legacy status done -> closed (tag implemented) on 2 requirement(s): R1, R2; legacy status finished -> closed (tag implemented) on 1 requirement(s): R6.",
    );
    s.planStatuses.mockReturnValue([
      {
        requirementId: "R4",
        status: "shipped",
        automatic: { status: "s", tag: "t" },
      },
    ] as never);
    s.applyStatuses.mockReturnValue({
      mapped: [
        {
          requirementId: "R4",
          status: "shipped",
          automatic: { status: "s", tag: "t" },
        },
        { requirementId: "R7", status: "over", automatic: null },
      ],
      skipped: [{ path: "r5.md", reason: "locked" }],
    } as never);
    logs = [];
    await yes();
    expect(logs.slice(0, 2)).toStrictEqual([
      "Mapped legacy status shipped -> s (tag t) on 1 requirement(s): R4; legacy status over -> closed (tag implemented) on 1 requirement(s): R7.",
      "Warning: Status not mapped for r5.md: locked.",
    ]);
    expect(s.planStatuses).toHaveBeenCalledTimes(3);
  });

  test("re-derive drifted inventories", async () => {
    const plan = {
      requirementId: "R1",
      path: "r1.md",
      safe: true,
      summary: {
        keptModeled: 1,
        roleChanges: 2,
        newlyUnresolved: 3,
        downgradedModeled: 4,
      },
    };
    s.planDrift.mockReturnValue([
      plan,
      { ...plan, requirementId: "R9" },
    ] as never);
    await dry();
    expect(logs).toStrictEqual([
      "dry run: would re-derive the semantic inventory of R1: 1 modeled claim(s) kept, 2 role change(s), 3 claim(s) now unresolved, 4 modeled claim(s) downgraded.",
      "dry run: would re-derive the semantic inventory of R9: 1 modeled claim(s) kept, 2 role change(s), 3 claim(s) now unresolved, 4 modeled claim(s) downgraded.",
    ]);
    s.applyDrift.mockReturnValue({
      rederived: [
        { outcome: "rederived", requirementId: "R1" },
        { outcome: "unchanged", requirementId: "R9" },
      ],
      manual: [],
    } as never);
    logs = [];
    await yes();
    expect(logs[0]).toBe(
      "Re-derived the semantic inventory of R1: 1 modeled claim(s) kept, 2 role change(s), 3 claim(s) now unresolved, 4 modeled claim(s) downgraded.",
    );
    expect(logs).not.toContain(
      "Re-derived the semantic inventory of R9: 1 modeled claim(s) kept, 2 role change(s), 3 claim(s) now unresolved, 4 modeled claim(s) downgraded.",
    );
  });

  test("describe lifecycle repairs on a dry run", async () => {
    s.planClosures.mockReturnValue({
      closures: [{ id: "R1" }, { id: "R2" }],
      cycles: [],
    } as never);
    s.findRepairs.mockReturnValue([
      { file: "a", fix: { kind: "rewrite" } },
      { file: "b", fix: { kind: "remove" } },
      { file: "c", fix: { kind: "remove" } },
    ] as never);
    await dry();
    expect(logs).toStrictEqual([
      "dry run: would close 2 superseded requirement(s): R1, R2.",
      "dry run: would point 1 pre-canonical source or text_ref path(s) at their .kb/ files.",
      "dry run: would remove 2 redundant or dead source field(s); the compiled source is always the entity's own file.",
    ]);
  });

  test("describe applied lifecycle repairs", async () => {
    s.applyClosures.mockReturnValue({
      closed: [{ id: "R1" }],
      skipped: [{ path: "r2.md", reason: "locked" }],
    } as never);
    s.applyRepairs.mockReturnValue({
      rewritten: [{}, {}],
      removed: [{}],
      skipped: [{ file: "d.md", reason: "refused" }],
    } as never);
    await yes();
    expect(logs.slice(0, 5)).toStrictEqual([
      "Closed 1 superseded requirement(s): R1.",
      "Warning: Status not set for r2.md: locked.",
      "Pointed 2 pre-canonical source or text_ref path(s) at their .kb/ files.",
      "Removed 1 redundant or dead source field(s); the compiled source is always the entity's own file.",
      "Warning: Path field of d.md not repaired: refused; a person edits it by hand (kibi migrate --format json lists it as review_source_path_dangling).",
    ]);
  });

  test("mark legacy symbol links", async () => {
    s.planLinks.mockReturnValue({ targets: [{}, {}] } as never);
    await dry();
    expect(logs).toStrictEqual([
      "dry run: would mark 2 coarse symbol link(s) as legacy-link (granularity_reason), so the staged check accepts them.",
    ]);
    expect(s.planLinks).toHaveBeenCalledWith(cwd, undefined);
    s.applyLinks.mockReturnValue({
      marked: ["S1"],
      unmarked: ["S2", "S3"],
    } as never);
    logs = [];
    await yes();
    expect(logs.slice(0, 2)).toStrictEqual([
      "Marked 1 existing coarse symbol link(s) as legacy-link.",
      "Warning: Could not mark S2, S3 as legacy-link in place; add granularity_reason: legacy-link to them in .kb/symbols.yaml by hand.",
    ]);
  });

  test("report a coordinate refresh", async () => {
    s.applyPolarity.mockReturnValue(1);
    s.refresh.mockResolvedValue({ outcome: "refreshed" } as never);
    await yes();
    expect(logs).toContain(
      "Refreshed generated symbol coordinates for the migrated .kb/symbols.yaml; stage .kb/symbols.yaml with the migration.",
    );
    s.refresh.mockResolvedValue({
      outcome: "failed",
      reason: "no git",
    } as never);
    logs = [];
    await yes();
    expect(logs).toContain(
      `Warning: ${coordinates.coordinateRefreshFailureMessage("no git")}`,
    );
  });
});

describe("schema upgrade dry run", () => {
  test("list every step's preview from schema 0", async () => {
    atVersion(0);
    s.planPolarity.mockReturnValue([{}, {}] as never);
    s.planPins.mockReturnValue({
      targets: [{}],
      skipped: [{ path: "p.md", reason: "bad" }],
    } as never);
    s.planTags.mockReturnValue({
      targets: [{ type: "req" }, { type: "adr" }],
      skipped: [{ path: "t.md", reason: "worse" }],
    } as never);
    s.planReasons.mockReturnValue([{}, {}] as never);
    s.planFirm.mockReturnValue([{}] as never);
    s.planFloors.mockReturnValue({
      targets: [{}],
      kept: ["R1", "R2"],
      skipped: [{ path: "f.md", reason: "locked" }],
      decidedBy: "ladder",
    } as never);
    s.planClaims.mockReturnValue({
      targets: [{ id: "T1" }, { id: "T2" }],
      review: [{ id: "T3" }],
      skipped: [{ path: "c.md", reason: "nope" }],
    } as never);
    s.tracked.mockReturnValue(true as never);
    s.plan.mockReturnValue(
      storagePlan({
        moves: [
          { from: "docs/symbols.yaml", to: ".kb/symbols.yaml" },
          { from: "docs/a.md", to: ".kb/a.md" },
        ],
        removals: [{ path: "docs/b.md", duplicateOf: ".kb/b.md" }],
        legacyConfig: "present",
        schemaVersion: 0,
      }) as never,
    );
    s.planOrigin.mockReturnValue({ targets: [{}, {}, {}] } as never);
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      older(0),
      "dry run: would encode 2 legacy polarity-only fact(s) as typed booleans.",
      "dry run: would pin semantic_text on 1 requirement(s) that lack it (front matter only; bodies are preserved).",
      "dry run: would tag 2 current entit(ies) without body context review:context-missing (1 adr, 1 req); no prose is written.",
      "Warning: Cannot edit p.md: bad.",
      "Warning: Cannot edit t.md: worse.",
      "dry run: would acknowledge 2 supersede(s) recorded without a 'Why this changed' section (manifest only; no reason is written).",
      "dry run: would acknowledge 1 supersede(s) of decisions that read as firm from schema 10 (manifest only; no firmness is written).",
      "dry run: would record required_evidence: asserted on 1 current firm or approved requirement(s) whose evidence is below tested (front matter only).",
      "dry run: 2 firm or approved requirement(s) keep the tested floor (R1, R2); the evidence ladder on the synced store accepts each, or needs only kibi prove re-run.",
      "Warning: Cannot edit f.md: locked.",
      "dry run: would pin proof_contract.proves on 2 certificate test(s) whose test reaches exactly one provable claim (T1, T2); front matter only.",
      "dry run: Review T3",
      "Warning: Cannot pin proves on c.md: nope.",
      "dry run: would remove .kb/symbol-coordinates.yaml from the Git index and gitignore it; sync derives symbol coordinates from schema 13.",
      "dry run: would move 2 legacy knowledge file(s) into .kb/:",
      "  docs/symbols.yaml -> .kb/symbols.yaml",
      "  docs/a.md -> .kb/a.md",
      "dry run: would remove 1 legacy cop(ies) identical to their .kb/ file:",
      "  docs/b.md (same as .kb/b.md)",
      "dry run: would retire legacy .kb/config.json after moving knowledge into .kb/.",
      `dry run: would set schemaVersion from 0 to ${LATEST} in .kb/manifest.json.`,
      "dry run: would record origin {kind: migration} on 3 authored entit(ies) without one.",
      `dry run: would write migration audit metadata to ${path.join(".kb", "migrations", "main.json")}.`,
      "Re-run with --yes to apply these changes.",
    ]);
    expect(s.planLinks).toHaveBeenCalledWith(cwd, "docs/symbols.yaml");
    expect(s.ladder).toHaveBeenCalledWith(cwd);
    expect(s.planFloors).toHaveBeenCalledWith(
      cwd,
      { ladder: true },
      { firm: true, approved: true },
    );
    expect(s.candidates).toHaveBeenCalledWith(cwd);
    expect(s.planClaims).toHaveBeenCalledWith(cwd, { candidates: true });
    expect(s.tracked).toHaveBeenCalledWith(cwd);
    expect(s.write).not.toHaveBeenCalled();
    expect(s.applyStorage).not.toHaveBeenCalled();
  });

  test("keep the quiet previews quiet", async () => {
    atVersion(0);
    s.planFloors.mockReturnValue({
      targets: [],
      kept: ["R1"],
      skipped: [],
      decidedBy: "receipt",
    } as never);
    s.candidates.mockResolvedValue(null as never);
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      older(0),
      "dry run: 1 firm or approved requirement(s) keep the tested floor (R1) because their latest end-to-end receipt passed; no synced store could be read, so other proof gaps were not judged. Run kibi sync and rerun the dry run for the ladder's verdict.",
      "dry run: no synced store could be read, so no proof_contract.proves was pinned; run kibi sync and rerun kibi migrate, or add proves by hand where kibi check --rules proof-contract-claims reports a contract.",
      `dry run: would set schemaVersion from 0 to ${LATEST} in .kb/manifest.json.`,
      `dry run: would write migration audit metadata to ${path.join(".kb", "migrations", "main.json")}.`,
      "Re-run with --yes to apply these changes.",
    ]);
    expect(s.planClaims).toHaveBeenCalledWith(cwd, null);
  });

  test("run only the steps after the current schema", async () => {
    atVersion(LATEST - 1);
    s.planOrigin.mockReturnValue({ targets: [{}] } as never);
    s.planPins.mockReturnValue({ targets: [{}], skipped: [] } as never);
    s.planReasons.mockReturnValue([{}] as never);
    s.planFirm.mockReturnValue([{}] as never);
    s.planFloors.mockReturnValue({
      targets: [{}],
      kept: [],
      skipped: [],
      decidedBy: "ladder",
    } as never);
    s.planClaims.mockReturnValue({
      targets: [{ id: "T1" }],
      review: [],
      skipped: [],
    } as never);
    expect(await dry()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      older(LATEST - 1),
      "dry run: would record required_evidence: asserted on 1 current firm or approved requirement(s) whose evidence is below tested (front matter only).",
      `dry run: would set schemaVersion from ${LATEST - 1} to ${LATEST} in .kb/manifest.json.`,
      `dry run: would write migration audit metadata to ${path.join(".kb", "migrations", "main.json")}.`,
      "Re-run with --yes to apply these changes.",
    ]);
    // Schema 15 pins approved requirements only; firm ones were pinned at 11.
    expect(s.ladder).toHaveBeenCalledWith(cwd);
    expect(s.planFloors).toHaveBeenCalledWith(
      cwd,
      { ladder: true },
      { firm: false, approved: true },
    );
    expect(s.candidates).not.toHaveBeenCalled();
    expect(s.planPins).not.toHaveBeenCalled();
    expect(s.planReasons).not.toHaveBeenCalled();
    expect(s.planFirm).not.toHaveBeenCalled();
    expect(s.planClaims).not.toHaveBeenCalled();
    expect(s.planOrigin).not.toHaveBeenCalled();
    expect(s.tracked).toHaveBeenCalledWith(cwd);
  });

  test("start each step at its own schema", async () => {
    const cases: Array<[number, string, () => void]> = [
      [
        5,
        "origin",
        () => s.planOrigin.mockReturnValue({ targets: [{}] } as never),
      ],
      [
        7,
        "pins",
        () =>
          s.planPins.mockReturnValue({ targets: [{}], skipped: [] } as never),
      ],
      [8, "reasons", () => s.planReasons.mockReturnValue([{}] as never)],
      [9, "firm", () => s.planFirm.mockReturnValue([{}] as never)],
      [
        LATEST - 1,
        "floors",
        () =>
          s.planFloors.mockReturnValue({
            targets: [{}],
            kept: [],
            skipped: [],
            decidedBy: "ladder",
          } as never),
      ],
      [
        11,
        "claims",
        () =>
          s.planClaims.mockReturnValue({
            targets: [{ id: "T" }],
            review: [],
            skipped: [],
          } as never),
      ],
    ];
    for (const [version, name, arrange] of cases) {
      // At the latest schema there is nothing left to migrate.
      for (const at of [version, version + 1].filter((v) => v < LATEST)) {
        mock.restore();
        s = stubs();
        logs = [];
        spyOn(console, "log").mockImplementation((...args: unknown[]) => {
          logs.push(args.map(String).join(" "));
        });
        atVersion(at);
        arrange();
        await dry();
        expect([name, at, logs.length]).toStrictEqual([
          name,
          at,
          at === version ? 5 : 4,
        ]);
      }
    }
  });

  test("treat a missing or invalid version as schema 0", async () => {
    s.status.mockReturnValue({ state: "missing" } as never);
    s.read.mockReturnValue(null as never);
    s.plan.mockReturnValue(storagePlan({ legacyConfig: "present" }) as never);
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from missing to ${LATEST} in .kb/manifest.json.`,
    );
    expect(logs[0]).toBe(
      "Warning: KB schemaVersion is missing; the repository should be initialized or migrated.",
    );
    s.status.mockReturnValue({ state: "invalid", warning: "bad" } as never);
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from invalid (null) to ${LATEST} in .kb/manifest.json.`,
    );
    s.plan.mockReturnValue(storagePlan() as never);
    atVersion(null);
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from invalid (null) to ${LATEST} in .kb/manifest.json.`,
    );
    atVersion("x");
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from invalid ("x") to ${LATEST} in .kb/manifest.json.`,
    );
    atVersion(-3);
    logs = [];
    s.planOrigin.mockReturnValue({ targets: [{}] } as never);
    await dry();
    expect(logs).toContain(
      "dry run: would record origin {kind: migration} on 1 authored entit(ies) without one.",
    );
  });

  test("take the older of the legacy and manifest versions", async () => {
    s.plan.mockReturnValue(
      storagePlan({ legacyConfig: "present", schemaVersion: "4" }) as never,
    );
    atVersion(9);
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 4 to ${LATEST} in .kb/manifest.json.`,
    );
    atVersion(2);
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 2 to ${LATEST} in .kb/manifest.json.`,
    );
    s.read.mockReturnValue(null as never);
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 4 to ${LATEST} in .kb/manifest.json.`,
    );
    s.plan.mockReturnValue(
      storagePlan({ legacyConfig: "absent", schemaVersion: "6" }) as never,
    );
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 6 to ${LATEST} in .kb/manifest.json.`,
    );
    s.plan.mockReturnValue(
      storagePlan({ legacyConfig: "present", schemaVersion: null }) as never,
    );
    atVersion(3);
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 3 to ${LATEST} in .kb/manifest.json.`,
    );
  });

  test("migrate storage at the latest schema", async () => {
    s.plan.mockReturnValue(
      storagePlan({ removals: [{ path: "a", duplicateOf: "b" }] }) as never,
    );
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from ${LATEST} to ${LATEST} in .kb/manifest.json.`,
    );
  });
});

describe("schema upgrade", () => {
  test("apply every step from schema 0 and write the audit", async () => {
    atVersion(0);
    spyOn(Date.prototype, "toISOString").mockReturnValue(
      "2026-02-03T04:05:06.000Z",
    );
    s.applyStorage.mockReturnValue({
      movedFiles: ["a", "b"],
      untrackedMovedFiles: ["b"],
      removedFiles: ["c", "d"],
      retiredLegacyConfig: true,
    } as never);
    s.plan.mockReturnValue(
      storagePlan({
        moves: [{ from: "x", to: "y" }],
        legacyConfig: "present",
      }) as never,
    );
    s.applyPolarity.mockReturnValue(2);
    s.applyPins.mockReturnValue(3);
    s.planTags.mockReturnValue({
      targets: [{ type: "req" }],
      skipped: [{ path: "t.md", reason: "bad" }],
    } as never);
    s.applyTags.mockReturnValue(1);
    s.acknowledged.mockReturnValue(["B", "A"]);
    s.read.mockReturnValue({
      schemaVersion: 0,
      contextAcknowledged: ["C", "A"],
      supersedesReasonAcknowledged: ["old"],
      firmSupersedeAcknowledged: ["older"],
    } as never);
    s.applyOrigin.mockReturnValue({
      written: [{}, {}],
      skipped: [{ path: "o.md", reason: "locked" }],
      previouslyStamped: 1,
    } as never);
    s.planReasons.mockReturnValue(["r1"] as never);
    s.planFirm.mockReturnValue(["f1", "f2"] as never);
    s.planFloors.mockReturnValue({
      targets: [],
      kept: ["R1"],
      skipped: [{ path: "e.md", reason: "nope" }],
      decidedBy: "ladder",
    } as never);
    s.applyFloors.mockReturnValue(2);
    s.applyClaims.mockReturnValue({
      targets: [{ id: "T1" }],
      review: [{ id: "T2" }],
      skipped: [],
    } as never);
    s.untrack.mockReturnValue({ outcome: "untracked" } as never);
    s.gitignore.mockReturnValue(true);
    s.gaps.mockReturnValue(["no attr", "no config"]);
    const result = await yes();
    expect(logs).toStrictEqual([
      older(0),
      "Moved 2 knowledge file(s) into the canonical .kb/ layout.",
      "Warning: 1 moved file(s) are not tracked by Git yet. Kibi recorded a pending-source receipt for each, so kibi sync compiles them now; stage them before you commit (git add .kb, plus the removals under the legacy folders). Each receipt retires once Git tracks its file.",
      "Removed 2 legacy cop(ies) identical to their .kb/ file: c, d.",
      "Retired legacy .kb/config.json.",
      "Encoded 2 legacy polarity-only fact(s) as typed booleans.",
      "Pinned semantic_text on 3 requirement(s) that lacked it.",
      "Tagged 1 current entit(ies) without body context review:context-missing (1 req); no prose was written.",
      "Warning: Cannot tag t.md: bad.",
      "Acknowledged 1 supersede(s) recorded without a 'Why this changed' section; new supersedes must explain themselves.",
      "Acknowledged 2 supersede(s) of decisions without firmness that read as firm from schema 10; a new replacement of such a decision must be firm.",
      "Recorded required_evidence: asserted on 2 current firm or approved requirement(s) whose evidence is below tested; raise it to tested once the requirement has an end-to-end proof.",
      "1 firm or approved requirement(s) keep the tested floor; the evidence ladder accepts each, or needs only kibi prove re-run (kibi check --fresh-evidence lists those).",
      "Warning: Cannot record required_evidence on e.md: nope.",
      "Pinned proof_contract.proves on 1 certificate test(s) (T1); run kibi prove for them so their receipts bind the claim.",
      "Review T2",
      `Migrated the KB to schemaVersion ${LATEST} on the canonical .kb/ layout (was 0).`,
      "Marked semantic advisor backfill as pending in .kb/manifest.json.",
      "Recorded origin {kind: migration} on 2 authored entit(ies).",
      "Warning: Origin not recorded for o.md: locked.",
      `Wrote migration audit metadata to ${path.join(".kb", "migrations", "main.json")}.`,
      "Migration complete. Future 'kibi migrate' runs will be a no-op.",
      "Tip: kibi merge-driver resolves .kb/symbols.yaml merges by record id, but it is not wired up (no attr; no config). Run: wire",
      "Removed .kb/symbol-coordinates.yaml from the Git index (the local file stays); commit the removal with the migration. Sync derives symbol coordinates from now on.",
    ]);
    const record: MigrationAuditRecord = {
      auditVersion: 1,
      branch: "main",
      manifestPath: ".kb/manifest.json",
      fromVersion: 0,
      migratedAt: "2026-02-03T04:05:06.000Z",
      semanticAdvisorBackfill: "pending" as const,
      status: "applied",
      symbolGranularityLegacyLinks: 0,
      entityOriginBackfill: 3,
      supersededRequirementsClosed: 0,
      sourcePathsRewritten: 0,
      sourcePathsRemoved: 0,
      legacyStatusesMapped: 0,
      toVersion: LATEST,
      preMigrationWarning: older(0).slice("Warning: ".length),
      steps: [
        "config-canonical-v1",
        "symbol-granularity-v2",
        "compatibility-v3",
        "semantic-backfill-v4",
        "canonical-storage-v5",
        "entity-origin-v6",
        "polarity-values-v7",
        "entity-body-context-v8",
        "decision-firmness-v9",
        "firmness-from-origin-v10",
        "evidence-floor-v11",
        "claim-bound-proofs-v12",
        "derived-symbol-coordinates-v13",
        "retired-status-v14",
        "approval-floor-v15",
      ],
    };
    expect(result).toStrictEqual({
      exitCode: 0,
      summary: {
        auditPath: path.join(".kb", "migrations", "main.json"),
        audit: record,
        gitignoreUpdated: true,
      },
    });
    expect(audit()).toStrictEqual({ ...record });
    expect(
      fs.readFileSync(path.join(cwd, ".kb", "migrations", "main.json"), "utf8"),
    ).toBe(`${JSON.stringify(record, null, 2)}\n`);
    expect(fs.readdirSync(path.join(cwd, ".kb", "migrations"))).toStrictEqual([
      "main.json",
    ]);
    expect(s.write).toHaveBeenCalledWith(cwd, {
      schemaVersion: LATEST,
      contextAcknowledged: ["A", "B", "C"],
      supersedesReasonAcknowledged: { existing: ["old"], added: ["r1"] },
      firmSupersedeAcknowledged: { existing: ["older"], added: ["f1", "f2"] },
      semanticAdvisorBackfill: "pending",
    });
    expect(s.applyOrigin).toHaveBeenCalledWith(cwd, "2026-02-03T04:05:06.000Z");
    expect(s.applyStorage).toHaveBeenCalledWith(
      cwd,
      storagePlan({ moves: [{ from: "x", to: "y" }], legacyConfig: "present" }),
    );
    expect(s.applyFloors).toHaveBeenCalledWith(
      cwd,
      { ladder: true },
      { firm: true, approved: true },
    );
    expect(s.applyClaims).toHaveBeenCalledWith(cwd, { candidates: true });
    expect(s.refresh).toHaveBeenCalledWith(cwd, { bytes: "before" });
    expect(s.untrack).toHaveBeenCalledWith(cwd);
    expect(s.gaps).toHaveBeenCalledWith(cwd);
    expect(s.setup).toHaveBeenCalledWith(cwd, ["no attr", "no config"]);
    expect(s.acknowledged).toHaveBeenCalledWith({
      targets: [{ type: "req" }],
      skipped: [{ path: "t.md", reason: "bad" }],
    });
  });

  test("apply only the late steps from an earlier schema", async () => {
    atVersion(LATEST - 2);
    s.untrack.mockReturnValue({ outcome: "failed", reason: "locked" } as never);
    const result = await yes();
    expect(logs).toStrictEqual([
      older(LATEST - 2),
      `Migrated the KB to schemaVersion ${LATEST} on the canonical .kb/ layout (was ${LATEST - 2}).`,
      `Wrote migration audit metadata to ${path.join(".kb", "migrations", "main.json")}.`,
      "Migration complete. Future 'kibi migrate' runs will be a no-op.",
      "Warning: Could not remove .kb/symbol-coordinates.yaml from the Git index (locked); run git rm --cached .kb/symbol-coordinates.yaml before the next commit.",
    ]);
    expect(result.summary?.audit.steps).toStrictEqual([
      "retired-status-v14",
      "approval-floor-v15",
    ]);
    expect(result.summary?.audit.semanticAdvisorBackfill).toBe(
      "not_applicable",
    );
    expect(s.write).toHaveBeenCalledWith(cwd, {
      schemaVersion: LATEST,
      semanticAdvisorBackfill: "not_applicable",
    });
    for (const spy of [
      s.applyPins,
      s.planTags,
      s.applyTags,
      s.applyOrigin,
      s.planReasons,
      s.planFirm,
      s.applyClaims,
      s.applyStorage,
    ])
      expect(spy).not.toHaveBeenCalled();
    // Schema 15 pins approved requirements only.
    expect(s.applyFloors).toHaveBeenCalledWith(
      cwd,
      { ladder: true },
      { firm: false, approved: true },
    );
  });

  test("skip the coordinate untrack at the latest schema", async () => {
    s.plan.mockReturnValue(storagePlan({ removals: [{}] }) as never);
    const result = await yes();
    expect(s.untrack).not.toHaveBeenCalled();
    expect(result.summary?.audit.steps).toStrictEqual([]);
  });

  test("keep a recorded semantic advisor backfill", async () => {
    atVersion(LATEST - 1);
    s.read.mockReturnValue({
      schemaVersion: LATEST - 1,
      semanticAdvisorBackfill: "completed",
    } as never);
    expect((await yes()).summary?.audit.semanticAdvisorBackfill).toBe(
      "completed",
    );
    s.read.mockReturnValue({
      schemaVersion: LATEST - 1,
      semanticAdvisorBackfill: "bogus",
    } as never);
    s.plan.mockReturnValue(
      storagePlan({ semanticAdvisorBackfill: "not_applicable" }) as never,
    );
    expect((await yes()).summary?.audit.semanticAdvisorBackfill).toBe(
      "not_applicable",
    );
    s.plan.mockReturnValue(
      storagePlan({ semanticAdvisorBackfill: "pending" }) as never,
    );
    expect((await yes()).summary?.audit.semanticAdvisorBackfill).toBe(
      "pending",
    );
    s.plan.mockReturnValue(storagePlan({ removals: [{}] }) as never);
    atVersion(LATEST);
    expect((await yes()).summary?.audit.semanticAdvisorBackfill).toBe(
      "pending",
    );
  });

  test("start from the default manifest when none can be read", async () => {
    atVersion(LATEST - 1);
    let reads = 0;
    s.read.mockImplementation((() => {
      reads += 1;
      return reads === 1 ? { schemaVersion: LATEST - 1 } : null;
    }) as never);
    await yes();
    expect(s.write).toHaveBeenCalledWith(cwd, {
      schemaVersion: LATEST,
      fresh: true,
      semanticAdvisorBackfill: "not_applicable",
    });
  });

  test("leave unmoved storage quiet", async () => {
    s.plan.mockReturnValue(storagePlan({ legacyConfig: "present" }) as never);
    await yes();
    expect(s.applyStorage).toHaveBeenCalledTimes(1);
    expect(logs[0]).toBe(
      `Migrated the KB to schemaVersion ${LATEST} on the canonical .kb/ layout (was ${LATEST}).`,
    );
    s.applyStorage.mockReturnValue({
      movedFiles: ["a"],
      untrackedMovedFiles: [],
      removedFiles: [],
      retiredLegacyConfig: false,
    } as never);
    logs = [];
    await yes();
    expect(logs[0]).toBe(
      "Moved 1 knowledge file(s) into the canonical .kb/ layout.",
    );
    expect(logs[1]).toStartWith("Migrated the KB");
  });

  test("print no floor line when no requirement keeps the floor", async () => {
    atVersion(0);
    s.candidates.mockResolvedValue(null as never);
    s.gaps.mockReturnValue(null);
    await yes();
    expect(logs).toStrictEqual([
      older(0),
      "no synced store could be read, so no proof_contract.proves was pinned; run kibi sync and rerun kibi migrate, or add proves by hand where kibi check --rules proof-contract-claims reports a contract.",
      `Migrated the KB to schemaVersion ${LATEST} on the canonical .kb/ layout (was 0).`,
      "Marked semantic advisor backfill as pending in .kb/manifest.json.",
      `Wrote migration audit metadata to ${path.join(".kb", "migrations", "main.json")}.`,
      "Migration complete. Future 'kibi migrate' runs will be a no-op.",
    ]);
  });

  test("label a legacy version recorded without a manifest", async () => {
    s.status.mockReturnValue({ state: "missing" } as never);
    s.read.mockReturnValue(null as never);
    s.plan.mockReturnValue(
      storagePlan({ legacyConfig: "present", schemaVersion: 3 }) as never,
    );
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 3 to ${LATEST} in .kb/manifest.json.`,
    );
  });

  test("only preview delivered status mappings during an upgrade dry run", async () => {
    atVersion(0);
    s.planStatuses.mockReturnValue([
      {
        requirementId: "R1",
        status: "done",
        automatic: { status: "closed", tag: "implemented" },
      },
    ] as never);
    await dry();
    expect(logs).toContain(
      "dry run: would map legacy status done -> closed (tag implemented) on 1 requirement(s): R1.",
    );
    expect(s.applyStatuses).not.toHaveBeenCalled();
  });

  test("leave quiet steps quiet from schema 0", async () => {
    atVersion(0);
    s.planFloors.mockReturnValue({
      targets: [],
      kept: ["R1"],
      skipped: [],
      decidedBy: "receipt",
    } as never);
    s.candidates.mockResolvedValue(null as never);
    s.gaps.mockReturnValue(null);
    await yes();
    expect(logs).toStrictEqual([
      older(0),
      "1 firm or approved requirement(s) keep the tested floor because their latest end-to-end receipt passed; no synced store could be read, so run kibi sync and kibi check --rules evidence-floor to list any whose proof has other gaps (kibi proof explain <id> names them).",
      "no synced store could be read, so no proof_contract.proves was pinned; run kibi sync and rerun kibi migrate, or add proves by hand where kibi check --rules proof-contract-claims reports a contract.",
      `Migrated the KB to schemaVersion ${LATEST} on the canonical .kb/ layout (was 0).`,
      "Marked semantic advisor backfill as pending in .kb/manifest.json.",
      `Wrote migration audit metadata to ${path.join(".kb", "migrations", "main.json")}.`,
      "Migration complete. Future 'kibi migrate' runs will be a no-op.",
    ]);
    expect(s.write).toHaveBeenCalledWith(cwd, {
      schemaVersion: LATEST,
      contextAcknowledged: [],
      semanticAdvisorBackfill: "pending",
    });
    expect(s.setup).not.toHaveBeenCalled();
  });

  test("report remaining work and counts in the audit", async () => {
    atVersion(LATEST - 1);
    s.planStatuses.mockReturnValue([
      {
        requirementId: "R1",
        path: "r1.md",
        status: "x",
        automatic: null,
        extractionError: "unknown status",
        suggestedStatus: null,
      },
      {
        requirementId: "R2",
        path: "r2.md",
        status: "y",
        automatic: null,
        extractionError: null,
        suggestedStatus: "open",
      },
    ] as never);
    s.applyClosures.mockReturnValue({
      closed: [{ id: "C" }],
      skipped: [],
    } as never);
    s.applyRepairs.mockReturnValue({
      rewritten: [{}, {}],
      removed: [{}, {}, {}],
      skipped: [],
    } as never);
    s.applyLinks.mockReturnValue({ marked: ["S", "T"], unmarked: [] } as never);
    const result = await yes();
    expect(result.summary?.audit).toMatchObject({
      symbolGranularityLegacyLinks: 2,
      supersededRequirementsClosed: 1,
      sourcePathsRewritten: 2,
      sourcePathsRemoved: 3,
      legacyStatusesMapped: 0,
    });
    expect(logs).toContain(
      "  R1 (r1.md): status x is not a status Kibi knows, so kibi sync cannot compile it (unknown status). Set status to open, in_progress, closed or retired in the file (closed with the tag implemented for delivered work), then run kibi sync.",
    );
    expect(logs).toContain(
      "  R2 (r2.md): status y is not a requirement status, so the proof ladder skips it. Approve req-status-vocabulary-map-R2 (y -> open) with kibi migrate --apply-safe, or set the status in the file.",
    );
    expect(logs).not.toContain(
      "Migration complete. Future 'kibi migrate' runs will be a no-op.",
    );
  });

  test("write the audit for the branch", async () => {
    atVersion(LATEST - 1);
    s.attach.mockReturnValue({ kbBranch: "feature" } as never);
    await yes();
    expect(
      fs.existsSync(path.join(cwd, ".kb", "migrations", "feature.json")),
    ).toBe(true);
  });
});

type Output = {
  structuredContent?: Record<string, unknown>;
  content?: unknown[];
};

function planHarness() {
  const runtime = { runtime: true };
  const outputs: Record<string, Output> = {
    status: { structuredContent: {} },
    check: { structuredContent: {} },
    req: { structuredContent: {} },
    symbol: { structuredContent: {} },
    apply: {
      structuredContent: { outcome: "applied" },
      content: [{ type: "text", text: "Applied." }],
    },
  };
  const calls: Array<[string, unknown]> = [];
  const createRuntime = spyOn(cliRuntime, "createCliRuntime").mockReturnValue(
    runtime as never,
  );
  const execute = spyOn(runtimeTypes, "executeOperation").mockImplementation(
    (async (rt: unknown, spec: unknown, input: { by?: string }) => {
      expect(rt).toBe(runtime);
      const name =
        spec === statusSpec
          ? "status"
          : spec === checkSpec
            ? "check"
            : spec === coverageSpec
              ? (input.by as string)
              : spec === applyPlanSpec
                ? "apply"
                : "unknown";
      calls.push([name, input]);
      return outputs[name] as never;
    }) as never,
  );
  const fragment = {
    actions: [] as unknown[],
    sourceRewriteActionIds: [] as string[],
    diagnostics: [] as string[],
  };
  const build = spyOn(
    schema6,
    "buildSchema6MigrationFragment",
  ).mockImplementation((() => fragment) as never);
  const record = spyOn(planRecord, "recordPrintedPlan").mockReturnValue(
    undefined,
  );
  const find = spyOn(planRecord, "findPrintedPlan").mockReturnValue(undefined);
  const change = spyOn(planRecord, "describePlanChange").mockReturnValue([]);
  return {
    runtime,
    outputs,
    calls,
    createRuntime,
    execute,
    fragment,
    build,
    record,
    find,
    change,
  };
}

let h: ReturnType<typeof planHarness>;

async function jsonPlan(options: Record<string, unknown> = {}) {
  logs = [];
  const result = await migrateCommand({
    format: "json",
    workspaceRoot: cwd,
    ...options,
  });
  return { result, plan: JSON.parse(logs.join("\n")) };
}

const ready = (id: string, overrides: Record<string, unknown> = {}) =>
  migrationAction({
    id,
    code: `code_${id}`,
    safety: "automatic",
    autoApplicable: true,
    invocation: { kind: "cli", command_argv: ["kibi", "x"] },
    ...overrides,
  } as never);

function statusPlan(actions: unknown[], extra: Record<string, unknown> = {}) {
  h.outputs.status = {
    structuredContent: {
      migrationPlan: buildMigrationPlan({
        expected: { branch: "main" },
        evaluatedDomains: ["status"],
        actions: actions as never,
      }),
      ...extra,
    },
  };
}

const checkable = (extra: Record<string, unknown> = {}) =>
  statusPlan([], {
    branchStore: { state: "healthy" },
    schemaStatus: { needsMigration: false, currentVersion: LATEST },
    branchAttachment: { kind: "exact" },
    snapshotId: "snap",
    ...extra,
  });

const ids = (plan: { actions: Array<{ id: string }> }) =>
  plan.actions.map((action) => action.id);

describe("migration plan", () => {
  beforeEach(() => {
    h = planHarness();
  });

  test("report an empty workspace as incomplete", async () => {
    const { result, plan } = await jsonPlan();
    expect(result).toStrictEqual({ exitCode: 0 });
    expect(plan).toStrictEqual(
      JSON.parse(
        JSON.stringify(
          buildMigrationPlan({
            evaluatedDomains: ["package", "branch", "storage", "schema"],
            incompleteDomains: ["status"],
            diagnostics: [
              "Unable to assemble downstream migration domains from the current workspace state.",
            ],
          }),
        ),
      ),
    );
    expect(h.createRuntime).toHaveBeenCalledWith({ workspaceRoot: cwd });
    expect(h.calls).toStrictEqual([["status", {}]]);
    expect(h.record).toHaveBeenCalledWith(cwd, plan);
    expect(h.build).toHaveBeenCalledWith({
      workspaceRoot: cwd,
      currentSchemaVersion: LATEST,
      ladderFloors: null,
      claimCandidates: null,
    });
  });

  test("print the plan without recording it on a dry run", async () => {
    await jsonPlan({ dryRun: true });
    expect(h.record).not.toHaveBeenCalled();
  });

  test("read the current schema from status, then the manifest", async () => {
    h.outputs.status = {
      structuredContent: { schemaStatus: { currentVersion: 10 } },
    };
    await jsonPlan();
    expect(h.build).toHaveBeenLastCalledWith({
      workspaceRoot: cwd,
      currentSchemaVersion: 10,
      ladderFloors: { ladder: true },
      claimCandidates: { candidates: true },
    });
    h.outputs.status = { structuredContent: {} };
    s.read.mockReturnValue({ schemaVersion: 11 } as never);
    await jsonPlan();
    expect(h.build).toHaveBeenLastCalledWith({
      workspaceRoot: cwd,
      currentSchemaVersion: 11,
      ladderFloors: { ladder: true },
      claimCandidates: { candidates: true },
    });
    s.read.mockReturnValue(null as never);
    h.outputs.status = {} as Output;
    await jsonPlan();
    expect(h.build).toHaveBeenLastCalledWith({
      workspaceRoot: cwd,
      currentSchemaVersion: null,
      ladderFloors: { ladder: true },
      claimCandidates: { candidates: true },
    });
    expect(s.ladder).toHaveBeenCalledWith(cwd);
    expect(s.candidates).toHaveBeenCalledWith(cwd);
    s.read.mockReturnValue({ schemaVersion: 12 } as never);
    h.outputs.status = { structuredContent: {} };
    await jsonPlan();
    expect(h.build).toHaveBeenLastCalledWith({
      workspaceRoot: cwd,
      currentSchemaVersion: 12,
      ladderFloors: { ladder: true },
      claimCandidates: null,
    });
  });

  test("keep the status plan", async () => {
    statusPlan([ready("a")]);
    const { plan } = await jsonPlan();
    expect(ids(plan)).toStrictEqual(["a"]);
    expect(plan.expected.branch).toBe("main");
  });

  test("make the schema upgrade wait for source rewrites and sync after both", async () => {
    statusPlan([
      ready("schema-config-upgrade", { dependsOn: ["prior"] }),
      ready("prior"),
      migrationAction({ id: "manual", code: "c", safety: "review" } as never),
    ]);
    h.fragment.actions = [ready("rewrite-1")];
    h.fragment.sourceRewriteActionIds = ["rewrite-1"];
    const { plan } = await jsonPlan();
    const upgrade = plan.actions.find(
      (action: { id: string }) => action.id === "schema-config-upgrade",
    );
    expect(upgrade.dependsOn).toStrictEqual(["prior", "rewrite-1"]);
    const sync = schema6.migrationSyncAction([
      "rewrite-1",
      "prior",
      "schema-config-upgrade",
    ]);
    expect(
      plan.actions.find((action: { id: string }) => action.id === sync.id),
    ).toStrictEqual(JSON.parse(JSON.stringify(sync)));
    expect(plan.scope.evaluatedDomains).toStrictEqual([
      "schema",
      "semantic",
      "status",
    ]);
  });

  test("sync after an upgrade only when no status sync follows it", async () => {
    const statusSync = migrationAction({
      id: "resync",
      code: "c",
      safety: "automatic",
      dependsOn: ["schema-config-upgrade"],
      invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
    } as never);
    statusPlan([ready("schema-config-upgrade"), statusSync]);
    const syncId = schema6.migrationSyncAction([]).id;
    expect(ids((await jsonPlan()).plan)).not.toContain(syncId);
    for (const variant of [
      { safety: "review" },
      { dependsOn: [] },
      { invocation: { kind: "review", instruction: "x" } },
      { invocation: { kind: "cli", command_argv: ["kibi", "check"] } },
    ]) {
      statusPlan([
        ready("schema-config-upgrade"),
        migrationAction({ ...statusSync, ...variant } as never),
      ]);
      const { plan } = await jsonPlan();
      expect([variant, ids(plan).includes(syncId)]).toStrictEqual([
        variant,
        true,
      ]);
      expect(
        plan.actions.find((action: { id: string }) => action.id === syncId)
          .dependsOn,
      ).toStrictEqual(
        [
          "schema-config-upgrade",
          ...(variant.safety === "review" ? [] : ["resync"]),
        ].sort(),
      );
    }
    statusPlan([ready("other")]);
    expect(ids((await jsonPlan()).plan)).not.toContain(syncId);
  });

  test("hold the sync while an inventory needs review", async () => {
    h.fragment.actions = [
      ready("rewrite-1"),
      migrationAction({
        id: "review-1",
        code: "semantic_inventory_review",
      } as never),
    ];
    h.fragment.sourceRewriteActionIds = ["rewrite-1"];
    statusPlan([ready("branch-store-compile"), ready("schema-config-upgrade")]);
    const { plan } = await jsonPlan();
    const syncId = schema6.migrationSyncAction([]).id;
    expect(ids(plan)).not.toContain(syncId);
    const compile = plan.actions.find(
      (action: { id: string }) => action.id === "branch-store-compile",
    );
    expect(compile.state).toBe("blocked");
    expect(compile.autoApplicable).toBe(false);
    expect(compile.evidence).toStrictEqual({
      blockedBy: ["review-1"],
      reason:
        "kibi sync rejects a requirement until its semantic inventory review is fixed; rerun kibi migrate afterwards.",
    });
    const upgrade = plan.actions.find(
      (action: { id: string }) => action.id === "schema-config-upgrade",
    );
    expect(upgrade.dependsOn).toStrictEqual(["rewrite-1"]);
  });

  test("order store syncs after source rewrites", async () => {
    h.fragment.actions = [ready("rewrite-1")];
    h.fragment.sourceRewriteActionIds = ["rewrite-1"];
    statusPlan([
      ready("freshness-resync"),
      ready("branch-store-compile", { state: "blocked" }),
      ready("other"),
    ]);
    const { plan } = await jsonPlan();
    const find = (id: string) =>
      plan.actions.find((action: { id: string }) => action.id === id);
    expect(find("freshness-resync").dependsOn).toStrictEqual(["rewrite-1"]);
    expect(find("branch-store-compile").dependsOn).toStrictEqual([]);
    expect(find("other").dependsOn).toStrictEqual([]);
  });

  test("leave store syncs alone without rewrites or reviews", async () => {
    statusPlan([ready("freshness-resync")]);
    h.fragment.diagnostics = ["note"];
    const { plan } = await jsonPlan();
    expect(plan.actions[0].dependsOn).toStrictEqual([]);
    expect(plan.diagnostics).toStrictEqual(["note"]);
    expect(plan.expected.branch).toBe("main");
  });

  test("plan check and coverage findings on a synced store", async () => {
    checkable();
    h.outputs.check = {
      structuredContent: {
        migrationPlan: buildMigrationPlan({
          evaluatedDomains: ["quality"],
          actions: [
            migrationAction({ id: "q1", code: "quality_x" } as never),
            migrationAction({
              id: "s1",
              code: "check_req-status-vocabulary",
            } as never),
            migrationAction({ id: "s2", code: "migration_sync" } as never),
          ],
        }),
      },
    };
    h.outputs.req = {
      structuredContent: {
        migrationPlan: buildMigrationPlan({
          actions: [migrationAction({ id: "c1", code: "coverage_x" } as never)],
        }),
      },
    };
    h.outputs.symbol = {
      structuredContent: {
        migrationPlan: buildMigrationPlan({
          actions: [migrationAction({ id: "c2", code: "coverage_y" } as never)],
        }),
      },
    };
    const { plan } = await jsonPlan();
    expect(h.calls).toStrictEqual([
      ["status", {}],
      ["check", {}],
      ["req", { by: "req", limit: 10_000, offset: 0 }],
      ["symbol", { by: "symbol", limit: 10_000, offset: 0 }],
    ]);
    expect(ids(plan).sort()).toStrictEqual(["c1", "c2", "q1"]);
  });

  test("skip check and coverage plans that are absent", async () => {
    checkable();
    const { plan } = await jsonPlan();
    expect(h.calls.map(([name]) => name)).toStrictEqual([
      "status",
      "check",
      "req",
      "symbol",
    ]);
    expect(ids(plan)).toStrictEqual([]);
  });

  test("check a store whose status carries no schema state", async () => {
    checkable({ schemaStatus: undefined });
    await jsonPlan();
    expect(h.calls.map(([name]) => name)).toStrictEqual([
      "status",
      "check",
      "req",
      "symbol",
    ]);
  });

  test("check an older store one schema below origin", async () => {
    checkable({
      schemaStatus: { needsMigration: true, currentVersion: 5 },
    });
    await jsonPlan();
    expect(h.calls.map(([name]) => name)).toContain("check");
    s.read.mockReturnValue(null as never);
    for (const extra of [
      { schemaStatus: { needsMigration: true, currentVersion: 4 } },
      { schemaStatus: { needsMigration: true } },
      { branchStore: { state: "missing" } },
      { branchAttachment: { kind: "fallback" } },
    ]) {
      h.calls.length = 0;
      checkable(extra);
      await jsonPlan();
      expect([extra, h.calls.map(([name]) => name)]).toStrictEqual([
        extra,
        ["status"],
      ]);
    }
  });

  test("say the check was skipped on a never-synced store", async () => {
    checkable({ snapshotId: "missing" });
    const { plan } = await jsonPlan();
    expect(h.calls.map(([name]) => name)).toStrictEqual(["status"]);
    expect(plan.scope.incompleteDomains).toStrictEqual(["quality"]);
    expect(plan.diagnostics).toStrictEqual([
      "kibi check did not run because this branch has never been synced; apply the plan (or run kibi sync) and rerun kibi migrate for quality actions.",
    ]);
    expect(plan.scope.evaluatedDomains).toStrictEqual([
      "schema",
      "semantic",
      "status",
    ]);
  });

  test("build the fragment plan without a status plan", async () => {
    h.fragment.actions = [ready("rewrite-1")];
    h.fragment.sourceRewriteActionIds = ["rewrite-1"];
    const { plan } = await jsonPlan();
    expect(plan.expected.branch).toBeNull();
    expect(ids(plan).sort()).toStrictEqual(
      ["rewrite-1", schema6.migrationSyncAction([]).id].sort(),
    );
    expect(plan.scope.incompleteDomains).toStrictEqual([]);
  });
});

describe("plan text", () => {
  beforeEach(() => {
    h = planHarness();
  });

  test("print migration actions, the backlog counts and the apply command", async () => {
    statusPlan([
      ready("a"),
      ready("b", { state: "blocked" }),
      ready("c", { autoApplicable: false }),
      migrationAction({ id: "q1", code: "quality_x" } as never),
      migrationAction({ id: "q2", code: "quality_x" } as never),
      migrationAction({ id: "q3", code: "coverage_a" } as never),
      migrationAction({ id: "q4", code: "coverage_b" } as never),
      migrationAction({ id: "r1", code: "review_other" } as never),
      migrationAction({ id: "r2", code: "review_supersession_cycle" } as never),
    ]);
    logs = [];
    expect(await migrateCommand({ workspaceRoot: cwd })).toStrictEqual({
      exitCode: 0,
    });
    const hash = (h.record.mock.calls[0]?.[1] as { planHash: string }).planHash;
    const status = (h.record.mock.calls[0]?.[1] as { status: string }).status;
    expect(logs).toStrictEqual([
      `Migration plan ${hash}`,
      "Migration: 4 action(s); automatic-ready: 1",
      "- blocked automatic code_b: b",
      "- ready automatic code_a: a",
      "- ready automatic code_c: c",
      "- ready review review_supersession_cycle: r2",
      "Quality backlog (not part of the migration): 5 review item(s) that kibi check and kb_status also report.",
      "  2 quality_x",
      "  1 coverage_a",
      "  1 coverage_b",
      "  1 review_other",
      "  List each item with --backlog.",
      `Plan status: ${status} (covers both sections). Use --format json for structured actions.`,
      `Apply the 1 ready automatic action(s) of this plan: kibi migrate --apply-safe ${hash}`,
    ]);
  });

  test("list the backlog and a complete migration", async () => {
    statusPlan([
      migrationAction({ id: "q1", code: "quality_x" } as never),
      migrationAction({
        id: "r3",
        code: "review_source_path_dangling",
      } as never),
    ]);
    logs = [];
    await migrateCommand({ workspaceRoot: cwd, backlog: true });
    expect(logs.slice(1, 5)).toStrictEqual([
      "Migration: 1 action(s); automatic-ready: 0",
      "- ready review review_source_path_dangling: r3",
      "Quality backlog (not part of the migration): 1 review item(s) that kibi check and kb_status also report.",
      "- ready review quality_x: q1",
    ]);
    statusPlan([]);
    logs = [];
    await migrateCommand({ workspaceRoot: cwd });
    expect(logs[1]).toBe("Migration: complete; no migration actions remain.");
    expect(logs).toHaveLength(3);
  });

  test("print what to do about inline implements comments", async () => {
    statusPlan([
      migrationAction({
        id: "review-inline-implements-comments",
        code: INLINE_IMPLEMENTS_REVIEW_CODE,
        safety: "review",
        invocation: { kind: "review", instruction: "Move the links." },
      } as never),
      migrationAction({
        id: "r3",
        code: "review_source_path_dangling",
        safety: "review",
        invocation: { kind: "review", instruction: "not printed" },
      } as never),
      migrationAction({
        id: "odd",
        code: INLINE_IMPLEMENTS_REVIEW_CODE,
        invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
      } as never),
    ]);
    logs = [];
    await migrateCommand({ workspaceRoot: cwd });
    expect(logs.slice(1, -1)).toStrictEqual([
      "Migration: 3 action(s); automatic-ready: 0",
      "- ready review review_inline_implements_comment: odd",
      "- ready review review_source_path_dangling: r3",
      "- ready review review_inline_implements_comment: review-inline-implements-comments",
      "  Move the links.",
    ]);
  });

  test("classify backlog codes", () => {
    expect(isBacklogAction({ code: "quality_a" })).toBe(true);
    expect(isBacklogAction({ code: "coverage_a" })).toBe(true);
    expect(isBacklogAction({ code: "review_a" })).toBe(true);
    expect(isBacklogAction({ code: "review_supersession_cycle" })).toBe(false);
    expect(isBacklogAction({ code: "review_source_path_dangling" })).toBe(
      false,
    );
    expect(isBacklogAction({ code: INLINE_IMPLEMENTS_REVIEW_CODE })).toBe(
      false,
    );
    expect(isBacklogAction({ code: "schema_quality_x" })).toBe(false);
    expect(isBacklogAction({ code: "xcoverage_" })).toBe(false);
    expect(isBacklogAction({ code: "xreview_" })).toBe(false);
  });
});

describe("plan approval", () => {
  beforeEach(() => {
    h = planHarness();
    statusPlan([ready("a"), ready("b"), ready("c", { state: "blocked" })]);
  });

  async function currentHash(): Promise<string> {
    return (await jsonPlan({ dryRun: true })).plan.planHash;
  }

  test("refuse two different hashes", async () => {
    const hash = await currentHash();
    errors = [];
    expect(
      await migrateCommand({
        workspaceRoot: cwd,
        applySafe: "h1",
        approvedPlanHash: "h2",
      }),
    ).toStrictEqual({ exitCode: 2 });
    expect(errors).toStrictEqual([
      `--apply-safe h1 and --approved-plan-hash h2 name different plans; give one hash. The current plan applies with: kibi migrate --apply-safe ${hash}`,
    ]);
    expect(s.category).toHaveBeenCalledWith(
      "migrate:approved_plan_hash_conflict",
    );
  });

  test("ask for the reviewed hash", async () => {
    const hash = await currentHash();
    errors = [];
    expect(
      await migrateCommand({ workspaceRoot: cwd, applySafe: true }),
    ).toStrictEqual({ exitCode: 2 });
    expect(errors).toStrictEqual([
      `--apply-safe needs the hash of the plan you reviewed. Review the plan with 'kibi migrate', then apply its current hash: kibi migrate --apply-safe ${hash}`,
    ]);
    expect(s.category).toHaveBeenCalledWith(
      "migrate:approved_plan_hash_missing",
    );
    expect(
      (await migrateCommand({ workspaceRoot: cwd, applySafe: "" })).exitCode,
    ).toBe(0);
  });

  test("refuse a changed plan", async () => {
    const hash = await currentHash();
    errors = [];
    expect(
      await migrateCommand({
        workspaceRoot: cwd,
        applySafe: true,
        approvedPlanHash: "old",
      }),
    ).toStrictEqual({ exitCode: 2 });
    expect(errors).toStrictEqual([
      `old is not the current migration plan; its hash is now ${hash}. Kibi has no record of printing old here, so it cannot say what changed. Nothing was applied.\nReview the current plan with 'kibi migrate', then apply it with: kibi migrate --apply-safe ${hash}`,
    ]);
    expect(s.category).toHaveBeenCalledWith("migrate:plan_hash_changed");
    expect(h.find).toHaveBeenCalledWith(cwd, "old");
  });

  test("explain what changed since a printed plan", () => {
    const plan = buildMigrationPlan({});
    h.find.mockReturnValue({ printedAt: "yesterday" } as never);
    expect(planChangedMessage(cwd, "old", plan)).toBe(
      [
        `The migration plan changed since old was printed (yesterday); its hash is now ${plan.planHash}. Nothing was applied.`,
        "Its actions and inputs are the same; only their details changed.",
        `Review the current plan with 'kibi migrate', then apply it with: kibi migrate --apply-safe ${plan.planHash}`,
      ].join("\n"),
    );
    h.change.mockReturnValue(["one", "two"]);
    expect(planChangedMessage(cwd, "old", plan)).toBe(
      [
        `The migration plan changed since old was printed (yesterday); its hash is now ${plan.planHash}. Nothing was applied.`,
        "What changed:",
        "- one",
        "- two",
        `Review the current plan with 'kibi migrate', then apply it with: kibi migrate --apply-safe ${plan.planHash}`,
      ].join("\n"),
    );
    expect(h.change).toHaveBeenCalledWith({ printedAt: "yesterday" }, plan);
    expect(applyPlanCommand("abc")).toBe("kibi migrate --apply-safe abc");
  });

  test("apply the ready automatic actions in table form", async () => {
    const hash = await currentHash();
    h.outputs.apply = {
      structuredContent: {
        outcome: "applied",
        actionResults: [
          { actionId: "a", outcome: "applied", detail: "done" },
          { actionId: "b", outcome: "skipped", detail: "nothing" },
        ],
        remainingPlan: {
          planHash: "next",
          status: "ready",
          summary: { actionCount: 3 },
          automaticSummary: { ready: 2 },
        },
      },
      content: [{ type: "text", text: "Applied 2." }],
    };
    logs = [];
    expect(
      await migrateCommand({ workspaceRoot: cwd, applySafe: hash }),
    ).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "Applied 2.",
      "Outcome: applied",
      "- applied a: done",
      "- skipped b: nothing",
      "Remaining plan next: ready; actions: 3; automatic-ready: 2",
      "Run 'kibi migrate' for the remaining actions, or add --format json for the full result.",
    ]);
    const [name, input] = h.calls.at(-1) as [string, Record<string, unknown>];
    expect(name).toBe("apply");
    expect(input.approvedPlanHash).toBe(hash);
    expect(input.approvedActionIds).toStrictEqual(["a", "b"]);
    expect((input.plan as { planHash: string }).planHash).toBe(hash);
    expect(s.category).not.toHaveBeenCalled();
  });

  test("apply only the approved ids from either spelling", async () => {
    const hash = await currentHash();
    await migrateCommand({
      workspaceRoot: cwd,
      applySafe: true,
      approvedPlanHash: hash,
      approvedActionIds: [" c ", "a", ""],
      approvedAction: ["a", "  "],
    });
    const [, input] = h.calls.at(-1) as [string, Record<string, unknown>];
    expect(input.approvedActionIds).toStrictEqual(["c", "a"]);
    await migrateCommand({
      workspaceRoot: cwd,
      applySafe: hash,
      approvedAction: ["b"],
    });
    expect(
      (h.calls.at(-1) as [string, Record<string, unknown>])[1]
        .approvedActionIds,
    ).toStrictEqual(["b"]);
    await migrateCommand({
      workspaceRoot: cwd,
      applySafe: hash,
      approvedPlanHash: hash,
      approvedActionIds: ["a"],
    });
    expect(
      (h.calls.at(-1) as [string, Record<string, unknown>])[1]
        .approvedActionIds,
    ).toStrictEqual(["a"]);
  });

  test("report nothing to apply", async () => {
    statusPlan([
      ready("c", { state: "blocked" }),
      ready("d", { autoApplicable: false }),
    ]);
    const hash = await currentHash();
    logs = [];
    expect(
      await migrateCommand({ workspaceRoot: cwd, applySafe: hash }),
    ).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "No approved automatic migration actions are ready.",
    ]);
    expect(h.calls.map(([name]) => name)).not.toContain("apply");
  });

  test("print a table result without text or summary", async () => {
    const hash = await currentHash();
    for (const structuredContent of [
      undefined,
      null,
      "text",
      {},
    ] as unknown[]) {
      h.outputs.apply = {
        structuredContent: structuredContent as never,
        content: [],
      };
      logs = [];
      expect(
        await migrateCommand({ workspaceRoot: cwd, applySafe: hash }),
      ).toStrictEqual({ exitCode: 1 });
      expect(logs).toStrictEqual(
        structuredContent !== null && typeof structuredContent === "object"
          ? [
              "Migration applied.",
              "Run 'kibi migrate' for the remaining actions, or add --format json for the full result.",
            ]
          : ["Migration applied."],
      );
    }
    expect(s.category).toHaveBeenCalledWith("migrate:undefined");
  });

  test("apply the whole plan as JSON with --yes", async () => {
    const hash = await currentHash();
    h.outputs.apply = {
      structuredContent: { outcome: "partial" },
      content: [],
    };
    const onStderr = spyOn(cliJsonCommand, "withConsoleOnStderr");
    logs = [];
    expect(
      await migrateCommand({
        workspaceRoot: cwd,
        format: "json",
        yes: true,
        approvedActionIds: ["a"],
      }),
    ).toStrictEqual({ exitCode: 1 });
    expect(JSON.parse(logs.join("\n"))).toStrictEqual(h.outputs.apply);
    expect(onStderr).toHaveBeenCalledTimes(1);
    const [, input] = h.calls.at(-1) as [string, Record<string, unknown>];
    expect(input.approvedPlanHash).toBe(hash);
    expect(input.approvedActionIds).toStrictEqual(["a", "b"]);
    expect(s.category).toHaveBeenCalledWith("migrate:partial");
    expect(h.record).not.toHaveBeenCalled();
  });

  test("only print with --yes and --dry-run, or with --yes in table form", async () => {
    await jsonPlan({ yes: true, dryRun: true });
    expect(h.calls.map(([name]) => name)).not.toContain("apply");
    await migrateCommand({ workspaceRoot: cwd, yes: true });
    expect(h.calls.map(([name]) => name)).not.toContain("apply");
  });

  test("apply with --apply-safe in JSON form", async () => {
    const hash = await currentHash();
    const onStderr = spyOn(cliJsonCommand, "withConsoleOnStderr");
    logs = [];
    expect(
      await migrateCommand({
        workspaceRoot: cwd,
        format: "json",
        applySafe: hash,
        dryRun: true,
      }),
    ).toStrictEqual({ exitCode: 0 });
    expect(onStderr).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logs.join("\n"))).toStrictEqual(h.outputs.apply);
  });

  test("resolve the plan workspace from the working directory", async () => {
    const spy = spyOn(process, "cwd").mockReturnValue(cwd);
    await migrateCommand({ format: "json", dryRun: true });
    spy.mockRestore();
    expect(h.createRuntime).toHaveBeenCalledWith({ workspaceRoot: cwd });
  });
});

describe("migration details", () => {
  const delivered = (id: string, status: string, to = "closed") => ({
    requirementId: id,
    path: `${id}.md`,
    status,
    automatic: { status: to, tag: "implemented" },
    extractionError: null,
    suggestedStatus: null,
  });
  const review = (
    id: string,
    status: string,
    extractionError: string | null,
  ) => ({
    requirementId: id,
    path: `${id}.md`,
    status,
    automatic: null,
    extractionError,
    suggestedStatus: null,
  });

  test("describe status groups and review items on a dry run", async () => {
    s.planStatuses.mockReturnValue([
      delivered("R1", "done"),
      delivered("R2", "shipped", "closed"),
      delivered("R3", "done"),
      review("R4", "weird", null),
      review("R5", "odd", null),
    ] as never);
    await dry();
    expect(logs).toStrictEqual([
      "dry run: would map legacy status done -> closed (tag implemented) on 2 requirement(s): R1, R3; legacy status shipped -> closed (tag implemented) on 1 requirement(s): R2.",
      "dry run: 2 requirement status(es) need a person to choose the current status: R4 (weird), R5 (odd); kibi migrate --format json lists them as req_status_vocabulary_map.",
    ]);
  });

  test("skip the status apply without delivered statuses and the line without mappings", async () => {
    s.planStatuses.mockReturnValue([review("R4", "weird", null)] as never);
    await yes();
    expect(s.applyStatuses).not.toHaveBeenCalled();
    expect(s.planStatuses).toHaveBeenCalledTimes(1);
    s.planStatuses.mockReturnValue([delivered("R1", "done")] as never);
    s.applyStatuses.mockReturnValue({ mapped: [], skipped: [] } as never);
    logs = [];
    await yes();
    expect(s.applyStatuses).toHaveBeenCalledTimes(1);
    expect(logs.some((line) => line.startsWith("Mapped"))).toBe(false);
  });

  test("count only undecided statuses as other work", async () => {
    s.planStatuses.mockReturnValue([review("R1", "x", "bad status")] as never);
    await yes();
    expect(logs[0]).toBe(
      "Migration incomplete: 1 requirement(s) are not compiled, so kb_query, kb_coverage and kb_upsert do not see them, and 0 other item(s) need a decision.",
    );
  });

  test("report a manual inventory or a lifecycle item alone", async () => {
    s.applyDrift.mockReturnValue({
      rederived: [],
      manual: [
        {
          requirementId: "R2",
          path: "r2.md",
          reasons: ["a"],
          rederivableByDroppingGrounding: false,
          orphanedGrounding: [],
        },
      ],
    } as never);
    await yes();
    expect(logs).toContain(
      "Run 'kibi migrate' for the remaining actions; rerun 'kibi migrate --yes' after fixing them.",
    );
    s.applyDrift.mockReturnValue({ rederived: [], manual: [] } as never);
    s.applyRepairs.mockReturnValue({
      rewritten: [],
      removed: [],
      skipped: [{ file: "f.md", reason: "r" }],
    } as never);
    logs = [];
    await yes();
    expect(logs).toContain(
      "  1 lifecycle item(s) need a person; see the warnings above.",
    );
  });

  test("join closed requirements, kept floors, tagged types and pinned tests", async () => {
    atVersion(0);
    s.applyClosures.mockReturnValue({
      closed: [{ id: "R1" }, { id: "R2" }],
      skipped: [],
    } as never);
    s.planTags.mockReturnValue({
      targets: [{ type: "req" }, { type: "adr" }],
      skipped: [],
    } as never);
    s.applyTags.mockReturnValue(2);
    s.applyClaims.mockReturnValue({
      targets: [{ id: "T1" }, { id: "T2" }],
      review: [],
      skipped: [],
    } as never);
    await yes();
    expect(logs).toContain("Closed 2 superseded requirement(s): R1, R2.");
    expect(logs).toContain(
      "Tagged 2 current entit(ies) without body context review:context-missing (1 adr, 1 req); no prose was written.",
    );
    expect(logs).toContain(
      "Pinned proof_contract.proves on 2 certificate test(s) (T1, T2); run kibi prove for them so their receipts bind the claim.",
    );
    expect(s.applyTypes).toHaveBeenCalledWith(cwd);
    expect(s.planTypes).not.toHaveBeenCalled();
    expect(s.applyDrift).toHaveBeenCalledWith(cwd);
    expect(s.findRepairs).not.toHaveBeenCalled();
    atVersion(0);
    s.planFloors.mockReturnValue({
      targets: [],
      kept: ["R1", "R2"],
      skipped: [],
      decidedBy: "receipt",
    } as never);
    logs = [];
    await dry();
    expect(logs).toContain(
      "dry run: 2 firm or approved requirement(s) keep the tested floor (R1, R2) because their latest end-to-end receipt passed; no synced store could be read, so other proof gaps were not judged. Run kibi sync and rerun the dry run for the ladder's verdict.",
    );
    expect(s.applyTypes).toHaveBeenCalledTimes(1);
    expect(s.applyDrift).toHaveBeenCalledTimes(1);
    expect(s.applyClosures).toHaveBeenCalledTimes(1);
    expect(s.applyStatuses).not.toHaveBeenCalled();
  });

  test("apply statuses during an upgrade", async () => {
    atVersion(LATEST - 1);
    s.planStatuses.mockReturnValue([delivered("R1", "done")] as never);
    await yes();
    expect(s.applyStatuses).toHaveBeenCalledWith(cwd);
  });

  test("keep a recorded not-applicable backfill through a full upgrade", async () => {
    atVersion(0);
    s.read.mockReturnValue({
      schemaVersion: 0,
      semanticAdvisorBackfill: "not_applicable",
    } as never);
    expect((await yes()).summary?.audit.semanticAdvisorBackfill).toBe(
      "not_applicable",
    );
  });

  test("ignore an absent legacy config's version and label missing state by legacy version", async () => {
    s.plan.mockReturnValue(
      storagePlan({ legacyConfig: "absent", schemaVersion: "4" }) as never,
    );
    atVersion(9);
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 9 to ${LATEST} in .kb/manifest.json.`,
    );
    s.status.mockReturnValue({ state: "missing" } as never);
    s.read.mockReturnValue(null as never);
    s.plan.mockReturnValue(
      storagePlan({ legacyConfig: "present", schemaVersion: "4" }) as never,
    );
    logs = [];
    await dry();
    expect(logs).toContain(
      `dry run: would set schemaVersion from 4 to ${LATEST} in .kb/manifest.json.`,
    );
  });

  test("migrate storage when only moves remain", async () => {
    s.plan.mockReturnValue(
      storagePlan({ moves: [{ from: "a", to: "b" }] }) as never,
    );
    await yes();
    expect(s.applyStorage).toHaveBeenCalledTimes(1);
  });

  test("preview only storage at the latest schema", async () => {
    s.tracked.mockReturnValue(true as never);
    s.plan.mockReturnValue(
      storagePlan({
        moves: [
          { from: "docs/a.md", to: ".kb/a.md" },
          { from: "docs/symbols.yaml", to: ".kb/symbols.yaml" },
        ],
      }) as never,
    );
    await dry();
    expect(s.tracked).not.toHaveBeenCalled();
    expect(s.planLinks).toHaveBeenCalledWith(cwd, "docs/symbols.yaml");
  });
});

describe("migration plan details", () => {
  beforeEach(() => {
    h = planHarness();
  });

  test("check a store that needs no migration at any recorded schema", async () => {
    checkable({ schemaStatus: { needsMigration: false, currentVersion: 3 } });
    await jsonPlan();
    expect(h.calls.map(([name]) => name)).toContain("check");
  });

  test("skip the check without a branch attachment and tolerate empty answers", async () => {
    checkable({ branchAttachment: undefined });
    await jsonPlan();
    expect(h.calls.map(([name]) => name)).toStrictEqual(["status"]);
    checkable();
    h.outputs.check = {};
    h.outputs.req = {};
    h.outputs.symbol = {};
    const { plan } = await jsonPlan();
    expect(ids(plan)).toStrictEqual([]);
  });

  test("say nothing about a skipped check on an uncheckable never-synced store", async () => {
    checkable({ snapshotId: "missing", branchStore: { state: "missing" } });
    const { plan } = await jsonPlan();
    expect(plan.diagnostics).toStrictEqual([]);
  });

  test("give every runtime the workspace root", async () => {
    statusPlan([ready("a")]);
    const hash = (await jsonPlan({ dryRun: true })).plan.planHash;
    await migrateCommand({ workspaceRoot: cwd, applySafe: hash });
    expect(h.createRuntime.mock.calls).toStrictEqual([
      [{ workspaceRoot: cwd }],
      [{ workspaceRoot: cwd }],
      [{ workspaceRoot: cwd }],
    ]);
  });

  test("keep apply progress on stdout in table form", async () => {
    statusPlan([ready("a")]);
    const hash = (await jsonPlan({ dryRun: true })).plan.planHash;
    h.execute.mockImplementation((async (_rt: unknown, spec: unknown) => {
      if (spec === applyPlanSpec) console.log("progress");
      return spec === applyPlanSpec ? h.outputs.apply : h.outputs.status;
    }) as never);
    logs = [];
    await migrateCommand({ workspaceRoot: cwd, applySafe: hash });
    expect(logs[0]).toBe("progress");
  });

  test("count ready automatic actions and sort the backlog by count, then code", async () => {
    statusPlan([
      ready("a"),
      ready("d"),
      ready("b", { state: "blocked" }),
      migrationAction({ id: "r1", code: "review_other" } as never),
      migrationAction({ id: "q3", code: "coverage_b" } as never),
      migrationAction({ id: "q4", code: "coverage_a" } as never),
      migrationAction({ id: "q1", code: "quality_x" } as never),
      migrationAction({ id: "q2", code: "quality_x" } as never),
    ]);
    logs = [];
    await migrateCommand({ workspaceRoot: cwd });
    expect(logs[1]).toBe("Migration: 3 action(s); automatic-ready: 2");
    expect(logs.slice(6, 10)).toStrictEqual([
      "  2 quality_x",
      "  1 coverage_a",
      "  1 coverage_b",
      "  1 review_other",
    ]);
  });
});
