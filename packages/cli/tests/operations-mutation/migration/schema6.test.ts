import { type Mock, afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as sync from "../../../src/commands/sync.js";
import * as bodyContext from "../../../src/operations/migration/entity-body-context.js";
import * as entityType from "../../../src/operations/migration/entity-type.js";
import * as evidenceFloor from "../../../src/operations/migration/evidence-floor.js";
import * as firmSupersede from "../../../src/operations/migration/firm-supersede.js";
import * as inventory from "../../../src/operations/migration/inventory-rederive.js";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import * as originBackfill from "../../../src/operations/migration/origin-backfill.js";
import * as polarity from "../../../src/operations/migration/polarity-values.js";
import * as proofClaims from "../../../src/operations/migration/proof-contract-claims.js";
import * as requirementStatus from "../../../src/operations/migration/requirement-status.js";
import {
  BODY_CONTEXT_SCHEMA_VERSION,
  DECISION_FIRMNESS_SCHEMA_VERSION,
  ORIGIN_SCHEMA_VERSION,
  SCHEMA6_APPROVABLE_REVIEW_CODES,
  SCHEMA6_AUTOMATIC_CODES,
  applySchema6MigrationAction,
  buildSchema6MigrationFragment,
  migrationSyncAction,
  requirementStatusActions,
  unapprovedExceptionsFromSources,
} from "../../../src/operations/migration/schema6.js";
import * as sourcePaths from "../../../src/operations/migration/source-paths.js";
import * as supersededClosure from "../../../src/operations/migration/superseded-closure.js";
import * as supersedesReason from "../../../src/operations/migration/supersedes-reason.js";
import * as coordinates from "../../../src/operations/migration/symbol-coordinates-refresh.js";
import * as symbolLinks from "../../../src/operations/migration/symbol-legacy-links.js";
import type { MigrationAction } from "../../../src/public/operations/migration-plan.js";
import * as shards from "../../../src/relationships/shards.js";
import {
  EMPTY,
  FULL,
  SCENARIOS,
  type Stubs,
  planScenario,
  stubPlanners,
} from "./schema6.corpus.js";

const spies: { mockRestore: () => void }[] = [];
function track<T extends { mockRestore: () => void }>(spy: T): T {
  spies.push(spy);
  return spy;
}
afterEach(() => {
  for (const spy of spies.splice(0).reverse()) spy.mockRestore();
});

const GOLDEN = JSON.parse(
  readFileSync(path.join(import.meta.dir, "schema6.golden.json"), "utf8"),
) as Record<string, unknown>;

type Fragment = {
  actions: MigrationAction[];
  sourceRewriteActionIds: string[];
  diagnostics: string[];
};
const fragment = (
  stubs: Stubs,
  currentSchemaVersion: number | null = null,
  extra: Record<string, unknown> = {},
) => planScenario({ stubs, currentSchemaVersion, ...extra }) as Fragment;
const ids = (result: Fragment) => result.actions.map((action) => action.id);

describe("planning the source-derived migration actions", () => {
  test("pins one plan per scenario", () => {
    expect(Object.keys(GOLDEN)).toEqual(Object.keys(SCENARIOS));
  });

  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    test(name, () => {
      expect(planScenario(scenario)).toEqual(GOLDEN[name]);
    });
  }

  test("plans each schema step only below the version that introduced it", () => {
    const VERSION_INDEPENDENT =
      /^(polarity-value-backfill|entity-type-backfill|req-status|semantic-inventory|close-superseded|review-(supersession|text-ref|source-path)|source-path-rewrite|symbol-legacy-link)/;
    for (const [version, expected, note] of [
      [
        4,
        [
          "semantic-text-pin",
          "context-missing-tag",
          "supersedes-reason-acknowledge",
          "firm-supersede-acknowledge",
          "evidence-floor-pin",
          "proof-contract-claims-pin",
          "proof-contract-claims-review-TEST-R1",
          "entity-origin-backfill",
          "review-exception-unapproved-REQ-EX1",
          "review-exception-unapproved-REQ-EX2",
          "review-exception-unapproved-REQ-EX5",
        ],
        "Knowledge the schema upgrade moves into .kb/ is stamped when it moves.",
      ],
      [
        5,
        [
          "semantic-text-pin",
          "context-missing-tag",
          "supersedes-reason-acknowledge",
          "firm-supersede-acknowledge",
          "evidence-floor-pin",
          "proof-contract-claims-pin",
          "proof-contract-claims-review-TEST-R1",
          "entity-origin-backfill",
          "review-exception-unapproved-REQ-EX1",
          "review-exception-unapproved-REQ-EX2",
          "review-exception-unapproved-REQ-EX5",
        ],
        null,
      ],
      [
        6,
        [
          "semantic-text-pin",
          "context-missing-tag",
          "supersedes-reason-acknowledge",
          "firm-supersede-acknowledge",
          "evidence-floor-pin",
          "proof-contract-claims-pin",
          "proof-contract-claims-review-TEST-R1",
        ],
        undefined,
      ],
      [
        7,
        [
          "semantic-text-pin",
          "context-missing-tag",
          "supersedes-reason-acknowledge",
          "firm-supersede-acknowledge",
          "evidence-floor-pin",
          "proof-contract-claims-pin",
          "proof-contract-claims-review-TEST-R1",
        ],
        undefined,
      ],
      [
        8,
        [
          "supersedes-reason-acknowledge",
          "firm-supersede-acknowledge",
          "evidence-floor-pin",
          "proof-contract-claims-pin",
          "proof-contract-claims-review-TEST-R1",
        ],
        undefined,
      ],
      [
        9,
        [
          "firm-supersede-acknowledge",
          "evidence-floor-pin",
          "proof-contract-claims-pin",
          "proof-contract-claims-review-TEST-R1",
        ],
        undefined,
      ],
      [
        10,
        [
          "evidence-floor-pin",
          "proof-contract-claims-pin",
          "proof-contract-claims-review-TEST-R1",
        ],
        undefined,
      ],
      [
        11,
        ["proof-contract-claims-pin", "proof-contract-claims-review-TEST-R1"],
        undefined,
      ],
      [12, [], undefined],
      [13, [], undefined],
    ] as const) {
      const result = fragment(FULL, version, { claimCandidates: [{}] });
      expect([
        version,
        ids(result).filter((id) => !VERSION_INDEPENDENT.test(id)),
      ]).toEqual([version, [...expected]]);
      const origin = result.actions.find(
        (action) => action.id === "entity-origin-backfill",
      );
      expect([version, origin && (origin.evidence.note ?? null)]).toEqual([
        version,
        note,
      ]);
    }
    expect([
      ORIGIN_SCHEMA_VERSION,
      BODY_CONTEXT_SCHEMA_VERSION,
      DECISION_FIRMNESS_SCHEMA_VERSION,
    ]).toEqual([6, 8, 9]);
  });

  test("plans claim pins only when claim candidates were read", () => {
    for (const claimCandidates of [undefined, null]) {
      expect(
        ids(fragment(FULL, null, { claimCandidates })).filter((id) =>
          id.startsWith("proof-contract"),
        ),
      ).toEqual([]);
    }
  });

  test("plans no claim pin when no contract has one provable claim", () => {
    const claims = {
      targets: [],
      skipped: [{ id: "T", path: "p", reason: "r" }],
      review: [],
    };
    expect(
      ids(fragment({ ...FULL, claims }, null, { claimCandidates: [] })).filter(
        (id) => id.startsWith("proof-contract"),
      ),
    ).toEqual([]);
  });

  test("removes source values when no path needs rewriting", () => {
    const repairs = [
      {
        entityId: "REQ-R8",
        field: "source",
        value: "gone.md",
        file: ".kb/requirements/REQ-R8.md",
        dangling: true,
        fix: { kind: "remove", reason: "dangling" },
      },
    ];
    expect(ids(fragment({ ...EMPTY, repairs }, 13))).toEqual([
      "source-path-rewrite",
    ]);
  });

  test("rewrites source paths when no value needs removing", () => {
    const repairs = [
      {
        entityId: "REQ-R9",
        field: "source",
        value: "old.md",
        file: ".kb/requirements/REQ-R9.md",
        dangling: true,
        fix: { kind: "rewrite", to: "new.md" },
      },
    ];
    const result = fragment({ ...EMPTY, repairs }, 13);
    expect(ids(result)).toEqual(["source-path-rewrite"]);
    expect(result.sourceRewriteActionIds).toEqual(["source-path-rewrite"]);
  });

  test("asks each planner about the workspace with the evidence it was given", () => {
    const floors = new Map([["REQ-1", "below"]]);
    const candidates = [{ test_id: "TEST-1" }];
    spies.push(...stubPlanners(FULL));
    buildSchema6MigrationFragment({
      workspaceRoot: "/workspace",
      currentSchemaVersion: null,
      ladderFloors: floors as never,
      claimCandidates: candidates as never,
    });
    expect(evidenceFloor.planEvidenceFloorPins).toHaveBeenCalledWith(
      "/workspace",
      floors,
    );
    expect(proofClaims.planProofContractClaimPins).toHaveBeenCalledWith(
      "/workspace",
      candidates,
    );
    for (const planner of [
      polarity.planPolarityValueBackfill,
      entityType.planEntityTypeBackfill,
      bodyContext.planSemanticTextPins,
      bodyContext.planContextMissingTags,
      supersedesReason.planSupersedesReasonAcknowledgement,
      firmSupersede.planFirmSupersedeAcknowledgement,
      inventory.planInventoryRederivation,
      requirementStatus.planRequirementStatusMappings,
      originBackfill.planOriginBackfill,
      supersededClosure.planSupersededClosures,
      sourcePaths.findSourceRepairs,
      symbolLinks.planSymbolLegacyLinks,
    ])
      expect(planner).toHaveBeenCalledWith("/workspace");
  });

  test("tags missing context without waiting for pins that are not planned", () => {
    const result = fragment({ ...EMPTY, tags: FULL.tags });
    expect(ids(result)).toEqual(["context-missing-tag"]);
    expect(result.actions[0]?.dependsOn).toEqual([]);
  });

  test("reports no manual inventory fix when every drift is safe", () => {
    const result = fragment({ ...EMPTY, drift: FULL.drift.slice(0, 1) });
    expect(result.diagnostics).toEqual([]);
    expect(result.sourceRewriteActionIds).toEqual([
      "semantic-inventory-rederive-REQ-SAFE",
    ]);
  });

  test("leaves the delivered-status rewrite out when no status is delivery vocabulary", () => {
    const result = fragment({ ...EMPTY, statuses: FULL.statuses.slice(2) });
    expect(ids(result)).not.toContain("req-status-delivered-map");
    expect(result.sourceRewriteActionIds).toEqual([]);
  });
});

describe("requirements whose status is outside the vocabulary", () => {
  test("plans only review actions without delivery vocabulary", () => {
    spies.push(...stubPlanners({ ...EMPTY, statuses: FULL.statuses.slice(5) }));
    expect(requirementStatusActions("/workspace").map(({ id }) => id)).toEqual([
      "req-status-vocabulary-map-REQ-M4",
      "req-status-vocabulary-map-REQ-M5",
      "req-status-vocabulary-map-REQ-M6",
      "req-status-vocabulary-map-REQ-M7",
    ]);
  });
});

describe("exceptions that nobody approved", () => {
  test("lists current unapproved exceptions read from sources, even without shards", () => {
    spies.push(
      ...stubPlanners({ ...FULL, shardRelationships: new Error("bad shard") }),
    );
    expect(unapprovedExceptionsFromSources("/workspace")).toEqual([
      {
        exceptionId: "REQ-EX1",
        exempts: ["REQ-BASE-A", "REQ-BASE-B"],
        source: ".kb/requirements/REQ-EX1.md",
      },
      {
        exceptionId: "REQ-EX2",
        exempts: ["REQ-BASE-A"],
        source: ".kb/requirements/REQ-EX2.md",
      },
    ]);
  });
});

describe("exceptions read from requirement sources and shards", () => {
  test("keeps current, unsuperseded, known exceptions in id order", () => {
    const requirement = (status: string) => ({ status });
    const requirements = Object.fromEntries(
      Object.entries({
        "REQ-B-OPEN": "open",
        "REQ-A-PROGRESS": "in_progress",
        "REQ-C-ACTIVE": "active",
        "REQ-D-CLOSED": "closed",
        "REQ-E-APPROVED": "approved",
        "REQ-F-SUPERSEDED": "open",
        "REQ-G-DEPRECATED": "deprecated",
      }).map(([id, status]) => [id, { id, ...requirement(status) }]),
    );
    const exempts = (from: string, to = "REQ-BASE") => ({
      type: "exempts",
      from,
      to,
    });
    spies.push(
      ...stubPlanners({
        ...EMPTY,
        requirements,
        relationships: [
          exempts("REQ-B-OPEN", "REQ-BASE-2"),
          exempts("REQ-B-OPEN", "REQ-BASE-1"),
          exempts("REQ-A-PROGRESS"),
          exempts("REQ-G-DEPRECATED"),
        ],
        shardRelationships: [
          exempts("REQ-C-ACTIVE"),
          exempts("REQ-E-APPROVED"),
          exempts("REQ-D-CLOSED"),
          exempts("REQ-F-SUPERSEDED"),
          exempts("REQ-UNKNOWN"),
          { type: "supersedes", from: "REQ-NEW", to: "REQ-F-SUPERSEDED" },
          { type: "relates_to", from: "REQ-NEW", to: "REQ-E-APPROVED" },
        ],
      }),
    );
    const source = (id: string) => `.kb/requirements/${id}.md`;
    expect(unapprovedExceptionsFromSources("/workspace")).toEqual([
      {
        exceptionId: "REQ-A-PROGRESS",
        exempts: ["REQ-BASE"],
        source: source("REQ-A-PROGRESS"),
      },
      {
        exceptionId: "REQ-B-OPEN",
        exempts: ["REQ-BASE-1", "REQ-BASE-2"],
        source: source("REQ-B-OPEN"),
      },
      {
        exceptionId: "REQ-C-ACTIVE",
        exempts: ["REQ-BASE"],
        source: source("REQ-C-ACTIVE"),
      },
      {
        exceptionId: "REQ-D-CLOSED",
        exempts: ["REQ-BASE"],
        source: source("REQ-D-CLOSED"),
      },
      {
        exceptionId: "REQ-E-APPROVED",
        exempts: ["REQ-BASE"],
        source: source("REQ-E-APPROVED"),
      },
    ]);
    expect(kbSources.listLaneMarkdownFiles).toHaveBeenCalledWith("/workspace", [
      "requirements",
    ]);
    expect(shards.readAllShards).toHaveBeenCalledWith(
      path.join("/workspace", ".kb"),
    );
  });
});

describe("the migration sync action", () => {
  test("waits on the actions it names", () => {
    expect(migrationSyncAction(["a", "b"])).toMatchObject({
      id: "migration-sync",
      dependsOn: ["a", "b"],
    });
  });
});

describe("the schema 6 action codes", () => {
  test("lists the codes Kibi applies on its own and the ones a person approves", () => {
    expect([...SCHEMA6_AUTOMATIC_CODES]).toEqual([
      "polarity_value_backfill",
      "entity_type_backfill",
      "semantic_text_pin",
      "context_missing_tag",
      "supersedes_reason_acknowledge",
      "firm_supersede_acknowledge",
      "evidence_floor_pin",
      "semantic_inventory_rederive",
      "req_status_delivered_map",
      "entity_origin_backfill",
      "close_superseded_requirements",
      "source_path_rewrite",
      "symbol_legacy_link_mark",
      "migration_sync",
    ]);
    expect([...SCHEMA6_APPROVABLE_REVIEW_CODES]).toEqual([
      "semantic_inventory_rederive_drop_grounding",
      "req_status_vocabulary_map",
      "semantic_inventory_rederive",
    ]);
  });
});

describe("applying a schema 6 action", () => {
  const context = {
    workspaceRoot: "/workspace",
    clock: () => new Date("2026-01-02T03:04:05.000Z"),
  };
  const apply = (code: string, extra: Partial<MigrationAction> = {}) =>
    applySchema6MigrationAction(
      {
        code,
        affectedEntityIds: [],
        affectedFiles: [],
        evidence: {},
        ...extra,
      } as unknown as MigrationAction,
      context,
    );
  const stub = <T extends object>(module: T, name: keyof T, value: unknown) =>
    track(
      spyOn(module, name as never).mockReturnValue(value as never),
    ) as unknown as Mock<(...args: unknown[]) => unknown>;

  test("runs each source rewrite on the workspace", async () => {
    for (const [code, module, name] of [
      ["polarity_value_backfill", polarity, "applyPolarityValueBackfill"],
      ["semantic_text_pin", bodyContext, "applySemanticTextPins"],
      ["context_missing_tag", bodyContext, "applyContextMissingTags"],
      [
        "supersedes_reason_acknowledge",
        supersedesReason,
        "applySupersedesReasonAcknowledgement",
      ],
      [
        "firm_supersede_acknowledge",
        firmSupersede,
        "applyFirmSupersedeAcknowledgement",
      ],
    ] as const) {
      const spy = stub(module, name as never, undefined);
      await apply(code);
      expect([code, spy.mock.calls]).toEqual([code, [["/workspace"]]]);
    }
  });

  test("states folder types and refuses to leave a file without one", async () => {
    const spy = stub(entityType, "applyEntityTypeBackfill", { skipped: [] });
    await apply("entity_type_backfill");
    expect(spy).toHaveBeenCalledWith("/workspace");
    spy.mockReturnValue({
      skipped: [
        { path: "a.md", reason: "no frontmatter" },
        { path: "b.md", reason: "odd" },
      ],
    } as never);
    expect(apply("entity_type_backfill")).rejects.toThrow(
      "Could not state the type of a.md (no frontmatter), b.md (odd); add the type line by hand.",
    );
  });

  test("pins the evidence floors the plan decided", async () => {
    const spy = stub(evidenceFloor, "applyEvidenceFloorPins", undefined);
    await apply("evidence_floor_pin", {
      affectedEntityIds: ["REQ-1", "REQ-2"],
    });
    expect(spy).toHaveBeenCalledWith(
      "/workspace",
      new Map([
        ["REQ-1", "below"],
        ["REQ-2", "below"],
      ]),
    );
    await apply("evidence_floor_pin", { affectedEntityIds: undefined });
    expect(spy.mock.calls[1]).toEqual(["/workspace", new Map()]);
  });

  test("re-derives the planned inventory, with its contract hash when recorded", async () => {
    const spy = stub(inventory, "applyInventoryRederivation", undefined);
    await apply("semantic_inventory_rederive", {
      affectedEntityIds: ["REQ-1", "REQ-2"],
      evidence: { contractHash: "abc" },
    });
    await apply("semantic_inventory_rederive", {
      affectedEntityIds: ["REQ-3"],
      evidence: { contractHash: 7 },
    });
    expect(spy.mock.calls).toEqual([
      ["/workspace", "REQ-1", "abc"],
      ["/workspace", "REQ-3", undefined],
    ]);
    expect(apply("semantic_inventory_rederive")).rejects.toThrow(
      "Inventory re-derivation names no requirement.",
    );
  });

  test("maps a requirement status only when the plan names the file and both statuses", async () => {
    const spy = stub(
      requirementStatus,
      "applyRequirementStatusMapping",
      undefined,
    );
    await apply("req_status_vocabulary_map", {
      affectedFiles: ["a.md", "b.md"],
      evidence: { status: "accepted", suggestedStatus: "open" },
    });
    expect(spy).toHaveBeenCalledWith("/workspace", "a.md", "accepted", "open");
    for (const extra of [
      { evidence: { status: "accepted", suggestedStatus: "open" } },
      { affectedFiles: ["a.md"], evidence: { suggestedStatus: "open" } },
      { affectedFiles: ["a.md"], evidence: { status: "accepted" } },
    ])
      expect(apply("req_status_vocabulary_map", extra)).rejects.toThrow(
        "Requirement status mapping names no file or target status; set the status by hand.",
      );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("maps delivered statuses and refuses to skip one silently", async () => {
    const spy = stub(requirementStatus, "applyDeliveredStatusMappings", {
      skipped: [],
    });
    await apply("req_status_delivered_map", { affectedEntityIds: ["REQ-1"] });
    expect(spy).toHaveBeenCalledWith("/workspace", new Set(["REQ-1"]));
    spy.mockReturnValue({
      skipped: [
        { path: "a.md", reason: "odd" },
        { path: "b.md", reason: "x" },
      ],
    } as never);
    expect(apply("req_status_delivered_map")).rejects.toThrow(
      "Could not map the status of a.md (odd), b.md (x); set status: closed and add the tag implemented by hand.",
    );
  });

  test("drops exactly the planned grounding links", async () => {
    const spy = stub(
      inventory,
      "applyInventoryRederivationDroppingGrounding",
      undefined,
    );
    await apply("semantic_inventory_rederive_drop_grounding", {
      affectedEntityIds: ["REQ-1"],
      evidence: {
        contractHash: "abc",
        droppedGrounding: [
          { type: "requires_rule", target: "FACT-1", claimKey: "K" },
          { type: 5, target: "FACT-2" },
          { type: "requires_rule", target: null },
          null,
          ["requires_rule", "FACT-3"],
          { type: "requires_predicate", target: "FACT-4" },
        ],
      },
    });
    await apply("semantic_inventory_rederive_drop_grounding", {
      affectedEntityIds: ["REQ-2"],
      evidence: { contractHash: "def", droppedGrounding: "none" },
    });
    expect(spy.mock.calls).toEqual([
      [
        "/workspace",
        "REQ-1",
        "abc",
        [
          { type: "requires_rule", target: "FACT-1" },
          { type: "requires_predicate", target: "FACT-4" },
        ],
      ],
      ["/workspace", "REQ-2", "def", []],
    ]);
    for (const extra of [
      { evidence: { contractHash: "abc" } },
      { affectedEntityIds: ["REQ-1"], evidence: { contractHash: 1 } },
    ])
      expect(
        apply("semantic_inventory_rederive_drop_grounding", extra),
      ).rejects.toThrow(
        "Inventory re-derivation names no requirement or contract hash.",
      );
  });

  test("stamps origin with the migration clock", async () => {
    const spy = stub(originBackfill, "applyOriginBackfill", undefined);
    await apply("entity_origin_backfill");
    expect(spy).toHaveBeenCalledWith("/workspace", "2026-01-02T03:04:05.000Z");
  });

  test("marks legacy symbol links and refreshes their coordinates", async () => {
    const before = { symbols: "s", coordinates: null };
    stub(coordinates, "readGeneratedManifestBytes", before);
    const refresh = track(
      spyOn(coordinates, "refreshCoordinatesAfterMigration").mockResolvedValue({
        outcome: "refreshed",
      } as never),
    );
    const mark = stub(symbolLinks, "applySymbolLegacyLinks", { unmarked: [] });
    const warn = track(spyOn(console, "warn").mockImplementation(() => {}));

    await apply("symbol_legacy_link_mark", {
      affectedEntityIds: ["SYM-1"],
      evidence: { manifestHash: "abc" },
    });
    await apply("symbol_legacy_link_mark", {
      affectedEntityIds: ["SYM-2"],
      evidence: { manifestHash: 5 },
    });
    expect(mark.mock.calls).toEqual([
      ["/workspace", { expectedHash: "abc", expectedIds: ["SYM-1"] }],
      ["/workspace", { expectedIds: ["SYM-2"] }],
    ]);
    expect(refresh).toHaveBeenCalledWith("/workspace", before);
    expect(warn).not.toHaveBeenCalled();

    refresh.mockResolvedValue({
      outcome: "failed",
      reason: "disk full",
    } as never);
    await apply("symbol_legacy_link_mark");
    expect(warn).toHaveBeenCalledWith(
      `Warning: ${coordinates.coordinateRefreshFailureMessage("disk full")}`,
    );

    mark.mockReturnValue({ unmarked: ["SYM-1", "SYM-2"] } as never);
    expect(apply("symbol_legacy_link_mark")).rejects.toThrow(
      "Could not mark SYM-1, SYM-2 as legacy-link in place; add granularity_reason: legacy-link to them by hand.",
    );
  });

  test("closes superseded requirements and refuses to skip one silently", async () => {
    const spy = stub(supersededClosure, "applySupersededClosures", {
      skipped: [],
    });
    await apply("close_superseded_requirements", {
      affectedEntityIds: ["REQ-1"],
    });
    expect(spy).toHaveBeenCalledWith("/workspace", new Set(["REQ-1"]));
    spy.mockReturnValue({
      skipped: [
        { path: "a.md", reason: "odd" },
        { path: "b.md", reason: "x" },
      ],
    } as never);
    expect(apply("close_superseded_requirements")).rejects.toThrow(
      "Could not close a.md (odd), b.md (x); set status: closed by hand.",
    );
  });

  test("repairs exactly the planned source paths", async () => {
    const spy = stub(sourcePaths, "applySourcePathRepairs", { skipped: [] });
    const row = { entityId: "REQ-1", file: "a.md", from: "x", to: "y" };
    await apply("source_path_rewrite", {
      evidence: {
        rewrites: [
          row,
          { ...row, field: "text_ref" },
          { ...row, field: "source" },
          { ...row, entityId: 1 },
          { ...row, file: null },
          { ...row, from: [] },
          { ...row, to: {} },
          "x",
          null,
          undefined,
          7,
          [row],
        ],
        removals: [
          { entityId: "REQ-2", file: "b.md", from: "z", reason: "self" },
          { entityId: "REQ-3", file: "c.md", from: "w", reason: "dangling" },
          { entityId: "REQ-4", file: "d.md", from: "v", reason: "other" },
          { entityId: 4, file: "d.md", from: "v", reason: "self" },
          { entityId: "REQ-4", file: 4, from: "v", reason: "self" },
          { entityId: "REQ-4", file: "d.md", from: 4, reason: "self" },
        ],
      },
    });
    expect(spy).toHaveBeenCalledWith("/workspace", {
      rewrites: [row, { ...row, field: "text_ref" }, row],
      removals: [
        { entityId: "REQ-2", file: "b.md", from: "z", reason: "self" },
        { entityId: "REQ-3", file: "c.md", from: "w", reason: "dangling" },
      ],
    });
    await apply("source_path_rewrite");
    expect(spy.mock.calls[1]).toEqual([
      "/workspace",
      { rewrites: [], removals: [] },
    ]);
    spy.mockReturnValue({
      skipped: [
        { file: "a.md", reason: "odd" },
        { file: "b.md", reason: "x" },
      ],
    } as never);
    expect(apply("source_path_rewrite")).rejects.toThrow(
      "Could not repair the source of a.md (odd), b.md (x); rerun kibi migrate and approve the new plan.",
    );
  });

  test("syncs the store once the sources are rewritten", async () => {
    const spy = track(
      spyOn(sync, "syncCommand").mockResolvedValue({} as never),
    );
    await apply("migration_sync");
    expect(spy).toHaveBeenCalledWith({ workspaceRoot: "/workspace" });
  });

  test("refuses an action it has no executor for", async () => {
    expect(apply("unknown_code")).rejects.toThrow(
      "Migration action 'unknown_code' has no schema 6 executor.",
    );
  });
});
