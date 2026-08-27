import { createHash } from "node:crypto";
import path from "node:path";

import { dump as dumpYaml } from "js-yaml";
import {
  type IntentSearchFacets,
  type IntentSearchMatch,
  type SourceLocation,
  executeIntentSearch,
} from "../../intent-search.js";
import { parseTriples } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import { executeStatus } from "../../public/operations/discovery-executors.js";
import type {
  OperationContext,
  WorkspaceSnapshot,
} from "../../public/operations/runtime-types.js";
import { configuredSourceTarget } from "../mutation/source-authoring.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import { canonicalize } from "../semantic-advisor/shared.js";
import type {
  SemanticAdvisorReceipt,
  SemanticInterpretationInput,
  SemanticModelingSuggestion,
} from "../semantic-advisor/types.js";

// implements REQ-kibi-change-to-proof-plan-compiler
export const COMPILE_PLAN_VERSION = "kibi.compile-plan.v1" as const;

// implements REQ-kibi-change-to-proof-plan-compiler
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

// implements REQ-kibi-change-to-proof-plan-compiler
export type ScenarioDraft = Readonly<{
  id?: string;
  title: string;
  body: string;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler
export type TestDraft = Readonly<{
  id?: string;
  title: string;
  body: string;
  verificationScope?: "unit" | "integration" | "end_to_end";
  verificationPerspective?: "internal" | "consumer";
}>;

// implements REQ-kibi-change-to-proof-plan-compiler
export type ProposalDecision = Readonly<{
  proposalId: string;
  decision: "accept" | "reject";
}>;

// implements REQ-kibi-change-to-proof-plan-compiler
export type ContradictionWitness = Readonly<{
  requirements: readonly string[];
  reason: string;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler
export type TraceabilityProposal = Readonly<{
  proposalId: string;
  candidateId: string;
  candidateType: string;
  relationship: Readonly<{ from: string; to: string; type: string }>;
  confidence: number;
  evidence: readonly string[];
  decision: "pending" | "accept" | "reject";
}>;

// implements REQ-kibi-change-to-proof-plan-compiler
export type PlanStep = Readonly<Record<string, unknown>>;

// implements REQ-kibi-change-to-proof-plan-compiler
export function compilePlanHash(
  plan: Readonly<Record<string, unknown>>,
): string {
  const { planHash: _ignored, ...body } = plan;
  return hash(body);
}

// implements REQ-kibi-change-to-proof-plan-compiler
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
    witnesses: readonly ContradictionWitness[];
  };
  proposals: readonly TraceabilityProposal[];
  steps: readonly PlanStep[];
  sourceWrites: readonly SourceWritePlan[];
  diagnostics: readonly string[];
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
  return [...merged.values()].sort((left, right) => {
    const leftType = text(left.type) === "req" ? 1 : 0;
    const rightType = text(right.type) === "req" ? 1 : 0;
    return leftType - rightType || text(left.id).localeCompare(text(right.id));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function sourceTarget(
  context: OperationContext,
  locations: readonly SourceLocation[] | undefined,
  existingSource: string,
): string | undefined {
  const explicit = locations?.[0]?.path?.trim();
  if (explicit) return explicit.replaceAll("\\", "/");
  if (
    existingSource &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(existingSource) &&
    /\.(?:md|mdx|ya?ml)$/i.test(existingSource)
  )
    return existingSource.replaceAll("\\", "/");
  return configuredSourceTarget(context.workspaceRoot, "req");
}

async function sourceWritePlan(
  context: OperationContext,
  requirementId: string,
  title: string,
  intent: string,
  locations: readonly SourceLocation[] | undefined,
  existingSource: string,
  existingEntityExists: boolean,
): Promise<SourceWritePlan[]> {
  if (!context.fs) return [];
  if (
    existingEntityExists &&
    (locations === undefined || locations.length === 0) &&
    !existingSource.match(/\.(?:md|mdx|ya?ml|json)$/i)
  ) {
    return [];
  }
  const relative = sourceTarget(context, locations, existingSource);
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).includes("..")
  ) {
    return [];
  }
  const absolute = path.resolve(context.workspaceRoot, relative);
  const root = path.resolve(context.workspaceRoot);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`))
    return [];
  const workspaceRelative = path.relative(root, absolute);
  if (
    workspaceRelative === ".kb" ||
    workspaceRelative.startsWith(`.kb${path.sep}`)
  )
    return [];
  let before: string | undefined;
  try {
    before = await context.fs.readFile(absolute);
  } catch {
    before = undefined;
  }
  const frontmatter = `---\n${dumpYaml(
    { id: requirementId, title, type: "req", status: "open" },
    { noRefs: true, lineWidth: -1 },
  )}---\n`;
  const body = `${frontmatter}${intent.trim()}\n`;
  return [
    {
      path: relative,
      mode: "write",
      beforeHash:
        before === undefined
          ? null
          : createHash("sha256").update(before).digest("hex"),
      afterHash: createHash("sha256").update(body).digest("hex"),
      body,
    },
  ];
}

function generatedRequirementId(intent: string): string {
  return `REQ-${slug(intent)}-${shortHash(intent).toUpperCase()}`;
}

async function contradictionAnalysis(
  prolog: NonNullable<OperationContext["prolog"]>,
  requirementId: string,
): Promise<{
  outcome: "no_conflict" | "conflict" | "unresolved";
  witnesses: ContradictionWitness[];
}> {
  const result = await prolog.query(
    "findall([A,B,Reason], contradicting_reqs(A, B, Reason), Rows)",
  );
  if (!result.success) return { outcome: "unresolved", witnesses: [] };
  const rows = parseTriples(result.bindings.Rows ?? "[]");
  const witnesses = rows
    .filter(
      ([left, right]) => left === requirementId || right === requirementId,
    )
    .map(([left, right, reason]) => ({ requirements: [left, right], reason }));
  return {
    outcome: witnesses.length > 0 ? "conflict" : "no_conflict",
    witnesses,
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

function draftSteps(
  requirementId: string,
  scenarios: readonly ScenarioDraft[],
  tests: readonly TestDraft[],
): { steps: PlanStep[]; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const steps: PlanStep[] = [];
  const scenarioIds: string[] = [];
  scenarios.forEach((scenario, index) => {
    const id = text(scenario.id) || draftId("SCEN", scenario.title, index);
    scenarioIds.push(id);
    steps.push({
      type: "scenario",
      id,
      properties: {
        title: scenario.title.trim(),
        status: "draft",
        body: scenario.body.trim(),
        source: "mcp://kibi/compile-intent",
      },
      relationships: [],
    });
  });
  tests.forEach((test, index) => {
    const id = text(test.id) || draftId("TEST", test.title, index);
    if (scenarioIds.length === 0)
      diagnostics.push(
        `Test draft ${id} has no scenario draft; proof-bearing tests require a scenario relationship.`,
      );
    const scenarioId = scenarioIds[index] ?? scenarioIds[0];
    steps.push({
      type: "test",
      id,
      properties: {
        title: test.title.trim(),
        status: "draft",
        body: test.body.trim(),
        source: "mcp://kibi/compile-intent",
        verification_scope: test.verificationScope ?? "end_to_end",
        verification_perspective: test.verificationPerspective ?? "consumer",
      },
      relationships: scenarioId
        ? [{ type: "verified_by", from: scenarioId, to: id }]
        : [],
    });
  });
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

// implements REQ-kibi-change-to-proof-plan-compiler
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
  const snapshotEvidence = status?.verificationSnapshot;
  const workspaceSnapshot: WorkspaceSnapshot = snapshotEvidence
    ? {
        version: "kibi.workspace-snapshot.v2",
        hash: snapshotEvidence,
        dirty: status?.verificationSnapshotDirty ?? false,
        fileCount: status?.verificationSnapshotFileCount ?? 0,
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
  if (args.mode === "create") requirementId = generatedRequirementId(intent);
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
  const source =
    text(args.sourceLocations?.[0]?.path) ||
    text(existingEntity.source) ||
    "mcp://kibi/compile-intent";
  const advisor = analyzeSemanticAdvisorInput({
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
    ...(args.interpretations ? { interpretations: args.interpretations } : {}),
  });
  diagnostics.push(...advisor.warnings);
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
  const stepsWithAcceptedProposals = applyAcceptedProposals(
    [...steps, ...drafts.steps],
    proposals,
  );
  const contradictions = await contradictionAnalysis(prolog, requirementId);
  if (contradictions.outcome === "conflict")
    diagnostics.push(
      "Current requirement conflicts must be resolved with an explicit supersedes relationship before applying this plan.",
    );
  if (contradictions.outcome === "unresolved")
    diagnostics.push(
      "Contradiction analysis could not run against the attached KB snapshot.",
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
  const statusValue: CompilePlanV1["status"] =
    contradictions.outcome === "conflict"
      ? "blocked"
      : unresolved
        ? "needs_resolution"
        : "ready";
  const sourceHashMap = await sourceHashes(context, args.sourceLocations);
  const sourceWrites =
    statusValue === "ready"
      ? await sourceWritePlan(
          context,
          requirementId,
          title,
          intent,
          args.sourceLocations,
          source,
          existing.length > 0,
        )
      : [];
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
    steps: stepsWithAcceptedProposals,
    sourceWrites,
    diagnostics,
  };
  const plan: CompilePlanV1 = {
    ...planBody,
    planHash: compilePlanHash(planBody),
  };
  return {
    content: [
      {
        type: "text",
        text: `Compiled ${intent.length} characters into ${statusValue} plan ${plan.planHash.slice(0, 12)} with ${stepsWithAcceptedProposals.length} step(s).`,
      },
    ],
    structuredContent: plan,
  };
}
