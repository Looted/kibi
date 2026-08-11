import { createHash } from "node:crypto";

import { requirementSemanticText } from "../../extractors/markdown.js";
import { buildSuggestion } from "../../operations/modeling/predicate-applyplan.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "../../operations/modeling/predicate-catalog.js";
import { inferSubject } from "../../operations/modeling/predicate-inference.js";
import { loadExistingPredicateSchemas } from "../../operations/modeling/predicate-loader.js";
import { scoreSchema } from "../../operations/modeling/predicate-ranker.js";
import type { PredicateSchemaCandidate } from "../../operations/modeling/predicate-types.js";
import { analyzeSemanticAdvisorInput } from "../../operations/semantic-advisor/analyze-prose.js";
import { semanticSourceHash } from "../../operations/semantic-advisor/shared.js";
import type {
  SemanticModelingSuggestion,
  SemanticProposition,
} from "../../operations/semantic-advisor/types.js";
import { loadMarkdownBody } from "../../search-ranking.js";
import { loadEntities } from "./discovery-entities.js";
import type { RepairPlan, RepairPlanBatch } from "./repair-plan.js";
import type { OperationContext } from "./runtime-types.js";

export const LEGACY_MIGRATION_PLAN_VERSION =
  "kibi.legacy-migration-plan.v1" as const;

export type LegacyMigrationPlanInput = {
  readonly migrationLimit?: number;
  readonly migrationOffset?: number;
  readonly migrationPredicateLimit?: number;
  readonly migrationPredicateMinScore?: number;
};

export type LegacyMigrationPredicateCandidate = {
  readonly schemaId: string;
  readonly origin: "project_local" | "built_in";
  readonly predicateName: string;
  readonly argumentNames: readonly string[];
  readonly argumentTypes: readonly string[];
  readonly score: number;
  readonly bindingStatus: "complete" | "incomplete";
  readonly unboundArguments: readonly string[];
  readonly polarity: "assert" | "deny";
  readonly canonicalKey: string;
  readonly writeEligible: false;
};

export type LegacyMigrationProposition = {
  readonly claimKey: string;
  readonly claimText: string;
  readonly role: string;
  readonly inventoryStatus: string;
  readonly span: { readonly start: number; readonly end: number };
  readonly recommendedLane:
    | "strict_property"
    | "predicate"
    | "rule"
    | "unresolved"
    | "nonlogical";
  readonly disposition:
    | "strict_property_candidate"
    | "predicate_candidate"
    | "rule_candidate"
    | "unresolved_ambiguity"
    | "unresolved_ontology_gap"
    | "nonlogical";
  readonly predicateCandidates: readonly LegacyMigrationPredicateCandidate[];
  readonly reviewRequired: true;
};

export type LegacyMigrationBatch = {
  readonly id: string;
  readonly requirementId: string;
  readonly repairBatchId: string;
  readonly dependsOn: readonly string[];
  readonly state: "ready_for_review" | "blocked";
  readonly autoApplicable: false;
  readonly sourceBinding: {
    readonly status: "compatible" | "conflict" | "missing";
    readonly sourceFile: string | null;
    readonly sourceKind: "authored_markdown_body";
    readonly sourceHash: string | null;
    readonly sourceByteLength: number;
    readonly persistedField: "semantic_text" | null;
    readonly existingTextRef: string | null;
    readonly existingSemanticText: string | null;
    readonly reason: string;
  };
  readonly sourceText: string | null;
  readonly claimDelta: {
    readonly preserved: readonly string[];
    readonly added: readonly string[];
    readonly stale: readonly string[];
  };
  readonly propositions: readonly LegacyMigrationProposition[];
  readonly requirementPropertyPatchPreview: Readonly<
    Record<string, unknown>
  > | null;
  readonly diagnostics: readonly string[];
};

export type LegacyMigrationPlan = {
  readonly version: typeof LEGACY_MIGRATION_PLAN_VERSION;
  readonly planId: string;
  readonly readOnly: true;
  readonly status: "no_candidates" | "ready" | "blocked" | "partial";
  readonly codeSnapshot: string;
  readonly repairPlanId: string;
  readonly predicateCatalogHash: string;
  readonly scope: {
    readonly repairPlanComplete: boolean;
    readonly candidateRequirements: number;
    readonly selectedRequirements: number;
    readonly offset: number;
    readonly limit: number;
    readonly selectionComplete: boolean;
    readonly nextOffset: number | null;
  };
  readonly applicationPolicy: {
    readonly previewOnly: true;
    readonly reviewEveryProposition: true;
    readonly preserveExistingTextRefs: true;
    readonly exactBindingsBeforeWrite: true;
    readonly validateBeforeEachWrite: true;
    readonly sequentialUpsertsOnly: true;
    readonly recheckContradictionsAfterEachBatch: true;
  };
  readonly summary: {
    readonly batchCount: number;
    readonly readyBatchCount: number;
    readonly blockedBatchCount: number;
    readonly propositionCount: number;
    readonly assertivePropositionCount: number;
    readonly unresolvedPropositionCount: number;
    readonly predicateCandidateCount: number;
  };
  readonly batches: readonly LegacyMigrationBatch[];
  readonly diagnostics: readonly string[];
};

type LegacyMigrationPlanDependencies = {
  readonly requirements: readonly Readonly<Record<string, unknown>>[];
  readonly projectPredicateSchemas: readonly PredicateSchemaCandidate[];
  readonly readSource: (
    requirement: Readonly<Record<string, unknown>>,
  ) => Promise<string | null>;
  readonly diagnostics?: readonly string[];
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") return [stripKbEntityPrefix(value)];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    typeof item === "string" ? [stripKbEntityPrefix(item)] : [],
  );
}

function stripKbEntityPrefix(value: string): string {
  return value.replace(/^kb:entity\//, "");
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value ?? fallback));
}

function clampScore(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.35;
  return Math.min(1, Math.max(0, value));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function migrationRepairBatches(plan: RepairPlan): RepairPlanBatch[] {
  const seen = new Set<string>();
  return plan.batches
    .filter(
      (batch) =>
        batch.phase === "semantic_inventory" && batch.state === "ready",
    )
    .filter((batch) => {
      if (seen.has(batch.requirementId)) return false;
      seen.add(batch.requirementId);
      return true;
    })
    .sort((left, right) =>
      left.requirementId.localeCompare(right.requirementId),
    );
}

function schemaIdentity(schema: PredicateSchemaCandidate): string {
  return `${schema.predicate_name}(${schema.argument_names.join(",")}):${schema.argument_types.join(",")}`;
}

function predicateCatalog(
  projectSchemas: readonly PredicateSchemaCandidate[],
): readonly {
  readonly schema: PredicateSchemaCandidate;
  readonly origin: "project_local" | "built_in";
}[] {
  const result: Array<{
    schema: PredicateSchemaCandidate;
    origin: "project_local" | "built_in";
  }> = [];
  const seen = new Set<string>();
  for (const [origin, schemas] of [
    ["project_local", projectSchemas],
    ["built_in", BUILT_IN_PREDICATE_SCHEMAS],
  ] as const) {
    for (const schema of schemas) {
      const identity = schemaIdentity(schema);
      if (seen.has(identity)) continue;
      seen.add(identity);
      result.push({ schema, origin });
    }
  }
  return result;
}

function rankPredicateCandidates(
  claimText: string,
  catalog: ReturnType<typeof predicateCatalog>,
  limit: number,
  minimumScore: number,
): LegacyMigrationPredicateCandidate[] {
  const subject = inferSubject(claimText, undefined);
  return catalog
    .map(({ schema, origin }) => ({
      schema,
      origin,
      score: scoreSchema(schema, claimText),
    }))
    .filter(({ score }) => score >= minimumScore)
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.origin === right.origin
          ? 0
          : left.origin === "project_local"
            ? -1
            : 1) ||
        left.schema.predicate_name.localeCompare(right.schema.predicate_name) ||
        left.schema.id.localeCompare(right.schema.id),
    )
    .slice(0, limit)
    .map(({ schema, origin, score }) => {
      const suggestion = buildSuggestion(schema, claimText, subject, score);
      return {
        schemaId: schema.id,
        origin,
        predicateName: schema.predicate_name,
        argumentNames: [...schema.argument_names],
        argumentTypes: [...schema.argument_types],
        score,
        bindingStatus: suggestion.binding_status,
        unboundArguments: [...suggestion.unbound_arguments],
        polarity: suggestion.polarity,
        canonicalKey: suggestion.canonical_key,
        writeEligible: false,
      };
    });
}

function propositionDisposition(
  proposition: SemanticProposition,
  suggestion: SemanticModelingSuggestion | undefined,
  candidates: readonly LegacyMigrationPredicateCandidate[],
): Pick<LegacyMigrationProposition, "recommendedLane" | "disposition"> {
  if (proposition.status === "nonlogical") {
    return { recommendedLane: "nonlogical", disposition: "nonlogical" };
  }
  if (suggestion?.kind === "strict_property") {
    return {
      recommendedLane: "strict_property",
      disposition: "strict_property_candidate",
    };
  }
  if (suggestion?.kind === "rule") {
    return { recommendedLane: "rule", disposition: "rule_candidate" };
  }
  if (suggestion?.kind === "predicate" || candidates.length > 0) {
    return {
      recommendedLane: "predicate",
      disposition: "predicate_candidate",
    };
  }
  if (
    proposition.status === "ambiguous" ||
    suggestion?.kind === "ambiguity_observation"
  ) {
    return {
      recommendedLane: "unresolved",
      disposition: "unresolved_ambiguity",
    };
  }
  return {
    recommendedLane: "unresolved",
    disposition: "unresolved_ontology_gap",
  };
}

function claimDelta(
  existing: readonly string[],
  expected: readonly string[],
): LegacyMigrationBatch["claimDelta"] {
  const existingSet = new Set(existing);
  const expectedSet = new Set(expected);
  return {
    preserved: expected.filter((claim) => existingSet.has(claim)).sort(),
    added: expected.filter((claim) => !existingSet.has(claim)).sort(),
    stale: existing.filter((claim) => !expectedSet.has(claim)).sort(),
  };
}

async function buildBatch(
  repairBatch: RepairPlanBatch,
  requirement: Readonly<Record<string, unknown>> | undefined,
  readSource: LegacyMigrationPlanDependencies["readSource"],
  catalog: ReturnType<typeof predicateCatalog>,
  predicateLimit: number,
  predicateMinScore: number,
): Promise<LegacyMigrationBatch> {
  const requirementId = repairBatch.requirementId;
  const sourceFile =
    typeof requirement?.source === "string" ? requirement.source : null;
  const sourceText = requirement ? await readSource(requirement) : null;
  const existingTextRef =
    typeof requirement?.text_ref === "string" && requirement.text_ref.trim()
      ? requirement.text_ref.trim()
      : null;
  const existingSemanticText =
    typeof requirement?.semantic_text === "string" &&
    requirement.semantic_text.trim()
      ? requirement.semantic_text.trim()
      : null;
  const sourceHash = sourceText ? semanticSourceHash(sourceText) : null;
  const sourceMissing = requirement === undefined || !sourceText;
  const sourceConflict =
    !sourceMissing &&
    existingSemanticText !== null &&
    existingSemanticText !== sourceText;
  const sourceStatus = sourceMissing
    ? "missing"
    : sourceConflict
      ? "conflict"
      : "compatible";
  const diagnostics: string[] = [];
  if (requirement === undefined) {
    diagnostics.push(
      `Requirement ${requirementId} is present in the repair plan but absent from exact KB query results.`,
    );
  } else if (!sourceText) {
    diagnostics.push(
      `Requirement ${requirementId} has no readable authored Markdown body inside the workspace.`,
    );
  } else if (sourceConflict) {
    diagnostics.push(
      `Requirement ${requirementId} has semantic_text that differs from its normalized authored Markdown body; review the source drift before applying this migration.`,
    );
  }

  if (!requirement || !sourceText || !sourceHash) {
    return {
      id: `legacy-migration-${requirementId}`,
      requirementId,
      repairBatchId: repairBatch.id,
      dependsOn: [...repairBatch.dependsOn],
      state: "blocked",
      autoApplicable: false,
      sourceBinding: {
        status: sourceStatus,
        sourceFile,
        sourceKind: "authored_markdown_body",
        sourceHash,
        sourceByteLength: sourceText
          ? Buffer.byteLength(sourceText, "utf8")
          : 0,
        persistedField: null,
        existingTextRef,
        existingSemanticText,
        reason: diagnostics[0] ?? "Authored requirement source is unavailable.",
      },
      sourceText,
      claimDelta: { preserved: [], added: [], stale: [] },
      propositions: [],
      requirementPropertyPatchPreview: null,
      diagnostics,
    };
  }

  const existingLogicClaims = stringList(requirement.logic_claims);
  const analysis = analyzeSemanticAdvisorInput({
    payload: {
      type: "req",
      id: requirementId,
      properties: {
        title: requirement.title,
        status: requirement.status,
        source: sourceFile ?? undefined,
        semantic_text: sourceText,
        logic_claims: existingLogicClaims,
      },
      relationships: [],
    },
  });
  const suggestions = new Map(
    analysis.receipt.suggestions.map((suggestion) => [
      suggestion.claim_key,
      suggestion,
    ]),
  );
  const propositions = analysis.receipt.propositions.map((proposition) => {
    const predicateCandidates =
      proposition.status === "nonlogical"
        ? []
        : rankPredicateCandidates(
            proposition.claim_text,
            catalog,
            predicateLimit,
            predicateMinScore,
          );
    const disposition = propositionDisposition(
      proposition,
      suggestions.get(proposition.claim_key),
      predicateCandidates,
    );
    return {
      claimKey: proposition.claim_key,
      claimText: proposition.claim_text,
      role: proposition.role,
      inventoryStatus: proposition.status,
      span: { ...proposition.span },
      ...disposition,
      predicateCandidates,
      reviewRequired: true,
    } satisfies LegacyMigrationProposition;
  });
  const expectedClaimKeys = [
    ...analysis.receipt.logic_coverage.expected_claim_keys,
  ];
  const propertyPatch = sourceConflict
    ? null
    : {
        semantic_text: sourceText,
        logic_claims: expectedClaimKeys,
        semantic_clauses: analysis.receipt.clauses.map((clause) => clause.text),
        semantic_inventory_version: analysis.receipt.inventory_contract.version,
        semantic_source_field: analysis.receipt.inventory_contract.source_field,
        semantic_source_hash: analysis.receipt.inventory_contract.source_hash,
        semantic_inventory: analysis.receipt.propositions.map(
          (proposition) => ({
            claim_key: proposition.claim_key,
            claim_text: proposition.claim_text,
            role: proposition.role,
            status: proposition.status,
            span: { ...proposition.span },
            ...(proposition.reason ? { reason: proposition.reason } : {}),
          }),
        ),
      };

  return {
    id: `legacy-migration-${requirementId}`,
    requirementId,
    repairBatchId: repairBatch.id,
    dependsOn: [...repairBatch.dependsOn],
    state: sourceConflict ? "blocked" : "ready_for_review",
    autoApplicable: false,
    sourceBinding: {
      status: sourceStatus,
      sourceFile,
      sourceKind: "authored_markdown_body",
      sourceHash,
      sourceByteLength: Buffer.byteLength(sourceText, "utf8"),
      persistedField: sourceConflict ? null : "semantic_text",
      existingTextRef,
      existingSemanticText,
      reason: sourceConflict
        ? (diagnostics[0] ?? "Existing semantic_text has drifted from source.")
        : existingTextRef
          ? "Authored Markdown can be reviewed in semantic_text while preserving the independent text_ref evidence."
          : "Authored Markdown can be reviewed in the dedicated semantic_text field.",
    },
    sourceText,
    claimDelta: claimDelta(existingLogicClaims, expectedClaimKeys),
    propositions,
    requirementPropertyPatchPreview: propertyPatch,
    diagnostics: [...diagnostics, ...analysis.warnings],
  };
}

// implements REQ-kibi-legacy-migration-preview-v2
export async function buildLegacyMigrationPlan(
  repairPlan: RepairPlan,
  input: LegacyMigrationPlanInput,
  codeSnapshot: string,
  dependencies: LegacyMigrationPlanDependencies,
): Promise<LegacyMigrationPlan> {
  const offset = clampInteger(
    input.migrationOffset,
    0,
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const limit = clampInteger(input.migrationLimit, 1, 1, 10);
  const predicateLimit = clampInteger(input.migrationPredicateLimit, 5, 1, 20);
  const predicateMinScore = clampScore(input.migrationPredicateMinScore);
  const candidateBatches = migrationRepairBatches(repairPlan);
  const selected = candidateBatches.slice(offset, offset + limit);
  const requirementById = new Map(
    dependencies.requirements.flatMap((requirement) =>
      typeof requirement.id === "string"
        ? [[requirement.id, requirement] as const]
        : [],
    ),
  );
  const catalog = predicateCatalog(dependencies.projectPredicateSchemas);
  const predicateCatalogHash = hash(
    catalog.map(({ schema, origin }) => ({ origin, schema })),
  );
  const batches: LegacyMigrationBatch[] = [];
  for (const repairBatch of selected) {
    batches.push(
      await buildBatch(
        repairBatch,
        requirementById.get(repairBatch.requirementId),
        dependencies.readSource,
        catalog,
        predicateLimit,
        predicateMinScore,
      ),
    );
  }
  const readyBatchCount = batches.filter(
    (batch) => batch.state === "ready_for_review",
  ).length;
  const blockedBatchCount = batches.length - readyBatchCount;
  const propositionCount = batches.reduce(
    (count, batch) => count + batch.propositions.length,
    0,
  );
  const assertivePropositionCount = batches.reduce(
    (count, batch) =>
      count +
      batch.propositions.filter(
        (proposition) => proposition.disposition !== "nonlogical",
      ).length,
    0,
  );
  const unresolvedPropositionCount = batches.reduce(
    (count, batch) =>
      count +
      batch.propositions.filter((proposition) =>
        proposition.disposition.startsWith("unresolved_"),
      ).length,
    0,
  );
  const predicateCandidateCount = batches.reduce(
    (count, batch) =>
      count +
      batch.propositions.reduce(
        (subtotal, proposition) =>
          subtotal + proposition.predicateCandidates.length,
        0,
      ),
    0,
  );
  const nextOffset =
    offset + selected.length < candidateBatches.length
      ? offset + selected.length
      : null;
  const diagnostics = [...(dependencies.diagnostics ?? [])];
  if (!repairPlan.scope.complete) {
    diagnostics.push(
      "Legacy migration scope is partial because requirement coverage omitted actionable requirements; rerun complete coverage before treating this as a project inventory.",
    );
  }
  if (candidateBatches.length > 0 && selected.length === 0) {
    diagnostics.push(
      `Migration offset ${offset} is beyond ${candidateBatches.length} ready semantic-inventory requirement batch(es).`,
    );
  }
  const planCore = {
    version: LEGACY_MIGRATION_PLAN_VERSION,
    codeSnapshot,
    repairPlanId: repairPlan.planId,
    predicateCatalogHash,
    scope: {
      repairPlanComplete: repairPlan.scope.complete,
      candidateRequirements: candidateBatches.length,
      selectedRequirements: selected.length,
      offset,
      limit,
      selectionComplete:
        offset === 0 && selected.length === candidateBatches.length,
      nextOffset,
    },
    batches,
  };
  const planId = `legacy-migration-plan-${hash(planCore).slice(0, 24)}`;
  const status = !repairPlan.scope.complete
    ? "partial"
    : candidateBatches.length === 0
      ? "no_candidates"
      : readyBatchCount === 0
        ? "blocked"
        : "ready";

  return {
    ...planCore,
    planId,
    readOnly: true,
    status,
    applicationPolicy: {
      previewOnly: true,
      reviewEveryProposition: true,
      preserveExistingTextRefs: true,
      exactBindingsBeforeWrite: true,
      validateBeforeEachWrite: true,
      sequentialUpsertsOnly: true,
      recheckContradictionsAfterEachBatch: true,
    },
    summary: {
      batchCount: batches.length,
      readyBatchCount,
      blockedBatchCount,
      propositionCount,
      assertivePropositionCount,
      unresolvedPropositionCount,
      predicateCandidateCount,
    },
    diagnostics,
  };
}

// implements REQ-kibi-legacy-migration-preview-v2
export async function buildLegacyMigrationPlanFromContext(
  repairPlan: RepairPlan,
  input: LegacyMigrationPlanInput,
  codeSnapshot: string,
  context: OperationContext,
): Promise<LegacyMigrationPlan> {
  if (!context.prolog) {
    throw new Error("Legacy migration planning requires a Prolog context");
  }
  const requirements = await loadEntities(context.prolog, { type: "req" });
  const schemaDiagnostics: string[] = [];
  const projectPredicateSchemas = await loadExistingPredicateSchemas(
    context.prolog,
    true,
    schemaDiagnostics,
  );
  return buildLegacyMigrationPlan(repairPlan, input, codeSnapshot, {
    requirements,
    projectPredicateSchemas,
    diagnostics: schemaDiagnostics,
    readSource: async (requirement) => {
      const source =
        typeof requirement.source === "string" ? requirement.source : "";
      const body = await loadMarkdownBody(source, context.workspaceRoot);
      if (body === null) return null;
      const semanticText = requirementSemanticText(body);
      return semanticText || null;
    },
  });
}
