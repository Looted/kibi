import type { OperationName } from "./public/operations/types.js";

export type CliOperationMetadata = {
  readonly name: OperationName;
  readonly cliName: string;
  readonly description: string;
};

// Keep CLI registration lightweight. The parity test compares this projection
// against the authoritative operation catalog so schema metadata cannot drift.
// implements REQ-test-journaled-engine-harness
export const CLI_OPERATION_METADATA = [
  {
    name: "kb_skills_list",
    cliName: "skills list",
    description:
      "List bundled Kibi agent skills available for progressive disclosure. Read-only; does not mutate the KB or require Prolog.",
  },
  {
    name: "kb_skills_load",
    cliName: "skills load",
    description:
      "Load a bundled Kibi agent skill by ID, returning its manifest metadata, Markdown body, declared resources, content hash, and source type. Read-only; does not execute scripts or require Prolog.",
  },
  {
    name: "kb_skills_read",
    cliName: "skills read",
    description:
      "Read a declared resource from a bundled Kibi agent skill. Resource paths are restricted to the skill manifest; arbitrary file paths are not exposed. Read-only; does not require Prolog.",
  },
  {
    name: "kb_query",
    cliName: "query",
    description:
      "Read entities from the KB with filters. Use for discovery and lookup before edits. Do not use for writes. No mutation side effects. Tags filter by metadata tags only, not entity IDs.",
  },
  {
    name: "kb_search",
    cliName: "search",
    description:
      "Search KB entities for discovery using legacy lexical ranking or deterministic intent-v1 ranking. Intent mode accepts host-agent semantic facets and source locations, returns evidence and abstains below its confidence threshold. Use for exploratory lookup before exact follow-up with kb_query. No mutation side effects.",
  },
  {
    name: "kb_status",
    cliName: "status",
    description:
      "Report current branch, KB snapshot, freshness metadata, schema status, and a typed kibi.migration-plan.v2 action graph. Read-only status inspection with no mutation side effects; damaged stores are diagnosed without starting the engine.",
  },
  {
    name: "kb_find_gaps",
    cliName: "find-gaps",
    description:
      "Run bulk missing/present relationship analysis over KB entities. Use for questions like which requirements lack scenarios or tests. No mutation side effects.",
  },
  {
    name: "kb_coverage",
    cliName: "coverage",
    description:
      "Generate curated structural coverage and conservative end-to-end requirement proof reports for requirements, symbols, or grouped types. Reports include the compatible repair plan plus typed kibi.migration-plan.v2 actions; semantic and E2E actions remain review/execution work. Paginated plans identify incomplete scope and no mutation occurs.",
  },
  {
    name: "kb_graph",
    cliName: "graph",
    description:
      "Run bounded graph traversal from one or more seed IDs across curated relationship types. No mutation side effects.",
  },
  {
    name: "kb_semantic_advisor",
    cliName: "semantic-advisor",
    description:
      "Analyze requirement prose without mutating the KB and return semantic advisor receipts with modeling suggestions. Use before constructing kb_upsert payloads when prose may contain machine-checkable logic. Suggestions can include strict-property facts, predicate facts, ambiguity observations, or ontology-gap observations; all suggestions are advisory and reviewable.",
  },
  {
    name: "kb_model_requirement",
    cliName: "model-requirement",
    description:
      "Convert a prose requirement plus optional extracted claim fields into a deterministic strict-lane write set. Read-only modeling returns a sequential applyPlan for later kb_upsert calls. High-confidence claims emit req+fact strict output; lower-confidence claims emit an observation review artifact. Includes migration warnings when legacy schemaVersion metadata is detected.",
  },
  {
    name: "kb_suggest_predicates",
    cliName: "suggest-predicates",
    description:
      "Suggest ontology predicate schemas for prose requirements before agents write facts. Retrieval/ranking is followed by a semantic applicability gate and conservative binding review; complete-looking generic placeholders never trigger application. Read-only guidance returns additive candidate diagnostics, an applicable predicate-fact plan only for a semantically eligible candidate with reviewed bindings, or an explicit ontology-gap observation plus a deterministic review-only predicate schema draft when no schema fits.",
  },
  {
    name: "kb_plan_bootstrap",
    cliName: "plan-bootstrap",
    description:
      "Generate a deterministic, snapshot-bound kibi.bootstrap-plan.v1 for repository onboarding. Read-only analysis returns evidence, bounded context questions, exact dependency-ordered actions, a canonical plan hash, and no mutation side effects.",
  },
  {
    name: "kb_validate_upsert",
    cliName: "validate-upsert",
    description:
      "Validate a kb_upsert payload without mutating the KB. Use this read-only preflight before kb_upsert, especially for requirements, because it returns schema/modeling errors plus semantic advisor receipts that identify prose likely needing kb_model_requirement, kb_suggest_predicates, ambiguity review, or an ontology-gap observation.",
  },
  {
    name: "kb_upsert",
    cliName: "upsert",
    description:
      "Create or update one entity and optional relationships. Use for KB mutations after validating intent; prefer kb_validate_upsert first because it returns semantic advisor receipts for prose-heavy requirements. Use kb_model_requirement before hand-writing strict property facts from prose, and kb_suggest_predicates before hand-writing ontology predicate facts. Use the `relationships` array for batch creation of multiple links in a single call (e.g., linking a requirement to multiple tests or facts). Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`, or `requires_predicate`) so consistency and contradiction checks remain queryable. Relationship endpoints must already exist in KB. For requirements, the write will be rejected if it contradicts existing current requirements that constrain the same subject with incompatible properties. To replace a conflicting requirement, include a `supersedes` relationship from the new requirement to the old one in the same request. Successful writes may return non-blocking semantic advisor warnings; inspect and repair those warnings before treating prose as contradiction-checkable. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates.",
  },
  {
    name: "kb_delete",
    cliName: "delete",
    description:
      "Delete entities by ID. Use only for intentional removals after dependency checks. Do not use as a bulk cleanup shortcut. Side effects: mutates and saves KB; skips entities with dependents.",
  },
  {
    name: "kb_check",
    cliName: "check",
    description:
      "Run KB validation rules and return violations, quality diagnostics, and typed kibi.migration-plan.v2 actions. Use before or after mutations and after source edits; checks remain read-only and never infer or apply actions from prose suggestions.",
  },
  {
    name: "kb_sparql_remote",
    cliName: "sparql-remote",
    description:
      "Opt-in remote SPARQL query tool for external HTTP(S) RDF endpoints. This does not query Kibi's local RDF store directly, stores no credentials, and depends on network availability.",
  },
  {
    name: "kb_compile_intent",
    cliName: "compile-intent",
    description:
      "Compile complete change intent into a deterministic, snapshot-bound read-only plan. Reuses intent-aware discovery and semantic modeling, accounts for every proposition, reports contradiction witnesses, proposes traceability links, and emits dependency-ordered kb_upsert-style steps only for resolved typed claims. No mutation side effects.",
  },
  {
    name: "kb_apply_plan",
    cliName: "apply-plan",
    description:
      "Apply an explicitly approved kibi.bootstrap-plan.v1, kibi.compile-plan.v1, kibi.migration-plan.v2, or entity-deletion plan after revalidating its canonical hash and live snapshots. Bootstrap actions are dependency-ordered, sequential, source-first, and recoverable from a typed journal.",
  },
  {
    name: "kb_ingest_verification",
    cliName: "ingest-verification",
    description:
      "Ingest a reporter-produced kibi.playwright-run.v1 artifact for a contracted test. Revalidates the live workspace snapshot, runner/command contract, required case/project coverage, and append-only receipt history before deriving and appending a kibi.verification-receipt.v2. It never accepts a caller-authored receipt or trusted outcome.",
  },
] as const satisfies readonly CliOperationMetadata[];

const METADATA_BY_NAME = new Map(
  CLI_OPERATION_METADATA.map((metadata) => [metadata.name, metadata]),
);

export function getCliOperationMetadata(
  name: OperationName,
): CliOperationMetadata {
  const metadata = METADATA_BY_NAME.get(name);
  if (metadata === undefined) {
    throw new RangeError(`Unknown Kibi CLI operation: ${name}`);
  }
  return metadata;
}

export function isOperationName(name: string): name is OperationName {
  return METADATA_BY_NAME.has(name as OperationName);
}
