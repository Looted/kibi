import { describe, expect, test } from "bun:test";

import type { PredicateSchemaCandidate } from "../../src/operations/modeling/predicate-types.js";
import {
  LEGACY_MIGRATION_PLAN_VERSION,
  buildLegacyMigrationPlan,
} from "../../src/public/operations/legacy-migration-plan.js";
import { buildRepairPlan } from "../../src/public/operations/repair-plan.js";

function repairPlan(requirementIds: readonly string[]) {
  const plan = buildRepairPlan(
    {
      summary: {
        proofMissing: requirementIds.length,
        proofUnresolved: 0,
      },
      rows: requirementIds.map((id) => ({
        id,
        proofGaps: ["missing_semantic_inventory", "missing_logic_grounding"],
        proofRepairs: [
          {
            gap: "missing_semantic_inventory",
            priority: 10,
            stage: "semantic_inventory",
            action: "Reconstruct the proposition inventory.",
          },
          {
            gap: "missing_logic_grounding",
            priority: 30,
            stage: "logic_grounding",
            action: "Review exact ground candidates.",
          },
        ],
      })),
    },
    { by: "req", limit: 100, offset: 0 },
    "a".repeat(64),
  );
  if (!plan) throw new Error("Expected requirement repair plan");
  return plan;
}

const projectSchema: PredicateSchemaCandidate = {
  id: "FACT-SCHEMA-SOURCE-BINDING-GUARD",
  predicate_name: "source_binding_guard",
  title: "Source binding guard",
  description:
    "Preserves text_ref evidence when authored requirement prose is migrated.",
  argument_names: ["requirement", "evidence_field"],
  argument_types: ["requirement", "field"],
  keywords: ["source", "binding", "text_ref", "evidence", "prose"],
  aliases: ["preserve text_ref evidence"],
  examples: ["The source binding guard preserves text_ref evidence."],
  tags: ["migration", "source", "evidence"],
};

describe("read-only legacy requirement migration plans", () => {
  test("returns one deterministic source-bound review batch by default", async () => {
    const plan = repairPlan(["REQ-LEGACY-001", "REQ-LEGACY-002"]);
    const requirements = [
      {
        id: "REQ-LEGACY-001",
        title: "Retain drafts",
        status: "open",
        source: "documentation/requirements/REQ-LEGACY-001.md",
        logic_claims: ["CLAIM-STALE0000000000"],
      },
      {
        id: "REQ-LEGACY-002",
        title: "Preserve source evidence",
        status: "open",
        source: "documentation/requirements/REQ-LEGACY-002.md",
      },
    ];
    const sources: Readonly<Record<string, string>> = {
      "REQ-LEGACY-001":
        "Drafts must be retained for 7 days. For example, operators may inspect a sample.",
      "REQ-LEGACY-002":
        "The source binding guard must preserve text_ref evidence.",
    };
    const build = () =>
      buildLegacyMigrationPlan(
        plan,
        { migrationPredicateMinScore: 0 },
        "b".repeat(64),
        {
          requirements,
          projectPredicateSchemas: [projectSchema],
          readSource: async (requirement) =>
            sources[String(requirement.id)] ?? null,
        },
      );
    const first = await build();
    const second = await build();

    expect(first.version).toBe(LEGACY_MIGRATION_PLAN_VERSION);
    expect(first.readOnly).toBe(true);
    expect(first.status).toBe("ready");
    expect(first.planId).toBe(second.planId);
    expect(first.scope).toMatchObject({
      repairPlanComplete: true,
      candidateRequirements: 2,
      selectedRequirements: 1,
      offset: 0,
      limit: 1,
      selectionComplete: false,
      nextOffset: 1,
    });
    const batch = first.batches[0];
    expect(batch?.requirementId).toBe("REQ-LEGACY-001");
    expect(batch?.state).toBe("ready_for_review");
    expect(batch?.autoApplicable).toBe(false);
    expect(batch?.sourceBinding).toMatchObject({
      status: "compatible",
      sourceKind: "authored_markdown_body",
      persistedField: "semantic_text",
    });
    expect(batch?.sourceBinding.sourceHash).toHaveLength(64);
    expect(batch?.propositions.length).toBeGreaterThanOrEqual(2);
    expect(
      batch?.propositions.every((proposition) => proposition.reviewRequired),
    ).toBe(true);
    expect(
      batch?.propositions.filter(
        (proposition) => proposition.disposition !== "nonlogical",
      ).length,
    ).toBe(first.summary.assertivePropositionCount);
    expect(batch?.requirementPropertyPatchPreview).toMatchObject({
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "semantic_text",
      semantic_text: sources["REQ-LEGACY-001"],
      semantic_source_hash: batch?.sourceBinding.sourceHash,
    });
    expect(batch?.claimDelta.stale).toEqual(["CLAIM-STALE0000000000"]);
    expect(first.applicationPolicy).toMatchObject({
      previewOnly: true,
      preserveExistingTextRefs: true,
      exactBindingsBeforeWrite: true,
      sequentialUpsertsOnly: true,
    });
  });

  test("ranks exact project-local schema identities but emits no writes", async () => {
    const plan = repairPlan(["REQ-LEGACY-002"]);
    const result = await buildLegacyMigrationPlan(
      plan,
      {
        migrationPredicateMinScore: 0,
        migrationPredicateLimit: 20,
      },
      "c".repeat(64),
      {
        requirements: [
          {
            id: "REQ-LEGACY-002",
            title: "Preserve source evidence",
            status: "open",
            source: "documentation/requirements/REQ-LEGACY-002.md",
          },
        ],
        projectPredicateSchemas: [projectSchema],
        readSource: async () =>
          "The source binding guard must preserve text_ref evidence.",
      },
    );

    const candidates = result.batches[0]?.propositions[0]?.predicateCandidates;
    expect(candidates).toContainEqual(
      expect.objectContaining({
        schemaId: projectSchema.id,
        origin: "project_local",
        predicateName: projectSchema.predicate_name,
        argumentNames: projectSchema.argument_names,
        argumentTypes: projectSchema.argument_types,
        writeEligible: false,
      }),
    );
    expect(
      candidates?.every((candidate) => candidate.writeEligible === false),
    ).toBe(true);
    expect(result.predicateCatalogHash).toHaveLength(64);
  });

  test("preserves distinct text_ref code evidence in a reviewable semantic_text patch", async () => {
    const plan = repairPlan(["REQ-LEGACY-COLLISION"]);
    const result = await buildLegacyMigrationPlan(plan, {}, "d".repeat(64), {
      requirements: [
        {
          id: "REQ-LEGACY-COLLISION",
          title: "Preserve code evidence",
          status: "open",
          source: "documentation/requirements/REQ-LEGACY-COLLISION.md",
          text_ref: "src/evidence.ts:42",
        },
      ],
      projectPredicateSchemas: [],
      readSource: async () =>
        "Migration must preserve the existing code evidence reference.",
    });

    expect(result.status).toBe("ready");
    expect(result.batches[0]).toMatchObject({
      state: "ready_for_review",
      autoApplicable: false,
      sourceBinding: {
        status: "compatible",
        existingTextRef: "src/evidence.ts:42",
        existingSemanticText: null,
        persistedField: "semantic_text",
      },
      requirementPropertyPatchPreview: {
        semantic_text:
          "Migration must preserve the existing code evidence reference.",
        semantic_source_field: "semantic_text",
      },
    });
    expect(
      result.batches[0]?.requirementPropertyPatchPreview,
    ).not.toHaveProperty("text_ref");
    expect(result.batches[0]?.sourceBinding.reason).toContain(
      "preserving the independent text_ref evidence",
    );
  });

  test("blocks semantic_text drift from the current authored Markdown", async () => {
    const plan = repairPlan(["REQ-LEGACY-SEMANTIC-DRIFT"]);
    const result = await buildLegacyMigrationPlan(plan, {}, "f".repeat(64), {
      requirements: [
        {
          id: "REQ-LEGACY-SEMANTIC-DRIFT",
          title: "Detect semantic source drift",
          status: "open",
          source: "documentation/requirements/REQ-LEGACY-SEMANTIC-DRIFT.md",
          text_ref: "src/evidence.ts:42",
          semantic_text: "An older semantic statement.",
        },
      ],
      projectPredicateSchemas: [],
      readSource: async () => "The current authored semantic statement.",
    });

    expect(result.status).toBe("blocked");
    expect(result.batches[0]).toMatchObject({
      state: "blocked",
      sourceBinding: {
        status: "conflict",
        existingTextRef: "src/evidence.ts:42",
        existingSemanticText: "An older semantic statement.",
        persistedField: null,
      },
      requirementPropertyPatchPreview: null,
    });
    expect(result.batches[0]?.diagnostics[0]).toContain(
      "semantic_text that differs",
    );
  });

  test("fails closed for partial repair scope and missing source", async () => {
    const full = repairPlan(["REQ-MISSING-SOURCE"]);
    const partial = { ...full, scope: { ...full.scope, complete: false } };
    const result = await buildLegacyMigrationPlan(partial, {}, "e".repeat(64), {
      requirements: [
        {
          id: "REQ-MISSING-SOURCE",
          title: "Missing source",
          status: "open",
          source: "documentation/requirements/missing.md",
        },
      ],
      projectPredicateSchemas: [],
      readSource: async () => null,
    });

    expect(result.status).toBe("partial");
    expect(result.batches[0]?.state).toBe("blocked");
    expect(result.batches[0]?.sourceBinding.status).toBe("missing");
    expect(result.diagnostics[0]).toContain("scope is partial");
  });
});
