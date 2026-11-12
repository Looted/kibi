import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  describeMigrationRun,
  migrateCommand,
} from "../../src/commands/migrate.js";
import * as evidenceFloor from "../../src/operations/migration/evidence-floor.js";
import * as firmSupersede from "../../src/operations/migration/firm-supersede.js";
import * as originBackfill from "../../src/operations/migration/origin-backfill.js";
import * as proofContractClaims from "../../src/operations/migration/proof-contract-claims.js";
import * as requirementStatus from "../../src/operations/migration/requirement-status.js";
import * as schema6 from "../../src/operations/migration/schema6.js";
import * as sourcePaths from "../../src/operations/migration/source-paths.js";
import * as supersededClosure from "../../src/operations/migration/superseded-closure.js";
import * as coordinatesRefresh from "../../src/operations/migration/symbol-coordinates-refresh.js";
import * as legacyLinks from "../../src/operations/migration/symbol-legacy-links.js";
import * as untrackCoordinates from "../../src/operations/migration/untrack-symbol-coordinates.js";
import {
  buildMigrationPlan,
  migrationAction,
} from "../../src/public/operations/migration-plan.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  mock.restore();
  for (const restore of restores.splice(0).reverse()) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function workspace(schemaVersion: number): string {
  restores.push(isolateKibiEnv());
  const cwd = createGitWorkspace();
  roots.push(cwd);
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion,
      semanticAdvisorBackfill: "not_applicable",
    }),
  );
  return cwd;
}

function capture(): () => string {
  const io = captureIo();
  restores.push(io.restore);
  return () => [...io.logs, ...io.errors, ...io.warns].join("\n");
}

type Finding = requirementStatus.RequirementStatusFinding;

function finding(
  requirementId: string,
  status: string,
  extra: Partial<Record<keyof Finding, unknown>> = {},
): Finding {
  return {
    requirementId,
    path: `.kb/requirements/${requirementId}.md`,
    status,
    automatic: null,
    suggestedStatus: null,
    extractionError: null,
    ...extra,
  } as unknown as Finding;
}

const delivered = [
  finding("REQ-a", "implemented", {
    automatic: { status: "closed", tag: "implemented" },
  }),
  finding("REQ-b", "implemented", {
    automatic: { status: "closed", tag: "implemented" },
  }),
  finding("REQ-c", "done", { automatic: {} }),
];
const review = [
  finding("REQ-x", "wontfix", { extractionError: "unknown status" }),
  finding("REQ-y", "draft"),
  finding("REQ-z", "todo", { suggestedStatus: "open" }),
];

function stubLifecycle(): void {
  spyOn(supersededClosure, "planSupersededClosures").mockReturnValue({
    closures: [{ id: "REQ-old" }],
    cycles: [{ members: ["REQ-p", "REQ-q"] }],
  } as never);
  spyOn(supersededClosure, "applySupersededClosures").mockReturnValue({
    closed: [{ id: "REQ-old" }],
    skipped: [{ path: ".kb/requirements/REQ-s.md", reason: "no front matter" }],
  } as never);
  spyOn(sourcePaths, "findSourceRepairs").mockReturnValue([
    { file: ".kb/a.md", refused: "value is a list" },
    { file: ".kb/b.md", fix: { kind: "rewrite" } },
    { file: ".kb/c.md", fix: { kind: "remove" } },
  ] as never);
  spyOn(sourcePaths, "applySourcePathRepairs").mockReturnValue({
    rewritten: [{ file: ".kb/b.md" }],
    removed: [{ file: ".kb/c.md" }],
    skipped: [{ file: ".kb/a.md", reason: "value is a list" }],
  } as never);
  spyOn(legacyLinks, "planSymbolLegacyLinks").mockReturnValue({
    targets: [{ id: "SYM-1" }],
  } as never);
  spyOn(legacyLinks, "applySymbolLegacyLinks").mockReturnValue({
    marked: ["SYM-1"],
    unmarked: ["SYM-2", "SYM-3"],
  } as never);
  spyOn(
    coordinatesRefresh,
    "refreshCoordinatesAfterMigration",
  ).mockResolvedValue({ outcome: "failed", reason: "engine down" });
}

describe("migrate at the latest schema", () => {
  test("applies status mappings and lifecycle repairs and lists what remains", async () => {
    const cwd = workspace(LATEST_KB_SCHEMA_VERSION);
    stubLifecycle();
    const plan = spyOn(requirementStatus, "planRequirementStatusMappings");
    plan.mockReturnValueOnce([...delivered, ...review]);
    plan.mockReturnValueOnce(review);
    spyOn(requirementStatus, "applyDeliveredStatusMappings").mockReturnValue({
      mapped: delivered,
      skipped: [{ path: ".kb/requirements/REQ-d.md", reason: "read-only" }],
    } as never);
    const output = capture();

    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });

    expect(result.exitCode).toBe(0);
    const text = output();
    expect(text).toContain(
      "Mapped legacy status implemented -> closed (tag implemented) on 2 requirement(s): REQ-a, REQ-b; legacy status done -> closed (tag implemented) on 1 requirement(s): REQ-c.",
    );
    expect(text).toContain(
      "Status not mapped for .kb/requirements/REQ-d.md: read-only.",
    );
    expect(text).toContain("Closed 1 superseded requirement(s): REQ-old.");
    expect(text).toContain(
      "Status not set for .kb/requirements/REQ-s.md: no front matter.",
    );
    expect(text).toContain(
      "Pointed 1 pre-canonical source or text_ref path(s) at their .kb/ files.",
    );
    expect(text).toContain(
      "Removed 1 redundant or dead source field(s); the compiled source is always the entity's own file.",
    );
    expect(text).toContain(
      "Requirements REQ-p, REQ-q supersede each other; decide which one is current, remove the supersedes link that points at it, and close the others.",
    );
    expect(text).toContain(
      "Path field of .kb/a.md not repaired: value is a list; a person edits it by hand (kibi migrate --format json lists it as review_source_path_dangling).",
    );
    expect(text).toContain(
      "Marked 1 existing coarse symbol link(s) as legacy-link.",
    );
    expect(text).toContain(
      "Could not mark SYM-2, SYM-3 as legacy-link in place; add granularity_reason: legacy-link to them in .kb/symbols.yaml by hand.",
    );
    expect(text).toContain("engine down");
    expect(text).toContain(
      "Migration incomplete: 1 requirement(s) are not compiled, so kb_query, kb_coverage and kb_upsert do not see them, and 4 other item(s) need a decision.",
    );
    expect(text).toContain(
      "  REQ-x (.kb/requirements/REQ-x.md): status wontfix is not a status Kibi knows, so kibi sync cannot compile it (unknown status). Set status to open, in_progress, closed or retired in the file (closed with the tag implemented for delivered work), then run kibi sync.",
    );
    expect(text).toContain(
      "  REQ-y (.kb/requirements/REQ-y.md): status draft is not a requirement status, so the proof ladder skips it. Set status to open, in_progress, closed or retired in the file.",
    );
    expect(text).toContain(
      "  REQ-z (.kb/requirements/REQ-z.md): status todo is not a requirement status, so the proof ladder skips it. Approve req-status-vocabulary-map-REQ-z (todo -> open) with kibi migrate --apply-safe, or set the status in the file.",
    );
    expect(text).toContain(
      "  2 lifecycle item(s) need a person; see the warnings above.",
    );
    expect(text).toContain(
      "Run 'kibi migrate' for the remaining actions; rerun 'kibi migrate --yes' after fixing them.",
    );
  });

  test("reports the manual inventory count among the uncompiled requirements", async () => {
    const cwd = workspace(LATEST_KB_SCHEMA_VERSION);
    spyOn(requirementStatus, "planRequirementStatusMappings").mockReturnValue(
      [],
    );
    const inventory = await import(
      "../../src/operations/migration/inventory-rederive.js"
    );
    spyOn(inventory, "planInventoryRederivation").mockReturnValue([]);
    spyOn(inventory, "applySafeInventoryRederivations").mockReturnValue({
      rederived: [],
      manual: [
        {
          requirementId: "REQ-m",
          path: ".kb/requirements/REQ-m.md",
          reasons: ["claim text changed"],
          rederivableByDroppingGrounding: false,
          orphanedGrounding: [],
        },
      ],
    } as never);
    const output = capture();

    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });

    expect(result.exitCode).toBe(0);
    const text = output();
    expect(text).toContain(
      "Migration incomplete: 1 requirement(s) are not compiled, so kb_query, kb_coverage and kb_upsert do not see them, and 0 other item(s) need a decision.",
    );
    expect(text).toContain(
      "  1 requirement inventory(ies) need the manual fix in the warnings above; kibi sync rejects them until then.",
    );
  });

  test("a dry run previews the same repairs without applying them", async () => {
    const cwd = workspace(LATEST_KB_SCHEMA_VERSION);
    stubLifecycle();
    spyOn(requirementStatus, "planRequirementStatusMappings").mockReturnValue([
      ...delivered,
      ...review,
    ]);
    const apply = spyOn(requirementStatus, "applyDeliveredStatusMappings");
    const output = capture();

    const result = await migrateCommand({ dryRun: true, workspaceRoot: cwd });

    expect(result.exitCode).toBe(0);
    expect(apply).not.toHaveBeenCalled();
    const text = output();
    expect(text).toContain(
      "dry run: would map legacy status implemented -> closed (tag implemented) on 2 requirement(s): REQ-a, REQ-b; legacy status done -> closed (tag implemented) on 1 requirement(s): REQ-c.",
    );
    expect(text).toContain(
      "dry run: 3 requirement status(es) need a person to choose the current status: REQ-x (wontfix), REQ-y (draft), REQ-z (todo); kibi migrate --format json lists them as req_status_vocabulary_map.",
    );
    expect(text).toContain(
      "dry run: would close 1 superseded requirement(s): REQ-old.",
    );
    expect(text).toContain(
      "dry run: would point 1 pre-canonical source or text_ref path(s) at their .kb/ files.",
    );
    expect(text).toContain(
      "dry run: would remove 1 redundant or dead source field(s); the compiled source is always the entity's own file.",
    );
    expect(text).toContain(
      "Path field of .kb/a.md not repaired: value is a list;",
    );
    expect(text).not.toContain("Migration incomplete");
  });
});

function stubSchemaSteps(decidedBy: "ladder" | "authored"): void {
  spyOn(evidenceFloor, "readLadderFloorVerdicts").mockResolvedValue(null);
  spyOn(evidenceFloor, "planEvidenceFloorPins").mockReturnValue({
    targets: [],
    skipped: [{ path: ".kb/requirements/REQ-f.md", reason: "bad yaml" }],
    kept: ["REQ-k1", "REQ-k2"],
    decidedBy,
  } as never);
  spyOn(evidenceFloor, "applyEvidenceFloorPins").mockReturnValue(0);
  spyOn(
    proofContractClaims,
    "readProofContractClaimCandidates",
  ).mockResolvedValue([]);
  const claims = {
    targets: [{ id: "TEST-1", path: ".kb/tests/TEST-1.md" }],
    review: [],
    skipped: [],
  };
  spyOn(proofContractClaims, "planProofContractClaimPins").mockReturnValue(
    claims as never,
  );
  spyOn(proofContractClaims, "applyProofContractClaimPins").mockReturnValue(
    claims as never,
  );
  spyOn(firmSupersede, "planFirmSupersedeAcknowledgement").mockReturnValue([
    "ADR-new->ADR-old",
  ]);
  spyOn(untrackCoordinates, "isCoordinateArtifactTracked").mockReturnValue(
    true,
  );
}

describe("migrate from an older schema", () => {
  test("a dry run names the firm supersedes, kept floors, claim pins and coordinate untracking", async () => {
    const cwd = workspace(7);
    stubSchemaSteps("ladder");
    const output = capture();

    const result = await migrateCommand({ dryRun: true, workspaceRoot: cwd });

    expect(result.exitCode).toBe(0);
    const text = output();
    expect(text).toContain(
      "dry run: would acknowledge 1 supersede(s) of decisions that read as firm from schema 10 (manifest only; no firmness is written).",
    );
    expect(text).toContain(
      "dry run: 2 firm requirement(s) keep the tested floor (REQ-k1, REQ-k2); the evidence ladder on the synced store accepts each, or needs only kibi prove re-run.",
    );
    expect(text).toContain("Cannot edit .kb/requirements/REQ-f.md: bad yaml.");
    expect(text).toContain(
      "dry run: would pin proof_contract.proves on 1 certificate test(s) whose test reaches exactly one provable claim (TEST-1); front matter only.",
    );
    expect(text).toContain(
      "dry run: would remove .kb/symbol-coordinates.yaml from the Git index and gitignore it; sync derives symbol coordinates from schema 13.",
    );
  });

  test("a dry run without a synced store says the kept floors rest on receipts", async () => {
    const cwd = workspace(7);
    stubSchemaSteps("authored");
    const output = capture();

    await migrateCommand({ dryRun: true, workspaceRoot: cwd });

    expect(output()).toContain(
      "dry run: 2 firm requirement(s) keep the tested floor (REQ-k1, REQ-k2) because their latest end-to-end receipt passed; no synced store could be read, so other proof gaps were not judged. Run kibi sync and rerun the dry run for the ladder's verdict.",
    );
  });

  test("applying records firm supersedes, kept floors, claim pins and untracks the coordinates", async () => {
    const cwd = workspace(5);
    stubSchemaSteps("ladder");
    spyOn(originBackfill, "applyOriginBackfill").mockReturnValue({
      written: [],
      skipped: [{ path: ".kb/adr/ADR-1.md", reason: "no front matter" }],
      previouslyStamped: 0,
    });
    spyOn(untrackCoordinates, "untrackCoordinateArtifact").mockReturnValue({
      outcome: "untracked",
    });
    const output = capture();

    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });

    expect(result.exitCode).toBe(0);
    const manifest = JSON.parse(
      readFileSync(path.join(cwd, ".kb", "manifest.json"), "utf8"),
    );
    expect(manifest.firmSupersedeAcknowledged).toStrictEqual([
      "ADR-new->ADR-old",
    ]);
    const text = output();
    expect(text).toContain(
      "Acknowledged 1 supersede(s) of decisions without firmness that read as firm from schema 10; a new replacement of such a decision must be firm.",
    );
    expect(text).toContain(
      "2 firm requirement(s) keep the tested floor; the evidence ladder accepts each, or needs only kibi prove re-run (kibi check --fresh-evidence lists those).",
    );
    expect(text).toContain(
      "Cannot record required_evidence on .kb/requirements/REQ-f.md: bad yaml.",
    );
    expect(text).toContain(
      "Pinned proof_contract.proves on 1 certificate test(s) (TEST-1); run kibi prove for them so their receipts bind the claim.",
    );
    expect(text).toContain(
      "Origin not recorded for .kb/adr/ADR-1.md: no front matter.",
    );
    expect(text).toContain(
      "Removed .kb/symbol-coordinates.yaml from the Git index (the local file stays); commit the removal with the migration. Sync derives symbol coordinates from now on.",
    );
    expect(result.summary).toBeDefined();
    if (result.summary === undefined) return;
    expect(describeMigrationRun(result.summary)).toBe(
      `Migrated schema 5 -> ${LATEST_KB_SCHEMA_VERSION} (audit .kb/migrations/main.json): legacy-link marks 0, origin backfill 0, superseded requirements closed 0, source paths rewritten 0, source paths removed 0, legacy statuses mapped 0; .gitignore ${result.summary.gitignoreUpdated ? "updated" : "unchanged"}.`,
    );
  });

  test("applying without a synced store points at kibi sync for the kept floors, and warns when untracking fails", async () => {
    const cwd = workspace(7);
    stubSchemaSteps("authored");
    spyOn(untrackCoordinates, "untrackCoordinateArtifact").mockReturnValue({
      outcome: "failed",
      reason: "index locked",
    });
    const output = capture();

    await migrateCommand({ yes: true, workspaceRoot: cwd });

    const text = output();
    expect(text).toContain(
      "2 firm requirement(s) keep the tested floor because their latest end-to-end receipt passed; no synced store could be read, so run kibi sync and kibi check --rules evidence-floor to list any whose proof has other gaps (kibi proof explain <id> names them).",
    );
    expect(text).toContain(
      "Could not remove .kb/symbol-coordinates.yaml from the Git index (index locked); run git rm --cached .kb/symbol-coordinates.yaml before the next commit.",
    );
  });
});

const cliInvocation = (argv: string[]) => ({
  kind: "cli" as const,
  command_argv: argv,
});

function statusPlan() {
  return buildMigrationPlan({
    evaluatedDomains: ["schema", "branch"],
    actions: [
      migrationAction({
        id: "schema-config-upgrade",
        code: "schema_upgrade",
        category: "schema",
        state: "ready",
        safety: "automatic",
        autoApplicable: true,
        invocation: cliInvocation(["kibi", "migrate", "--yes"]),
      }),
      migrationAction({
        id: "branch-store-compile",
        code: "branch_store_compile",
        category: "branch",
        state: "ready",
        safety: "automatic",
        autoApplicable: true,
        invocation: cliInvocation(["kibi", "sync"]),
      }),
      migrationAction({
        id: "quality-one",
        code: "quality_missing_title",
        category: "quality",
        state: "ready",
        safety: "review",
        autoApplicable: false,
        invocation: cliInvocation(["kibi", "check"]),
      }),
      migrationAction({
        id: "quality-two",
        code: "quality_missing_title",
        category: "quality",
        state: "ready",
        safety: "review",
        autoApplicable: false,
        invocation: cliInvocation(["kibi", "check"]),
      }),
      migrationAction({
        id: "coverage-one",
        code: "coverage_untested",
        category: "quality",
        state: "ready",
        safety: "review",
        autoApplicable: false,
        invocation: cliInvocation(["kibi", "coverage"]),
      }),
    ],
  });
}

function stubPlanInputs(fragmentCode: string): void {
  spyOn(runtimeTypes, "executeOperation").mockResolvedValue({
    content: [],
    structuredContent: {
      migrationPlan: statusPlan(),
      branchStore: { state: "missing" },
      schemaStatus: { needsMigration: true, currentVersion: 12 },
      branchAttachment: { kind: "exact" },
    },
  } as never);
  spyOn(schema6, "buildSchema6MigrationFragment").mockReturnValue({
    actions: [
      migrationAction({
        id: "source-rewrite",
        code: fragmentCode,
        category: "schema",
        state: "ready",
        safety:
          fragmentCode === "semantic_inventory_review" ? "review" : "automatic",
        autoApplicable: fragmentCode !== "semantic_inventory_review",
        invocation: cliInvocation(["kibi", "migrate", "--yes"]),
      }),
    ],
    sourceRewriteActionIds: ["source-rewrite"],
    diagnostics: [],
  } as never);
}

describe("migrate plan text", () => {
  test("orders the store sync after source rewrites and counts the backlog by code", async () => {
    const cwd = workspace(12);
    stubPlanInputs("polarity_value_backfill");
    const output = capture();

    const result = await migrateCommand({ workspaceRoot: cwd });

    expect(result.exitCode).toBe(0);
    const text = output();
    expect(text).toContain(
      "Quality backlog (not part of the migration): 3 review item(s) that kibi check and kb_status also report.",
    );
    expect(text).toContain(
      "  2 quality_missing_title\n  1 coverage_untested\n  List each item with --backlog.",
    );
    expect(text).toMatch(
      /- ready automatic branch_store_compile: branch-store-compile/,
    );
  });

  test("blocks the store sync on an inventory review and lists the backlog with --backlog", async () => {
    const cwd = workspace(12);
    stubPlanInputs("semantic_inventory_review");
    const output = capture();

    const result = await migrateCommand({ workspaceRoot: cwd, backlog: true });

    expect(result.exitCode).toBe(0);
    const text = output();
    expect(text).toContain(
      "- blocked automatic branch_store_compile: branch-store-compile",
    );
    expect(text).toContain(
      "- ready review coverage_untested: coverage-one\n- ready review quality_missing_title: quality-one\n- ready review quality_missing_title: quality-two",
    );
  });
});
