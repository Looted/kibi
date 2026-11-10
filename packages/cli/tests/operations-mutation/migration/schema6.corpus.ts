import { spyOn } from "bun:test";
import * as markdown from "../../../src/extractors/markdown.js";
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
import { buildSchema6MigrationFragment } from "../../../src/operations/migration/schema6.js";
import * as sourcePaths from "../../../src/operations/migration/source-paths.js";
import * as supersededClosure from "../../../src/operations/migration/superseded-closure.js";
import * as supersedesReason from "../../../src/operations/migration/supersedes-reason.js";
import * as symbolLinks from "../../../src/operations/migration/symbol-legacy-links.js";
import * as shards from "../../../src/relationships/shards.js";

/**
 * Planner outputs for buildSchema6MigrationFragment, whose plans are pinned
 * in schema6.golden.json. Every planner the fragment calls is stubbed, so a
 * scenario names exactly what each one reports.
 */

const plan = (
  id: string,
  safe: boolean,
  droppable = false,
): inventory.InventoryRederivation => ({
  requirementId: id,
  path: `.kb/requirements/${id}.md`,
  errors: [`${id} drifted`],
  safe,
  reasons: safe ? [] : [`${id} grounding is orphaned`, "second reason"],
  summary: {
    keptModeled: 1,
    roleChanges: 2,
    newlyUnresolved: 3,
    droppedClaims: 4,
    downgradedModeled: 5,
  },
  changes: [
    { claim_key: "CLAIM-KEPT", change: "kept" },
    {
      claim_key: "CLAIM-NEW",
      change: "new_unresolved",
      after: { role: "normative", status: "missing" },
    },
  ],
  contract: {
    semantic_inventory_version: "kibi.semantic-inventory.v1",
    semantic_source_field: "semantic_text",
    semantic_source_hash: "h",
    semantic_inventory: [],
    logic_claims: [],
  },
  contractHash: `hash-${id}`,
  orphanedGrounding: droppable
    ? [
        {
          type: "requires_predicate",
          target: "FACT-1",
          claimKey: "CLAIM-1",
          inFrontMatter: true,
        },
      ]
    : [],
  rederivableByDroppingGrounding: droppable,
});

type Finding = requirementStatus.RequirementStatusFinding;
const finding = (
  id: string,
  status: string,
  extra: Partial<Finding> = {},
): Finding => ({
  requirementId: id,
  path: `.kb/requirements/${id}.md`,
  status,
  suggestedStatus: null,
  automatic: null,
  extractionError: null,
  latentDrift: null,
  ...extra,
});

export type Stubs = {
  polarity: unknown[];
  types: { targets: unknown[]; skipped: unknown[] };
  pins: { targets: unknown[] };
  tags: { targets: unknown[] };
  unexplained: unknown[];
  firmEdges: string[];
  floors: { targets: unknown[]; skipped: unknown[] };
  claims: { targets: unknown[]; skipped: unknown[]; review: unknown[] };
  drift: inventory.InventoryRederivation[];
  statuses: Finding[];
  origin: { targets: unknown[]; skipped: unknown[] };
  requirements: Record<string, Record<string, unknown>>;
  relationships: { type: string; from: string; to: string }[];
  shardRelationships: { type: string; from: string; to: string }[] | Error;
  supersession: { closures: unknown[]; cycles: unknown[] };
  repairs: unknown[];
  symbols: {
    manifestPath: string;
    manifestHash: string | null;
    targets: unknown[];
  };
};

export const EMPTY: Stubs = {
  polarity: [],
  types: { targets: [], skipped: [] },
  pins: { targets: [] },
  tags: { targets: [] },
  unexplained: [],
  firmEdges: [],
  floors: { targets: [], skipped: [] },
  claims: { targets: [], skipped: [], review: [] },
  drift: [],
  statuses: [],
  origin: { targets: [], skipped: [] },
  requirements: {},
  relationships: [],
  shardRelationships: [],
  supersession: { closures: [], cycles: [] },
  repairs: [],
  symbols: {
    manifestPath: ".kb/symbols.yaml",
    manifestHash: null,
    targets: [],
  },
};

const target = (id: string, type: string) => ({
  id,
  path: `.kb/${type}/${id}.md`,
  type,
});

export const FULL: Stubs = {
  polarity: [target("FACT-P1", "facts"), target("FACT-P2", "facts")],
  types: {
    targets: [target("REQ-T1", "req"), target("SCN-T1", "scenario")],
    skipped: [{ path: ".kb/x.md", reason: "odd" }],
  },
  pins: { targets: [target("REQ-S1", "req")] },
  tags: { targets: [target("REQ-C1", "req"), target("ADR-C1", "adr")] },
  unexplained: [target("REQ-U1", "req"), target("ADR-U1", "adr")],
  firmEdges: ["REQ-F2 -> REQ-F1", "REQ-F2 -> REQ-F0", "ADR-F1 -> ADR-F0"],
  floors: {
    targets: [target("REQ-E1", "req")],
    skipped: [{ id: "REQ-E2", path: "p", reason: "r" }],
  },
  claims: {
    targets: [target("TEST-K1", "test")],
    skipped: [{ id: "TEST-K2", path: "p", reason: "r" }],
    review: [
      {
        id: "TEST-R1",
        path: ".kb/tests/TEST-R1.md",
        kind: "regex",
        candidates: [],
      },
    ],
  },
  drift: [
    plan("REQ-SAFE", true),
    plan("REQ-DROP", false, true),
    plan("REQ-HAND", false),
  ],
  statuses: [
    finding("REQ-D1", "implemented", {
      automatic: { status: "closed", tag: "implemented" },
    }),
    finding("REQ-D2", "done", {
      automatic: { status: "closed", tag: "implemented" },
    }),
    finding("REQ-M1", "accepted", {
      suggestedStatus: "open",
      latentDrift: plan("REQ-M1", true),
    }),
    finding("REQ-M2", "accepted", {
      suggestedStatus: "open",
      latentDrift: plan("REQ-M2", false, true),
    }),
    finding("REQ-M3", "accepted", {
      suggestedStatus: "closed",
      latentDrift: plan("REQ-M3", false),
    }),
    finding("REQ-M4", "proposed", { suggestedStatus: "open" }),
    finding("REQ-M5", "superseded"),
    finding("REQ-M6", "weird", { extractionError: "status is not allowed" }),
    finding("REQ-M7", "draft", {
      latentDrift: plan("REQ-M7", true),
    }),
  ],
  origin: {
    targets: [
      { id: "REQ-O1", type: "req" },
      { id: "REQ-O2", type: "req" },
      { id: "X-O3", type: "" },
    ],
    skipped: [{ path: "p", reason: "r" }],
  },
  requirements: {
    "REQ-EX1": { id: "REQ-EX1", status: "open" },
    "REQ-EX2": { id: "REQ-EX2", status: "open", approved_by: "  " },
    "REQ-EX3": { id: "REQ-EX3", status: "open", approved_by: "lead" },
    "REQ-EX4": { id: "REQ-EX4", status: "deprecated" },
    "REQ-EX5": { id: "REQ-EX5", status: "active" },
    "REQ-EX6": { id: "REQ-EX6", status: "approved" },
  },
  relationships: [
    { type: "exempts", from: "REQ-EX1", to: "REQ-BASE-B" },
    { type: "exempts", from: "REQ-EX1", to: "REQ-BASE-A" },
    { type: "exempts", from: "REQ-EX2", to: "REQ-BASE-A" },
    { type: "exempts", from: "REQ-EX3", to: "REQ-BASE-A" },
    { type: "exempts", from: "REQ-EX4", to: "REQ-BASE-A" },
    { type: "relates_to", from: "REQ-EX6", to: "REQ-BASE-A" },
    { type: "exempts", from: "REQ-GONE", to: "REQ-BASE-A" },
  ],
  shardRelationships: [
    { type: "exempts", from: "REQ-EX5", to: "REQ-BASE-C" },
    { type: "exempts", from: "REQ-EX6", to: "REQ-BASE-C" },
    { type: "supersedes", from: "REQ-NEW", to: "REQ-EX6" },
  ],
  supersession: {
    closures: [
      {
        id: "REQ-CL2",
        path: ".kb/requirements/REQ-CL2.md",
        status: "open",
        supersededBy: ["REQ-N2"],
      },
    ],
    cycles: [
      {
        members: ["REQ-Y2", "REQ-Y1"],
        edges: [
          ["REQ-Y1", "REQ-Y2"],
          ["REQ-Y2", "REQ-Y1"],
        ],
        files: [".kb/requirements/REQ-Y1.md"],
      },
    ],
  },
  repairs: [
    {
      entityId: "REQ-R1",
      field: "text_ref",
      value: "docs/a.md",
      file: ".kb/requirements/REQ-R1.md",
      dangling: true,
      fix: { kind: "rewrite", to: ".kb/docs/a.md" },
      refused: "multi-line",
    },
    {
      entityId: "REQ-R2",
      field: "source",
      value: "gone.md",
      file: ".kb/requirements/REQ-R2.md",
      dangling: true,
      fix: { kind: "remove", reason: "dangling" },
      refused: "spans lines",
    },
    {
      entityId: "REQ-R3",
      field: "source",
      value: "requirements/REQ-R3.md",
      file: ".kb/requirements/REQ-R3.md",
      dangling: false,
      fix: { kind: "rewrite", to: ".kb/requirements/REQ-R3.md" },
    },
  ],
  symbols: {
    manifestPath: ".kb/symbols.yaml",
    manifestHash: "abc",
    targets: [{ id: "SYM-1", file: "src/a.ts" }],
  },
};

/** Stub every planner the fragment calls with `stubs`; returns the spies. */
export function stubPlanners(stubs: Stubs): { mockRestore: () => void }[] {
  const ids = Object.keys(stubs.requirements);
  return [
    spyOn(polarity, "planPolarityValueBackfill").mockReturnValue(
      stubs.polarity as never,
    ),
    spyOn(entityType, "planEntityTypeBackfill").mockReturnValue(
      stubs.types as never,
    ),
    spyOn(bodyContext, "planSemanticTextPins").mockReturnValue(
      stubs.pins as never,
    ),
    spyOn(bodyContext, "planContextMissingTags").mockReturnValue(
      stubs.tags as never,
    ),
    spyOn(
      supersedesReason,
      "planSupersedesReasonAcknowledgement",
    ).mockReturnValue(stubs.unexplained as never),
    spyOn(firmSupersede, "planFirmSupersedeAcknowledgement").mockReturnValue(
      stubs.firmEdges as never,
    ),
    spyOn(evidenceFloor, "planEvidenceFloorPins").mockReturnValue(
      stubs.floors as never,
    ),
    spyOn(proofClaims, "planProofContractClaimPins").mockReturnValue(
      stubs.claims as never,
    ),
    spyOn(inventory, "planInventoryRederivation").mockReturnValue(stubs.drift),
    spyOn(requirementStatus, "planRequirementStatusMappings").mockReturnValue(
      stubs.statuses,
    ),
    spyOn(originBackfill, "planOriginBackfill").mockReturnValue(
      stubs.origin as never,
    ),
    spyOn(kbSources, "listLaneMarkdownFiles").mockReturnValue([
      ...ids.map((id) => ({
        lane: "requirements" as const,
        absolutePath: `/kb/${id}.md`,
        relativePath: `.kb/requirements/${id}.md`,
      })),
      {
        lane: "requirements" as const,
        absolutePath: "/kb/broken.md",
        relativePath: ".kb/requirements/broken.md",
      },
    ]),
    spyOn(markdown, "extractFromMarkdown").mockImplementation(((
      file: string,
    ) => {
      const id = file.slice("/kb/".length, -".md".length);
      const entity = stubs.requirements[id];
      if (entity === undefined) throw new Error(`unreadable ${file}`);
      return {
        entity,
        relationships: stubs.relationships.filter((row) => row.from === id),
      };
    }) as never),
    spyOn(shards, "readAllShards").mockImplementation((() => {
      if (stubs.shardRelationships instanceof Error)
        throw stubs.shardRelationships;
      return stubs.shardRelationships;
    }) as never),
    spyOn(supersededClosure, "planSupersededClosures").mockReturnValue(
      stubs.supersession as never,
    ),
    spyOn(sourcePaths, "findSourceRepairs").mockReturnValue(
      stubs.repairs as never,
    ),
    spyOn(symbolLinks, "planSymbolLegacyLinks").mockReturnValue(
      stubs.symbols as never,
    ),
  ];
}

export type Scenario = {
  stubs: Stubs;
  currentSchemaVersion: number | null;
  claimCandidates?: unknown[] | null;
};

export const SCENARIOS: Record<string, Scenario> = {
  "every planner reports work on a schema 4 knowledge base": {
    stubs: FULL,
    currentSchemaVersion: 4,
    claimCandidates: [{ test_id: "TEST-K1" }],
  },
  "an unknown schema version plans every step": {
    stubs: FULL,
    currentSchemaVersion: null,
    claimCandidates: [],
  },
  "a current knowledge base plans only the version-independent repairs": {
    stubs: FULL,
    currentSchemaVersion: 99,
    claimCandidates: [{ test_id: "TEST-K1" }],
  },
  "nothing to repair": { stubs: EMPTY, currentSchemaVersion: null },
};

/** Build the fragment for `scenario` with stubbed planners, as plain JSON. */
export function planScenario(scenario: Scenario): unknown {
  const spies = stubPlanners(scenario.stubs);
  try {
    return JSON.parse(
      JSON.stringify(
        buildSchema6MigrationFragment({
          workspaceRoot: "/workspace",
          currentSchemaVersion: scenario.currentSchemaVersion,
          ladderFloors: null,
          ...(scenario.claimCandidates === undefined
            ? {}
            : { claimCandidates: scenario.claimCandidates as never }),
        }),
      ),
    );
  } finally {
    for (const spy of spies.reverse()) spy.mockRestore();
  }
}
