import { createHash } from "node:crypto";
import path from "node:path";

import {
  type IntentSearchFacets,
  type IntentSearchMatch,
  type SourceLocation,
  executeIntentSearch,
} from "../../intent-search.js";
import { publicCapabilityStamp } from "../../plugins/compose-semantic-classifier.js";
import { normalizeEntityId, parseTriples } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import { executeStatus } from "../../public/operations/discovery-executors.js";
import type {
  OperationContext,
  WorkspaceSnapshot,
} from "../../public/operations/runtime-types.js";
import { buildWhatIfAnalysisGoal } from "../mutation/contradictions.js";
import { canonicalSourcePath } from "../mutation/source-authoring.js";
import type { RelationshipInput, UpsertInput } from "../mutation/types.js";
import { validateUpsertInput } from "../mutation/validation.js";
import { analyzeSemanticAdvisorInputWithPlugins } from "../semantic-advisor/plugin-orchestration.js";
import { canonicalize } from "../semantic-advisor/shared.js";
import type {
  SemanticAdvisorReceipt,
  SemanticInterpretationInput,
  SemanticModelingSuggestion,
} from "../semantic-advisor/types.js";

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export const COMPILE_PLAN_VERSION = "kibi.compile-plan.v1" as const;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type CompileIntentArgs = Readonly<{
  intent: string;
  mode: "create" | "update";
  requirementId?: string;
  title?: string;
  sourceLocations?: readonly SourceLocation[];
  semanticFacets?: IntentSearchFacets;
  clauses?: readonly string[];
  interpretations?: readonly SemanticInterpretationInput[];
  scenarioDrafts?: readonly ScenarioDraft[];
  testDrafts?: readonly TestDraft[];
  proposalDecisions?: readonly ProposalDecision[];
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type ScenarioDraft = Readonly<{
  id?: string;
  title: string;
  body: string;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type TestDraft = Readonly<{
  id?: string;
  title: string;
  body: string;
  /** Stable IDs of the scenario drafts that this test verifies. */
  scenarioIds?: readonly string[];
  verificationScope?: "unit" | "integration" | "end_to_end";
  verificationPerspective?: "internal" | "consumer";
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type ProposalDecision = Readonly<{
  proposalId: string;
  decision: "accept" | "reject";
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
/**
 * One witness from the staged what-if analysis. The engine's full evidence
 * (sides, facts, scenario, comparison) is kept alongside these normalized
 * fields so callers can act on more than requirement ids.
 */
export type ContradictionWitness = Readonly<
  {
    requirements: readonly string[];
    reason: string;
    status?: string;
    /** property | predicate | rule | scenario_feasibility */
    kind?: string;
  } & Record<string, unknown>
>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type TraceabilityProposal = Readonly<{
  proposalId: string;
  candidateId: string;
  candidateType: string;
  relationship: Readonly<{ from: string; to: string; type: string }>;
  confidence: number;
  evidence: readonly string[];
  decision: "pending" | "accept" | "reject";
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type PlanStep = Readonly<Record<string, unknown>>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export function compilePlanHash(
  plan: Readonly<Record<string, unknown>>,
): string {
  const { planHash: _ignored, ...body } = plan;
  return hash(body);
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type CompilePlanV1 = Readonly<{
  version: typeof COMPILE_PLAN_VERSION;
  planHash: string;
  status: "ready" | "needs_resolution" | "blocked";
  expected: {
    branch: string;
    kbSnapshotId: string;
    workspaceSnapshot: string;
    sourceHashes: Readonly<Record<string, string | null>>;
  };
  target: {
    mode: "create" | "update";
    requirementId: string;
    selectionReason: string;
  };
  discovery: {
    candidates: readonly IntentSearchMatch[];
    abstained: boolean;
  };
  propositions: readonly {
    claimKey: string;
    text: string;
    span: { start: number; end: number };
    disposition:
      | "strict_property"
      | "predicate"
      | "rule"
      | "observation"
      | "nonlogical";
    status: "modeled" | "ambiguous" | "ontology_gap" | "nonlogical";
    origin: "host" | "deterministic";
  }[];
  contradictionAnalysis: {
    outcome: "no_conflict" | "conflict" | "unresolved";
    /** Witnesses that decided the outcome: introduced ones, plus staged ones naming the target requirement. */
    witnesses: readonly ContradictionWitness[];
    /** Staged witnesses the current KB does not have. */
    introduced?: readonly ContradictionWitness[];
    /** Current witnesses the plan resolves. */
    removed?: readonly ContradictionWitness[];
    /** Staged witnesses that already exist in the current KB. */
    unchanged?: readonly ContradictionWitness[];
  };
  proposals: readonly TraceabilityProposal[];
  steps: readonly PlanStep[];
  sourceWrites: readonly SourceWritePlan[];
  diagnostics: readonly string[];
  /** Bounded replace/augment/shadow provenance; never changes canonical steps. */
  capabilityPlugins?: Readonly<{
    stamps: readonly {
      pluginId: string;
      pluginVersion: string;
      capability: string;
      mode: string;
      external: boolean;
      network: boolean;
      metered: boolean;
      fallbackUsed?: boolean;
      model?: string;
    }[];
    classification: Readonly<{
      fallbackUsed: boolean;
      decisions: readonly {
        claimKey: string;
        lane: string;
        confidence: number;
      }[];
      shadowComparisons: readonly {
        pluginId: string;
        pluginVersion: string;
        capability: string;
        mode: string;
        external: boolean;
        network: boolean;
        metered: boolean;
        fallbackUsed?: boolean;
        model?: string;
        decisions: readonly {
          claimKey: string;
          lane: string;
          confidence: number;
        }[];
      }[];
    }> | null;
    ontology: Readonly<{
      replaced: boolean;
      matchCount: number;
      shadowMatchCount: number;
      shadowMatches: readonly {
        packId: string;
        schemaId: string;
        predicateName: string;
        confidence: number;
      }[];
    }>;
  }>;
}>;

export type SourceWritePlan = Readonly<{
  path: string;
  mode: "write" | "delete";
  beforeHash: string | null;
  afterHash: string | null;
  body?: string;
}>;

const AUTO_UPDATE_SCORE = 0.85;
const AUTO_UPDATE_MARGIN = 0.15;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function shortHash(value: unknown, length = 8): string {
  return hash(value).slice(0, length);
}

function slug(value: string): string {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return result || "intent";
}

function requiredIntent(args: CompileIntentArgs): string {
  const intent = text(args.intent);
  if (!intent)
    throw new Error("Compile intent failed: intent must be non-empty");
  if (args.mode !== "create" && args.mode !== "update") {
    throw new Error("Compile intent failed: mode must be create or update");
  }
  if (
    args.mode === "update" &&
    args.requirementId !== undefined &&
    !text(args.requirementId)
  ) {
    throw new Error(
      "Compile intent failed: requirementId must be non-empty when supplied",
    );
  }
  return intent;
}

function validateLocation(location: SourceLocation): void {
  if (
    !text(location.path) ||
    path.isAbsolute(location.path) ||
    location.path.split(/[\\/]/).includes("..")
  ) {
    throw new Error(
      "Compile intent failed: sourceLocations.path must be workspace-relative",
    );
  }
}

function mergeRelationships(
  rows: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${text(row.type)}\0${text(row.from)}\0${text(row.to)}`;
    if (!key.replace(/\0/g, "")) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeSteps(steps: readonly PlanStep[]): PlanStep[] {
  const merged = new Map<string, Record<string, unknown>>();
  for (const raw of steps) {
    const step = { ...raw };
    const type = text(step.type);
    const id = text(step.id);
    if (!type || !id) continue;
    const key = `${type}:${id}`;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, {
        ...step,
        ...(Array.isArray(step.relationships)
          ? {
              relationships: mergeRelationships(
                step.relationships.filter(isRecord),
              ),
            }
          : {}),
      });
      continue;
    }
    const properties = {
      ...(isRecord(previous.properties) ? previous.properties : {}),
      ...(isRecord(step.properties) ? step.properties : {}),
    };
    const relationships = mergeRelationships([
      ...(Array.isArray(previous.relationships)
        ? previous.relationships.filter(isRecord)
        : []),
      ...(Array.isArray(step.relationships)
        ? step.relationships.filter(isRecord)
        : []),
    ]);
    merged.set(key, { ...previous, ...step, properties, relationships });
  }
  // Steps apply in order and a relationship needs both endpoints, so order
  // by what links to what: tests before the scenarios that are verified_by
  // them, and the requirement (specified_by, requires_*) last.
  const rank = (step: Record<string, unknown>) =>
    ({ test: 1, scenario: 2, req: 3 })[text(step.type)] ?? 0;
  return [...merged.values()].sort(
    (left, right) =>
      rank(left) - rank(right) || text(left.id).localeCompare(text(right.id)),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// implements REQ-kibi-truthful-consistency
// Each advisor suggestion carries an inventory in which only its own clause is
// modeled, so merging suggestion steps left the requirement with whichever
// inventory came last (or none). The compiled plan already knows every
// proposition's final status: write that one inventory, and a logic_claims
// manifest covering every assertive proposition, onto the requirement step.
function withRequirementInventory(
  steps: readonly PlanStep[],
  requirementId: string,
  receipt: SemanticAdvisorReceipt,
  propositions: CompilePlanV1["propositions"],
): PlanStep[] {
  if (propositions.length === 0) return [...steps];
  const roles = new Map(
    receipt.propositions.map((proposition) => [
      proposition.claim_key,
      proposition.role,
    ]),
  );
  const inventory = propositions.map((proposition) => ({
    claim_key: proposition.claimKey,
    claim_text: proposition.text,
    role: roles.get(proposition.claimKey) ?? "descriptive",
    status: proposition.status,
    span: proposition.span,
  }));
  const logicClaims = propositions
    .filter((proposition) => proposition.status !== "nonlogical")
    .map((proposition) => proposition.claimKey);
  return steps.map((step) => {
    if (text(step.type) !== "req" || text(step.id) !== requirementId)
      return step;
    const properties = isRecord(step.properties) ? step.properties : {};
    return {
      ...step,
      properties: {
        ...properties,
        logic_claims: logicClaims,
        semantic_clauses: propositions.map((proposition) => proposition.text),
        semantic_inventory_version: receipt.inventory_contract.version,
        semantic_source_field: receipt.inventory_contract.source_field,
        semantic_source_hash: receipt.inventory_contract.source_hash,
        semantic_inventory: inventory,
      },
    };
  });
}

function propositionStatus(
  proposition: SemanticAdvisorReceipt["propositions"][number],
  suggestion: SemanticModelingSuggestion | undefined,
): CompilePlanV1["propositions"][number]["status"] {
  if (
    proposition.role === "rationale" ||
    proposition.role === "example" ||
    proposition.role === "subjective"
  ) {
    return "nonlogical";
  }
  if (suggestion?.kind === "ambiguity_observation") return "ambiguous";
  if (suggestion?.kind === "ontology_gap") return "ontology_gap";
  if (
    suggestion?.kind === "strict_property" ||
    suggestion?.kind === "predicate" ||
    suggestion?.kind === "rule"
  )
    return "modeled";
  if (proposition.status === "ambiguous") return "ambiguous";
  if (proposition.status === "ontology_gap" || proposition.status === "missing")
    return "ontology_gap";
  return proposition.status === "nonlogical" ? "nonlogical" : "modeled";
}

function propositionDisposition(
  proposition: SemanticAdvisorReceipt["propositions"][number],
  suggestion: SemanticModelingSuggestion | undefined,
): CompilePlanV1["propositions"][number]["disposition"] {
  if (
    proposition.role === "rationale" ||
    proposition.role === "example" ||
    proposition.role === "subjective"
  )
    return "nonlogical";
  if (suggestion?.kind === "strict_property") return "strict_property";
  if (suggestion?.kind === "predicate") return "predicate";
  if (suggestion?.kind === "rule") return "rule";
  return "observation";
}

function sourceFilesFor(
  locations: readonly SourceLocation[] | undefined,
): string[] {
  return Array.from(
    new Set(
      (locations ?? []).map((location) => location.path.trim()).filter(Boolean),
    ),
  ).sort();
}

async function sourceHashes(
  context: OperationContext,
  locations: readonly SourceLocation[] | undefined,
): Promise<Record<string, string | null>> {
  const hashes: Record<string, string | null> = {};
  for (const relative of sourceFilesFor(locations)) {
    try {
      const contents = context.fs
        ? await context.fs.readFile(path.join(context.workspaceRoot, relative))
        : null;
      hashes[relative] =
        contents === null
          ? null
          : createHash("sha256").update(contents).digest("hex");
    } catch {
      hashes[relative] = null;
    }
  }
  return hashes;
}

/**
 * A markdown source location may name the requirement's authored document.
 * Any other location is changed-code evidence and is never a write target.
 */
function requirementDocumentPath(
  locations: readonly SourceLocation[] | undefined,
): string | undefined {
  const explicit = locations?.[0]?.path?.trim().replaceAll("\\", "/");
  if (!explicit || !/\.(?:md|mdx)$/i.test(explicit)) return undefined;
  // Kibi owns the .kb layout: entities there live at their canonical path.
  if (explicit === ".kb" || explicit.startsWith(".kb/")) return undefined;
  return explicit;
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2
/**
 * Name the authored document every entity step writes, as `kb_upsert` would
 * choose it: the entity's existing authored document, else its canonical
 * `.kb/<lane>/<ID>.md` (the requirement may name its own markdown document).
 * `kb_apply_plan` renders each step's entity into its document and journals
 * the bytes with the rest of the plan. Without documents a plan's entities
 * lived only in the branch store and vanished on `kibi sync --rebuild` or a
 * fresh clone.
 *
 * The plan stays deterministic: it names targets and the requirement's body,
 * not bytes, because the document carries the origin the apply records.
 * Symbol steps keep the manifest path through `kb_upsert`, which also
 * refreshes their coordinates.
 */
async function withDocumentTargets(
  context: OperationContext,
  prolog: NonNullable<OperationContext["prolog"]>,
  steps: readonly PlanStep[],
  requirement: Readonly<{ id: string; body: string; path?: string }>,
  now: Date,
): Promise<PlanStep[]> {
  if (!context.fs) return [...steps];
  const targeted: PlanStep[] = [];
  for (const step of steps) {
    const type = text(step.type);
    const id = text(step.id);
    const properties = isRecord(step.properties) ? step.properties : {};
    if (type === "symbol" || Object.keys(properties).length === 0) {
      targeted.push(step);
      continue;
    }
    const stepDocument = isRecord(step.document) ? step.document : {};
    const document: { path?: string; body?: string } =
      type === "req" && id === requirement.id
        ? {
            body: requirement.body,
            ...(requirement.path !== undefined
              ? { path: requirement.path }
              : {}),
          }
        : typeof stepDocument.body === "string"
          ? { body: stepDocument.body.replace(/\n*$/, "\n") }
          : {};
    const input: UpsertInput = {
      type,
      id,
      properties,
      relationships: (Array.isArray(step.relationships)
        ? step.relationships.filter(isRecord)
        : []) as RelationshipInput[],
      document,
    };
    // An invalid entity or an unwritable document would fail the apply.
    const { entity } = validateUpsertInput(input, now);
    const [existing] =
      document.path === undefined
        ? await loadEntities(prolog, { id, type })
        : [];
    targeted.push({
      ...step,
      document: {
        ...document,
        path: canonicalSourcePath(context, input, entity, existing),
      },
    });
  }
  return targeted;
}

function generatedRequirementId(intent: string): string {
  return `REQ-${slug(intent)}-${shortHash(intent).toUpperCase()}`;
}

// implements REQ-kibi-truthful-consistency
/** Rolled-back staging goal for a plan's steps (see what_if_analysis/2). */
export function planWhatIfGoal(steps: readonly PlanStep[], now: Date): string {
  return buildWhatIfAnalysisGoal(
    steps.map((step) => {
      const relationships = (
        Array.isArray(step.relationships)
          ? step.relationships.filter(isRecord)
          : []
      ).map((relationship) => ({
        type: text(relationship.type),
        from: text(relationship.from),
        to: text(relationship.to),
      })) as RelationshipInput[];
      const properties = isRecord(step.properties) ? step.properties : {};
      if (Object.keys(properties).length === 0) {
        return {
          entity: { id: text(step.id), type: text(step.type) },
          relationships,
          skipContradictionCheck: true,
          relationshipsOnly: true,
        };
      }
      const validated = validateUpsertInput(
        {
          type: text(step.type),
          id: text(step.id),
          properties,
          relationships,
        },
        now,
      );
      return {
        entity: validated.entity,
        relationships: validated.relationships,
        skipContradictionCheck: true,
      };
    }),
  );
}

// implements REQ-kibi-truthful-consistency
export type WhatIfAnalysis = Readonly<{
  after: readonly ContradictionWitness[];
  introduced: readonly ContradictionWitness[];
  removed: readonly ContradictionWitness[];
  unchanged: readonly ContradictionWitness[];
}>;

function whatIfWitness(witness: Record<string, unknown>): ContradictionWitness {
  return {
    ...witness,
    requirements: Array.isArray(witness.requirements)
      ? witness.requirements.map((id) => normalizeEntityId(String(id)))
      : [],
    reason: text(witness.reason),
    status: text(witness.status) || "contradiction",
    ...(typeof witness.kind === "string" ? { kind: witness.kind } : {}),
  };
}

function whatIfWitnesses(value: unknown): ContradictionWitness[] {
  return (Array.isArray(value) ? value.filter(isRecord) : []).map(
    whatIfWitness,
  );
}

// implements REQ-kibi-truthful-consistency
/**
 * Parse checks:what_if_analysis_json/2 output. The binding is a quoted Prolog
 * string, so the JSON may arrive encoded once more as a JSON string. A bare
 * witness array (the what_if_contradiction_witnesses_json/2 shape) carries no
 * current-KB baseline, so every witness in it is treated as introduced.
 * Returns null when the output cannot be read.
 */
export function parseWhatIfAnalysis(raw: unknown): WhatIfAnalysis | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  } catch {
    return null;
  }
  if (Array.isArray(parsed)) {
    const after = whatIfWitnesses(parsed);
    return { after, introduced: after, removed: [], unchanged: [] };
  }
  if (!isRecord(parsed)) return null;
  return {
    after: whatIfWitnesses(parsed.after),
    introduced: whatIfWitnesses(parsed.introduced),
    removed: whatIfWitnesses(parsed.removed),
    unchanged: whatIfWitnesses(parsed.unchanged),
  };
}

// implements REQ-kibi-truthful-consistency
/** Blocking: a proven contradiction or an infeasible success scenario. */
export function isBlockingWitness(witness: ContradictionWitness): boolean {
  return witness.status === "contradiction" || witness.status === "infeasible";
}

// implements REQ-kibi-truthful-consistency
// Check the KB as it would be after this plan, not the KB as it is: stage every
// planned step in a rolled-back transaction and compare its contradiction and
// scenario-feasibility witnesses with the current KB's. Any witness the plan
// introduces counts, whichever requirements it names; a staged witness that
// already existed counts only when it names the target requirement. Rule
// overlap the checker can neither prove nor exclude stays unresolved rather
// than becoming consistency.
async function contradictionAnalysis(
  prolog: NonNullable<OperationContext["prolog"]>,
  requirementId: string,
  steps: readonly PlanStep[],
  now: Date,
): Promise<CompilePlanV1["contradictionAnalysis"]> {
  const unavailable = {
    outcome: "unresolved" as const,
    witnesses: [],
    introduced: [],
    removed: [],
    unchanged: [],
  };
  let goal: string;
  try {
    goal = planWhatIfGoal(steps, now);
  } catch {
    return unavailable;
  }
  const result = await prolog.query(goal);
  if (!result.success) return unavailable;
  const analysis = parseWhatIfAnalysis(result.bindings.JsonString);
  if (analysis === null) return unavailable;
  const witnesses = [
    ...analysis.introduced,
    ...analysis.unchanged.filter((witness) =>
      witness.requirements.includes(requirementId),
    ),
  ];
  const outcome = witnesses.some(isBlockingWitness)
    ? "conflict"
    : witnesses.length > 0
      ? "unresolved"
      : "no_conflict";
  return {
    outcome,
    witnesses,
    introduced: analysis.introduced,
    removed: analysis.removed,
    unchanged: analysis.unchanged,
  };
}

function proposalFor(
  requirementId: string,
  match: IntentSearchMatch,
): TraceabilityProposal | null {
  const candidateId = text(match.entity.id);
  const candidateType = text(match.entity.type);
  if (!candidateId || candidateType === "req") return null;
  const relationship =
    candidateType === "scenario"
      ? { from: requirementId, to: candidateId, type: "specified_by" }
      : candidateType === "symbol"
        ? { from: candidateId, to: requirementId, type: "implements" }
        : candidateType === "test"
          ? { from: candidateId, to: requirementId, type: "covered_by" }
          : null;
  if (!relationship) return null;
  const proposalId =
    `PROP-${shortHash({ candidateId, relationship })}`.toUpperCase();
  return {
    proposalId,
    candidateId,
    candidateType,
    relationship,
    confidence: match.score,
    evidence: match.reasons,
    decision: "pending",
  };
}

function applyAcceptedProposals(
  steps: readonly PlanStep[],
  proposals: readonly TraceabilityProposal[],
): PlanStep[] {
  const accepted = proposals.filter(
    (proposal) => proposal.decision === "accept",
  );
  if (accepted.length === 0) return [...steps];
  const byId = new Map<string, Record<string, unknown>>(
    steps.map((step) => [text(step.id), { ...step }]),
  );
  for (const proposal of accepted) {
    const targetId = proposal.relationship.from;
    const existing = byId.get(targetId);
    if (!existing) continue;
    const relationships = mergeRelationships([
      ...(Array.isArray(existing.relationships)
        ? existing.relationships.filter(isRecord)
        : []),
      proposal.relationship,
    ]);
    byId.set(targetId, { ...existing, relationships });
  }
  return mergeSteps([...byId.values()]);
}

function draftId(prefix: string, title: string, index: number): string {
  return `${prefix}-${slug(title)}-${shortHash(`${title}\0${index}`).toUpperCase()}`;
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2
function draftSteps(
  requirementId: string,
  scenarios: readonly ScenarioDraft[],
  tests: readonly TestDraft[],
): { steps: PlanStep[]; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const steps: PlanStep[] = [];
  const testSteps: PlanStep[] = [];
  const scenarioIds: string[] = [];
  // verified_by runs scenario -> test, and an upsert step may only carry
  // relationships from its own entity, so each scenario step carries the
  // links to its tests and the tests are written before it.
  const scenarioTests = new Map<string, string[]>();
  const linkedScenarioIds = new Set<string>();
  const duplicateScenarioIds = new Set<string>();
  const testIds = new Set<string>();
  scenarios.forEach((scenario, index) => {
    const id = text(scenario.id) || draftId("SCEN", scenario.title, index);
    if (scenarioIds.includes(id)) {
      duplicateScenarioIds.add(id);
      diagnostics.push(
        `unresolved duplicate scenario draft ID ${id}; scenario associations are ambiguous.`,
      );
    }
    scenarioIds.push(id);
    // The draft prose is document body, not an entity property: the entity
    // schema has no `body`, so carrying it in properties made every staged
    // what-if check and every apply of a plan with drafts fail validation.
    steps.push({
      type: "scenario",
      id,
      properties: {
        title: scenario.title.trim(),
        status: "draft",
        source: "mcp://kibi/compile-intent",
      },
      document: { body: scenario.body.trim() },
      relationships: [],
    });
  });
  tests.forEach((test, index) => {
    const id = text(test.id) || draftId("TEST", test.title, index);
    if (testIds.has(id)) {
      diagnostics.push(
        `unresolved duplicate test draft ID ${id}; test associations are ambiguous.`,
      );
    }
    testIds.add(id);
    const requestedScenarioIds = test.scenarioIds?.map(text) ?? null;
    const soleScenarioId =
      scenarioIds.length === 1 ? scenarioIds[0] : undefined;
    const associatedScenarioIds =
      requestedScenarioIds !== null
        ? Array.from(new Set(requestedScenarioIds.filter(Boolean)))
        : soleScenarioId !== undefined
          ? [soleScenarioId]
          : [];
    if (scenarioIds.length === 0) {
      diagnostics.push(
        `unresolved test draft ${id} has no scenario draft; proof-bearing tests require a scenario relationship.`,
      );
    } else if (requestedScenarioIds === null && scenarioIds.length > 1) {
      diagnostics.push(
        `unresolved test draft ${id} must declare scenarioIds when multiple scenario drafts exist; positional association is not supported.`,
      );
    } else if (
      requestedScenarioIds !== null &&
      associatedScenarioIds.length === 0
    ) {
      diagnostics.push(
        `unresolved test draft ${id} must reference at least one scenario ID in scenarioIds.`,
      );
    }
    if (
      requestedScenarioIds !== null &&
      (requestedScenarioIds.some((scenarioId) => !scenarioId) ||
        requestedScenarioIds.filter(Boolean).length !==
          associatedScenarioIds.length)
    ) {
      diagnostics.push(
        `unresolved test draft ${id} repeats or omits scenario IDs; associations must be unique and non-empty.`,
      );
    }
    const validScenarioIds = associatedScenarioIds.filter(
      (scenarioId) =>
        scenarioIds.includes(scenarioId) &&
        !duplicateScenarioIds.has(scenarioId),
    );
    for (const scenarioId of associatedScenarioIds) {
      if (!scenarioIds.includes(scenarioId)) {
        diagnostics.push(
          `unresolved test draft ${id} references unknown scenario ID ${scenarioId}.`,
        );
      }
    }
    for (const scenarioId of validScenarioIds) {
      linkedScenarioIds.add(scenarioId);
      scenarioTests.set(scenarioId, [
        ...(scenarioTests.get(scenarioId) ?? []),
        id,
      ]);
    }
    testSteps.push({
      type: "test",
      id,
      properties: {
        title: test.title.trim(),
        status: "draft",
        source: "mcp://kibi/compile-intent",
        verification_scope: test.verificationScope ?? "integration",
        verification_perspective: test.verificationPerspective ?? "internal",
      },
      document: { body: test.body.trim() },
      relationships: [],
    });
  });
  const scenarioSteps = steps.map((step) => ({
    ...step,
    relationships: (scenarioTests.get(text(step.id)) ?? []).map((to) => ({
      type: "verified_by",
      from: text(step.id),
      to,
    })),
  }));
  steps.splice(0, steps.length, ...testSteps, ...scenarioSteps);
  for (const scenarioId of scenarioIds) {
    if (!linkedScenarioIds.has(scenarioId)) {
      diagnostics.push(
        `unresolved scenario draft ${scenarioId} has no test draft; add a test with scenarioIds to establish executable coverage.`,
      );
    }
  }
  if (scenarioIds.length > 0) {
    steps.push({
      type: "req",
      id: requirementId,
      properties: {},
      relationships: scenarioIds.map((id) => ({
        type: "specified_by",
        from: requirementId,
        to: id,
      })),
    });
  }
  return { steps, diagnostics };
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export async function executeCompileIntent(
  args: CompileIntentArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: CompilePlanV1;
}> {
  const intent = requiredIntent(args);
  const prolog = context.prolog;
  if (!prolog) throw new Error("Compile intent requires a Prolog runtime");
  for (const location of args.sourceLocations ?? []) validateLocation(location);

  const statusResult = await executeStatus({}, context);
  const status = statusResult.structuredContent;
  if (!status)
    throw new Error("Compile intent failed: status query returned no payload");
  const snapshotEvidence = status?.proofSnapshot;
  const workspaceSnapshot: WorkspaceSnapshot = snapshotEvidence
    ? {
        version: "kibi.workspace-snapshot.v2",
        hash: snapshotEvidence,
        dirty: status?.proofSnapshotDirty ?? false,
        fileCount: status?.proofSnapshotFileCount ?? 0,
      }
    : {
        version: "kibi.workspace-snapshot.v2",
        hash: "unknown",
        dirty: true,
        fileCount: 0,
      };
  const search = await executeIntentSearch(
    {
      query: intent,
      type: "req",
      ...(args.semanticFacets ? { semanticFacets: args.semanticFacets } : {}),
      ...(args.sourceLocations
        ? { sourceLocations: args.sourceLocations }
        : {}),
      minScore: 0.05,
    },
    prolog,
    context.workspaceRoot,
  );
  const top = search.matches[0];
  const margin = search.analysis.topTwoMargin ?? 1;
  const explicitId = text(args.requirementId);
  let requirementId = explicitId;
  let selectionReason = explicitId
    ? "Caller supplied requirementId."
    : "Generated from intent content hash.";
  const diagnostics: string[] = [];
  if (args.mode === "update" && !explicitId) {
    if (top && top.score >= AUTO_UPDATE_SCORE && margin >= AUTO_UPDATE_MARGIN) {
      requirementId = text(top.entity.id);
      selectionReason = `Selected top requirement because score ${top.score.toFixed(3)} >= ${AUTO_UPDATE_SCORE.toFixed(2)} and margin ${margin.toFixed(3)} >= ${AUTO_UPDATE_MARGIN.toFixed(2)}.`;
    } else {
      requirementId = text(top?.entity.id) || "REQ-PENDING-RESOLUTION";
      diagnostics.push(
        "Update target is unresolved: supply requirementId or improve the top candidate score and margin.",
      );
    }
  }
  // A caller-chosen ID names the requirement by what it governs and wins;
  // the content-hash ID is only a fallback when none is supplied.
  if (args.mode === "create" && !explicitId)
    requirementId = generatedRequirementId(intent);
  if (!requirementId)
    throw new Error("Compile intent failed: could not determine requirementId");

  const existing = await loadEntities(prolog, {
    id: requirementId,
    type: "req",
  });
  if (args.mode === "create" && existing.length > 0) {
    const existingText =
      text(existing[0]?.semantic_text) || text(existing[0]?.title);
    if (existingText !== intent)
      diagnostics.push(
        `Generated requirement ID ${requirementId} already exists with different content; create is blocked.`,
      );
  }
  if (args.mode === "update" && !explicitId && diagnostics.length > 0) {
    diagnostics.push(
      "No mutation steps are emitted until the update target is explicitly resolved.",
    );
  }
  if (args.mode === "update" && explicitId && existing.length === 0)
    diagnostics.push(
      `Requirement ${requirementId} was not found in the current KB snapshot.`,
    );

  const existingEntity = existing[0] ?? {};
  const title =
    text(args.title) ||
    text(existingEntity.title) ||
    intent.split(/[.!?]/, 1)[0] ||
    intent;
  const requirementDocument = requirementDocumentPath(args.sourceLocations);
  const source =
    requirementDocument ??
    (text(existingEntity.source) || "mcp://kibi/compile-intent");
  const orchestrated = await analyzeSemanticAdvisorInputWithPlugins(
    {
      payload: {
        type: "req",
        id: requirementId,
        properties: {
          title,
          status: text(existingEntity.status) || "open",
          source,
          semantic_text: intent,
          ...(Array.isArray(existingEntity.logic_claims)
            ? { logic_claims: existingEntity.logic_claims }
            : {}),
        },
      },
      ...(args.clauses ? { clauses: args.clauses } : {}),
      ...(args.interpretations
        ? { interpretations: args.interpretations }
        : {}),
    },
    {
      operationName: "kb_compile_intent",
      ...(context.ensurePlugins
        ? { ensurePlugins: context.ensurePlugins }
        : {}),
    },
  );
  const advisor = orchestrated.analysis;
  diagnostics.push(...advisor.warnings);
  if (orchestrated.stamps.length > 0) {
    diagnostics.push(
      `Capability plugins consulted: ${orchestrated.stamps
        .map((stamp) => `${stamp.pluginId}/${stamp.capability}`)
        .join(", ")}.`,
    );
  }
  const semanticShadowCount =
    orchestrated.classification?.shadowComparisons.length ?? 0;
  if (semanticShadowCount > 0) {
    diagnostics.push(
      `Semantic classifier shadow comparisons observed (${semanticShadowCount}); canonical compile plan unchanged.`,
    );
  }
  if (orchestrated.ontologyShadowMatches.length > 0) {
    diagnostics.push(
      `Ontology pack shadow matches observed (${orchestrated.ontologyShadowMatches.length}); canonical compile plan unchanged.`,
    );
  }
  const capabilityPlugins =
    orchestrated.stamps.length > 0 ||
    semanticShadowCount > 0 ||
    orchestrated.ontologyShadowMatches.length > 0
      ? {
          stamps: orchestrated.stamps.map((stamp) =>
            publicCapabilityStamp(stamp),
          ),
          classification: orchestrated.classification
            ? {
                fallbackUsed: orchestrated.classification.fallbackUsed,
                decisions: orchestrated.classification.decisions.map(
                  (decision) => ({
                    claimKey: decision.claimKey,
                    lane: decision.lane,
                    confidence: decision.confidence,
                  }),
                ),
                shadowComparisons:
                  orchestrated.classification.shadowComparisons.map(
                    (comparison) => ({
                      ...publicCapabilityStamp(comparison.stamp),
                      decisions: comparison.decisions.map((decision) => ({
                        claimKey: decision.claimKey,
                        lane: decision.lane,
                        confidence: decision.confidence,
                      })),
                    }),
                  ),
              }
            : null,
          ontology: {
            replaced: orchestrated.ontologyCatalog?.replaced ?? false,
            matchCount: orchestrated.ontologyMatches.length,
            shadowMatchCount: orchestrated.ontologyShadowMatches.length,
            shadowMatches: orchestrated.ontologyShadowMatches.map(
              (candidate) => ({
                packId: candidate.packId,
                schemaId: candidate.schemaId,
                predicateName: candidate.predicateName,
                confidence: candidate.confidence,
              }),
            ),
          },
        }
      : undefined;
  const suggestionByClaim = new Map(
    advisor.receipt.suggestions.map((suggestion) => [
      suggestion.claim_key,
      suggestion,
    ]),
  );
  const propositions: CompilePlanV1["propositions"] =
    advisor.receipt.propositions.map((proposition) => {
      const suggestion = suggestionByClaim.get(proposition.claim_key);
      return {
        claimKey: proposition.claim_key,
        text: proposition.claim_text,
        span: proposition.span,
        disposition: propositionDisposition(proposition, suggestion),
        status: propositionStatus(proposition, suggestion),
        origin: args.interpretations?.some(
          (interpretation) =>
            interpretation.claim_key === proposition.claim_key,
        )
          ? ("host" as const)
          : ("deterministic" as const),
      };
    });
  const executableSuggestions = advisor.receipt.suggestions.filter(
    (suggestion) =>
      ["strict_property", "predicate", "rule"].includes(suggestion.kind),
  );
  const steps = mergeSteps([
    {
      type: "req",
      id: requirementId,
      properties: {
        title,
        status: text(existingEntity.status) || "open",
        source,
        semantic_text: intent,
      },
      relationships: [],
    },
    ...executableSuggestions.flatMap((suggestion) => [
      ...suggestion.applyPlan,
      ...(suggestion.kind === "predicate" || suggestion.kind === "rule"
        ? suggestion.relationshipPlan?.relationship
          ? [
              {
                type: "req",
                id: requirementId,
                properties: {},
                relationships: [suggestion.relationshipPlan.relationship],
              },
            ]
          : []
        : []),
    ]),
  ]);
  const stepsWithInventory = withRequirementInventory(
    steps,
    requirementId,
    advisor.receipt,
    propositions,
  );
  const drafts = draftSteps(
    requirementId,
    args.scenarioDrafts ?? [],
    args.testDrafts ?? [],
  );
  diagnostics.push(...drafts.diagnostics);
  const proposalDecisions = new Map(
    (args.proposalDecisions ?? []).map((decision) => [
      decision.proposalId,
      decision.decision,
    ]),
  );
  const proposals: TraceabilityProposal[] = search.matches
    .slice(0, 10)
    .flatMap((match) => {
      const proposal = proposalFor(requirementId, match);
      if (!proposal) return [];
      const decision = proposalDecisions.get(proposal.proposalId);
      return [
        {
          ...proposal,
          decision:
            decision === "accept" || decision === "reject"
              ? decision
              : "pending",
        },
      ];
    });
  // Merging folds the drafts' relationship-only requirement step (its
  // specified_by links) into the requirement step, which an upsert needs:
  // a step without properties fails entity validation.
  const stepsWithAcceptedProposals = applyAcceptedProposals(
    mergeSteps([...stepsWithInventory, ...drafts.steps]),
    proposals,
  );
  const contradictions = await contradictionAnalysis(
    prolog,
    requirementId,
    stepsWithAcceptedProposals,
    context.clock(),
  );
  if (contradictions.outcome === "conflict")
    diagnostics.push(
      contradictions.witnesses.some(
        (witness) => witness.kind === "scenario_feasibility",
      )
        ? "The plan leaves a success scenario infeasible or conflicts with a current requirement: set expects: rejection, correct the assumption, record an approved exception, or supersede the conflicting requirement before applying this plan."
        : "Current requirement conflicts must be resolved with an explicit supersedes relationship before applying this plan.",
    );
  if (contradictions.outcome === "unresolved")
    diagnostics.push(
      contradictions.witnesses.length > 0
        ? "Contradiction analysis is unresolved: the planned rules may overlap with current requirements and the checker can neither prove nor exclude a conflict."
        : "Contradiction analysis could not run against the attached KB snapshot with this plan staged.",
    );
  if (
    args.mode === "create" &&
    existing.length > 0 &&
    diagnostics.some((entry) =>
      entry.includes("already exists with different content"),
    )
  )
    diagnostics.push(
      "Change mode to update and supply requirementId to revise an existing requirement.",
    );

  const unresolved =
    propositions.some(
      (proposition) =>
        proposition.status === "ambiguous" ||
        proposition.status === "ontology_gap",
    ) ||
    diagnostics.some(
      (entry) =>
        entry.includes("unresolved") ||
        entry.includes("not found") ||
        entry.includes("different content"),
    );
  let statusValue: CompilePlanV1["status"] =
    contradictions.outcome === "conflict"
      ? "blocked"
      : unresolved
        ? "needs_resolution"
        : "ready";
  const sourceHashMap = await sourceHashes(context, args.sourceLocations);
  // Only a ready plan can be applied, so only a ready plan carries documents.
  // A step whose entity or document cannot be rendered would fail the apply,
  // so it makes the plan need resolution instead of reporting it ready.
  let planSteps = stepsWithAcceptedProposals;
  if (statusValue === "ready") {
    try {
      planSteps = await withDocumentTargets(
        context,
        prolog,
        stepsWithAcceptedProposals,
        {
          id: requirementId,
          body: `${intent.trim()}\n`,
          ...(requirementDocument !== undefined
            ? { path: requirementDocument }
            : {}),
        },
        context.clock(),
      );
    } catch (error) {
      statusValue = "needs_resolution";
      diagnostics.push(
        `A plan step cannot be applied as written: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const planBody = {
    version: COMPILE_PLAN_VERSION,
    status: statusValue,
    expected: {
      branch: status.branch,
      kbSnapshotId: status.snapshotId,
      workspaceSnapshot: workspaceSnapshot.hash,
      sourceHashes: sourceHashMap,
    },
    target: { mode: args.mode, requirementId, selectionReason },
    discovery: {
      candidates: search.matches,
      abstained: search.analysis.abstained,
    },
    propositions,
    contradictionAnalysis: contradictions,
    proposals,
    steps: planSteps,
    sourceWrites: [],
    diagnostics,
  };
  // Shadow/provenance metadata is returned for observation but must not enter
  // planHash — shadow providers never affect canonical apply identity.
  const plan: CompilePlanV1 = {
    ...planBody,
    ...(capabilityPlugins ? { capabilityPlugins } : {}),
    planHash: compilePlanHash(planBody),
  };
  return {
    content: [
      {
        type: "text",
        text: `Compiled ${intent.length} characters into ${statusValue} plan ${plan.planHash.slice(0, 12)} with ${planSteps.length} step(s).`,
      },
    ],
    structuredContent: plan,
  };
}
