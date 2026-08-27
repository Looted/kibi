# Domain Ontology Predicate Layer Implementation Plan

> **Archival note:** Agent operating guidance now lives in bundled Kibi skills (`kibi-usage`). Historical mentions of `docs/prompts/llm-rules.md` below are not current runbooks.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Kibi from a strict key/value contradiction checker into an alpha ontology substrate that can encode arbitrary domain knowledge as typed predicates, scoped rules, and fine-grained code-symbol evidence while preserving cheap rollback paths.

**Architecture:** Keep the eight existing entity types, but extend `fact` with a first-class predicate lane and add ontology contracts that define predicate signatures, argument types, rule bodies, and selection guidance. Preserve the current `subject`/`property_value` strict lane as a compatibility projection over the new predicate model, then upgrade checks, MCP modeling, and symbol traceability so agents must encode precise domain claims instead of prose or coarse file links. Because Kibi is still alpha, implement broader experiments behind explicit `ontology.alpha` and `traceability.strictGranularity` modes rather than removing them from the roadmap.

**Tech Stack:** TypeScript, Bun, JSON Schema, gray-matter, SWI-Prolog, RDF persistence, ts-morph, MCP tools.

---

## Problem statement

The current Kibi model can detect contradictions when two current requirements constrain the same `subject_key` and require incompatible values for the same `property_key`. That is useful but too narrow for the original ontology vision: an agent should be able to encode arbitrary domain predicates such as `role(admin, user)`, `owns(user123, post456)`, `component_supports(canvas_viewport, pan)`, or `requires_review(document) :- sensitive(document), state(document, draft)`.

This plan addresses four concrete failure modes:

1. **Closed predicate list is never exhaustive enough.** Kibi needs extensible project-local ontology contracts, not one global hard-coded vocabulary.
2. **Too many predicates overwhelm LLMs.** Kibi needs predicate discovery, ranking, namespace scoping, aliases, and guided modeling workflows.
3. **Agents dodge ontology work with prose.** Kibi needs checks and MCP responses that classify prose facts as review artifacts, not contradiction-ready ontology facts.
4. **Agents pass traceability with coarse symbol links.** Kibi needs function/interaction-level symbol extraction and semantic coverage checks that reward precise links like `pan`, `zoom`, and `select`, not whole-file links to generic requirements.

## Alpha stance after Oracle review

Oracle agreed that first-class predicate ontology support strengthens Kibi’s vision when framed as **project-local, agent-guided domain modeling for software traceability**, not as a generic public ontology engine. The conservative recommendation was to ship only predicate schemas/facts first and defer rules and aggressive traceability.

For this alpha branch, we intentionally go broader, but with guardrails:

- Implement broad capability as **opt-in alpha surfaces**, not default hard gates.
- Keep direct predicate facts and predicate discovery as the stable center.
- Add rule facts and derived contradictions only as explainable, bounded, audit-first checks until proof chains are trustworthy.
- Make aggressive symbol granularity checks configurable and easy to downgrade.
- Treat all prose-heavy normative modeling as lower quality than predicate modeling; agents should have to explicitly mark prose as an observation/review artifact.

The product bet is that alpha should expose the sharp edges early. If rule inference or strict symbol granularity is noisy, we downscale based on real data instead of never testing the idea.

## Predicate selection workflow

Agents must not browse or invent from the full ontology. The intended workflow is:

1. Agent calls `kb_ontology_predicates` with requirement text, source path, nearby symbols, existing related requirements/facts, and optional namespace hints.
2. Tool returns at most 3–5 candidates with signature, examples, aliases, argument types, confidence, and “use when / do not use when” guidance.
3. Agent either selects a candidate, creates a new `predicate_schema`, or emits an `observation` fact tagged `review:ontology-gap`.
4. `kb_check` reports ontology-readiness and predicate-selection quality so prose shortcuts are visible.

This makes predicate selection a product workflow, not a documentation suggestion.

## File map

### Core Prolog schema and inference

- Modify: `packages/core/schema/entities.pl` — add predicate/rule/ontology fact fields while keeping entity type `fact`.
- Modify: `packages/core/schema/relationships.pl` — add ontology relationship types such as `uses_predicate`, `defines_rule`, `derives`, `contradicts`, and symbol-level semantic links.
- Modify: `packages/core/schema/validation.pl` — validate predicate fact shapes, rule shapes, argument arrays, namespaces, and lane compatibility.
- Modify: `packages/core/src/kb.pl` — persist predicate/rule fields, expose predicate matching, rule expansion, contradiction predicates, and ontology coverage predicates.
- Modify: `packages/core/src/checks.pl` — add ontology checks: predicate shape, undefined predicate usage, prose-only normative requirement, ontology coverage, coarse symbol link, and ambiguous predicate selection.
- Modify: `packages/core/tests/schema.plt` — Prolog schema tests for predicate/rule shape validation.
- Modify: `packages/core/tests/kb.plt` — Prolog inference tests for predicate matching, derived facts, contradiction detection, and fine-grained symbol checks.

### CLI/public schemas, extractors, and modeling utilities

- Modify: `packages/cli/src/types/entities.ts` — add TypeScript fields for predicate facts and ontology contracts.
- Modify: `packages/cli/src/schemas/entity.schema.json` — mirror the public entity JSON Schema.
- Modify: `packages/cli/src/public/schemas/entity.ts` — update runtime/public entity schema exports.
- Modify: `packages/cli/src/utils/strict-modeling.ts` — split current `SemanticClaim` into predicate-aware `OntologyClaim` and compatibility strict-claim projection.
- Create: `packages/cli/src/utils/ontology-contract.ts` — parse, normalize, rank, and validate project-local predicate contracts.
- Create: `packages/cli/src/utils/predicate-selection.ts` — choose/rank predicates for LLM guidance using namespace, aliases, argument compatibility, and source context.
- Modify: `packages/cli/src/extractors/markdown.ts` — preserve predicate/rule frontmatter and ontology contract docs.
- Modify: `packages/cli/src/extractors/relationships.ts` — import predicate-specific links and symbol semantic links.
- Modify: `packages/cli/src/extractors/symbols-coordinator.ts` — carry granular symbol roles, parent symbols, and interaction/action metadata.
- Modify: `packages/cli/src/extractors/symbols-ts.ts` — extract exported functions, exported class methods, unique internal helpers, event handlers, callbacks, and interaction methods as addressable symbols.
- Modify: `packages/cli/src/traceability/validate.ts` — report coarse file/module links and require fine-grained links for changed nested symbols when available.
- Modify: `packages/cli/tests/schemas.test.ts` — schema tests for predicate/rule fields.
- Modify: `packages/cli/tests/utils/strict-modeling.test.ts` — compatibility projection and predicate claim tests.
- Create: `packages/cli/tests/utils/ontology-contract.test.ts` — ontology contract parsing/ranking tests.
- Create: `packages/cli/tests/utils/predicate-selection.test.ts` — predicate selection overload tests.
- Modify: `packages/cli/tests/extractors/markdown.test.ts` — round-trip predicate/rule fields.
- Modify: `packages/cli/tests/extractors/relationships.test.ts` — relationship extraction for ontology links.
- Modify: `packages/cli/tests/extractors/symbols-ts.test.ts` — fine-grained symbol extraction tests for component interactions.
- Modify: `packages/cli/tests/traceability/validate.test.ts` — staged traceability quality tests.

### MCP tools and agent-facing guidance

- Modify: `packages/mcp/src/tools/model-requirement.ts` — accept predicate claims/rules and return ontology-aware apply plans.
- Create: `packages/mcp/src/tools/model-ontology-claim.ts` — deterministic modeling tool for arbitrary domain facts and rules.
- Create: `packages/mcp/src/tools/ontology-predicates.ts` — list/rank allowed predicates for a source/query context.
- Modify: `packages/mcp/src/tools/upsert.ts` — validate predicate/rule lane relationships and reject contradiction-ready prose shortcuts when strict mode is requested.
- Modify: `packages/mcp/src/tools/check.ts` — expose new ontology check rules.
- Modify: `packages/mcp/src/tools-config.ts` — document new tool schemas and checks.
- Modify: `packages/mcp/tests/tools/model-requirement.test.ts` — ensure old strict requirement modeling still works.
- Create: `packages/mcp/tests/tools/model-ontology-claim.test.ts` — predicate/rule apply-plan tests.
- Create: `packages/mcp/tests/tools/ontology-predicates.test.ts` — predicate discovery/ranking tests.
- Modify: `packages/mcp/tests/tools/upsert-contradictions.test.ts` — predicate contradiction tests and compatibility strict-lane tests.
- Modify: `packages/mcp/tests/tools/check.test.ts` — ontology check rule tests.

### Documentation, guidance, release metadata

- Modify: `docs/entity-schema.md` — document predicate lane, rule lane, ontology contracts, and migration rules.
- Modify: `docs/inference-rules.md` — document predicate/rule inference, contradiction semantics, and explicit non-goals.
- Modify: `docs/mcp-reference.md` — document new MCP tools and updated `kb_upsert` semantics.
- Modify: `docs/prompts/llm-rules.md` — instruct agents to select ontology predicates before writing prose facts.
- Modify: `docs/symbol-traceability-taxonomy.md` — define symbol granularity tiers and accepted evidence quality.
- Modify: `AGENTS.md` — update modeling rules and symbol traceability standard.
- Create: `docs/examples/ontology-contract.md` — example project-local ontology contract.
- Create: `docs/examples/ontology-front-end-interactions.md` — pan/zoom/select component example.
- Create: `.changeset/domain-ontology-predicate-layer.md` — release metadata for `kibi-core`, `kibi-cli`, and `kibi-mcp`.

## New ontology model

Keep `fact` as the storage entity. Add three new `fact_kind` values:

- `predicate_schema` — defines one allowed predicate signature.
- `predicate` — asserts one ground predicate fact.
- `rule` — defines one named rule whose head and body are predicate expressions.

Do **not** add a ninth entity type in this pass. Existing `subject`, `property_value`, `observation`, and `meta` continue to work. `subject` and `property_value` become a compatibility projection that can be represented internally as predicate facts when desired.

### Proposed fact fields

Add optional fact-only fields:

```ts
interface PredicateSchemaFields {
  fact_kind: "predicate_schema";
  predicate_name: string;           // e.g. "can", "owns", "supports_interaction"
  predicate_namespace?: string;     // e.g. "auth", "editor", "billing"
  predicate_arity: number;          // 1..8 for v1
  argument_names: string[];         // ["actor", "action", "resource"]
  argument_types: string[];         // ["role", "action", "resource"]
  argument_descriptions?: string[];
  aliases?: string[];               // LLM-friendly names
  examples?: string[];              // serialized examples
  exclusive_with?: string[];        // predicate names or canonical signatures
  inverse_of?: string;
  transitive?: boolean;
  symmetric?: boolean;
  default_polarity?: "assert" | "deny";
  ontology_version?: string;
}

interface PredicateFactFields {
  fact_kind: "predicate";
  predicate_name: string;
  predicate_namespace?: string;
  predicate_args: string[];
  argument_types?: string[];
  polarity?: "assert" | "deny";
  confidence?: number;
  closed_world?: boolean;
  scope?: string;
  valid_from?: string;
  valid_to?: string;
  canonical_key: string;
}

interface RuleFactFields {
  fact_kind: "rule";
  rule_name: string;
  rule_head: string;                // serialized predicate expression
  rule_body: string[];              // serialized predicate expressions
  rule_safety: "safe" | "review";
  rule_priority?: number;
  ontology_version?: string;
  canonical_key: string;
}
```

Use JSON/YAML arrays in markdown and serialize to Prolog/RDF as list-compatible values. If Prolog list round-tripping proves risky, store `predicate_args_json`, `argument_types_json`, `rule_body_json` as strings for the first implementation slice, then add typed list support later.

## Traceability quality model

Add symbol granularity tiers:

- `module` — whole file/module; acceptable only for architecture/package requirements.
- `component` — exported component/class/function.
- `interaction` — method/handler/action such as `pan`, `zoom`, `select`, `submit`, `drag`.
- `helper` — internal function with unique behavior.
- `test_case` — test symbol executable for one test entity.

Add symbol fields:

```ts
interface SymbolSemanticFields {
  granularity?: "module" | "component" | "interaction" | "helper" | "test_case";
  parent_symbol?: string;
  interaction_kind?: string;
  semantic_summary?: string;
  ontology_predicates?: string[];
}
```

Add checks that warn when a changed file has extractable function/method symbols but only the module/file symbol has `implements`. This should be audit-first initially, then configurable as a hard gate.

---

### Task 1: Add release metadata and schema red tests

**Files:**
- Create: `.changeset/domain-ontology-predicate-layer.md`
- Modify: `packages/cli/tests/schemas.test.ts`
- Modify: `packages/core/tests/schema.plt`

- [ ] **Step 1: Create the changeset stub**

```md
---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

Kibi can now model arbitrary domain ontology predicates and rules in addition to strict key/value requirements. This gives teams a path from prose-heavy memory toward queryable domain facts, while preserving existing requirements, facts, and traceability workflows.

Add predicate schema, predicate fact, and rule fact modeling fields; add ontology checks and MCP modeling tools; improve symbol traceability guidance for function-level behavior.
```

- [ ] **Step 2: Add failing JSON schema tests**

In `packages/cli/tests/schemas.test.ts`, add cases that validate:

```ts
const predicateSchemaFact = {
  id: "FACT-SCHEMA-CAN",
  type: "fact",
  title: "Predicate schema: can/3",
  status: "active",
  created_at: "2026-05-30T00:00:00Z",
  updated_at: "2026-05-30T00:00:00Z",
  source: "docs/ontology/auth.md",
  fact_kind: "predicate_schema",
  predicate_name: "can",
  predicate_namespace: "auth",
  predicate_arity: 3,
  argument_names: ["actor", "action", "resource"],
  argument_types: ["role", "action", "resource"],
  aliases: ["is allowed to", "may"],
};

const predicateFact = {
  id: "FACT-CAN-USER-DELETE-POST",
  type: "fact",
  title: "User can delete post",
  status: "active",
  created_at: "2026-05-30T00:00:00Z",
  updated_at: "2026-05-30T00:00:00Z",
  source: "docs/requirements/posts.md",
  fact_kind: "predicate",
  predicate_name: "can",
  predicate_namespace: "auth",
  predicate_args: ["user", "delete", "post"],
  argument_types: ["role", "action", "resource"],
  polarity: "assert",
  canonical_key: "auth.can.role:user.action:delete.resource:post.assert",
};
```

Assertions:
- `predicate_schema` requires `predicate_name`, `predicate_arity`, `argument_names`, and `argument_types`.
- `predicate` requires `predicate_name`, `predicate_args`, and `canonical_key`.
- `rule` requires `rule_name`, `rule_head`, `rule_body`, and `rule_safety`.
- Non-`fact` entities reject predicate-only fields.
- `predicate_args.length` must equal schema arity when a schema is available in Prolog checks, not JSON Schema.

- [ ] **Step 3: Add failing Prolog schema tests**

In `packages/core/tests/schema.plt`, add tests for `validate_entity(fact, Props)` accepting the new lanes and rejecting malformed predicate facts.

- [ ] **Step 4: Run tests and confirm red**

Run: `bun test packages/cli/tests/schemas.test.ts && swipl -q -g "load_test_files([]),run_tests" -t halt packages/core/tests/schema.plt`

Expected: FAIL because schemas do not yet recognize predicate/rule fields.

### Task 2: Implement predicate/rule schema support

**Files:**
- Modify: `packages/cli/src/types/entities.ts`
- Modify: `packages/cli/src/schemas/entity.schema.json`
- Modify: `packages/cli/src/public/schemas/entity.ts`
- Modify: `packages/core/schema/entities.pl`
- Modify: `packages/core/schema/validation.pl`
- Modify: `packages/cli/schema/entities.pl` if present in this branch
- Modify: `packages/cli/schema/validation.pl` if present in this branch

- [ ] **Step 1: Extend TypeScript entity fields**

Add predicate/rule fields to `FactFields` only. Do not add them to `BaseEntity`.

- [ ] **Step 2: Extend JSON schemas**

Add enum values to `fact_kind`: `predicate_schema`, `predicate`, `rule`. Add arrays with string item types for `argument_names`, `argument_types`, `aliases`, `examples`, `exclusive_with`, `predicate_args`, `rule_body`.

- [ ] **Step 3: Extend Prolog entity properties**

In `packages/core/schema/entities.pl`, add:

```prolog
entity_property(fact, predicate_name, string).
entity_property(fact, predicate_namespace, string).
entity_property(fact, predicate_arity, integer).
entity_property(fact, argument_names, list).
entity_property(fact, argument_types, list).
entity_property(fact, argument_descriptions, list).
entity_property(fact, aliases, list).
entity_property(fact, examples, list).
entity_property(fact, exclusive_with, list).
entity_property(fact, inverse_of, string).
entity_property(fact, transitive, boolean).
entity_property(fact, symmetric, boolean).
entity_property(fact, default_polarity, atom).
entity_property(fact, ontology_version, string).
entity_property(fact, predicate_args, list).
entity_property(fact, rule_name, string).
entity_property(fact, rule_head, string).
entity_property(fact, rule_body, list).
entity_property(fact, rule_safety, atom).
entity_property(fact, rule_priority, integer).
```

- [ ] **Step 4: Add shape validation**

In `packages/core/schema/validation.pl`, validate required fields by `fact_kind`. Keep legacy facts without `fact_kind` valid.

- [ ] **Step 5: Run tests and confirm green**

Run: `bun test packages/cli/tests/schemas.test.ts && swipl -q -g "load_test_files([]),run_tests" -t halt packages/core/tests/schema.plt`

Expected: PASS.

### Task 3: Add ontology contract parsing and predicate selection

**Files:**
- Create: `packages/cli/src/utils/ontology-contract.ts`
- Create: `packages/cli/src/utils/predicate-selection.ts`
- Create: `packages/cli/tests/utils/ontology-contract.test.ts`
- Create: `packages/cli/tests/utils/predicate-selection.test.ts`

- [ ] **Step 1: Write contract parser tests**

Test a contract made from `predicate_schema` facts:

```ts
expect(parseOntologyContract([canSchema, ownsSchema])).toMatchObject({
  predicates: [
    {
      name: "can",
      namespace: "auth",
      arity: 3,
      argumentNames: ["actor", "action", "resource"],
      aliases: ["may", "is allowed to"],
    },
  ],
});
```

- [ ] **Step 2: Write predicate ranking tests**

Test that the selector returns a small ranked shortlist, not the whole ontology:

```ts
const ranked = rankPredicates({
  text: "Users can delete posts",
  source: "docs/requirements/posts.md",
  namespaceHint: "auth",
  predicates: contract.predicates,
});
expect(ranked.slice(0, 2).map((p) => p.name)).toEqual(["can", "owns"]);
expect(ranked).toHaveLength(5);
```

- [ ] **Step 3: Implement parser**

Normalize predicate names, namespaces, aliases, arity, and argument type arrays. Reject duplicate canonical signatures unless same schema ID supersedes the old one.

- [ ] **Step 4: Implement ranking**

Scoring inputs:
- source path namespace match,
- alias/name lexical overlap,
- argument type hints,
- recent project usage count,
- exact examples match.

Return at most 5 predicates by default.

- [ ] **Step 5: Run tests**

Run: `bun test packages/cli/tests/utils/ontology-contract.test.ts packages/cli/tests/utils/predicate-selection.test.ts`

Expected: PASS.

### Task 4: Add Prolog predicate facts and rule inference primitives

**Files:**
- Modify: `packages/core/src/kb.pl`
- Modify: `packages/core/src/checks.pl`
- Modify: `packages/core/tests/kb.plt`

- [ ] **Step 1: Write failing predicate fact query tests**

Add tests that assert these facts can be queried from stored `fact_kind=predicate` entities:

```prolog
predicate_fact('FACT-CAN-USER-DELETE-POST', auth, can, [user, delete, post], assert).
predicate_schema('FACT-SCHEMA-CAN', auth, can, 3, [actor, action, resource], [role, action, resource]).
```

- [ ] **Step 2: Implement `predicate_schema/6` and `predicate_fact/5`**

Use existing `kb_entity/3` property list helpers and `normalize_term_atom/2`. Do not evaluate arbitrary Prolog from stored strings.

- [ ] **Step 3: Write failing rule expansion tests**

Start with safe, non-recursive Horn-style rules stored as data, not executable Prolog text. Example serialized rule:

```text
head: auth.can(?child, ?action, ?resource)
body:
  - core.is_a(?child, ?parent)
  - auth.can(?parent, ?action, ?resource)
```

Test that `derived_predicate_fact(core, is_a, [admin, user])` plus `auth.can(user, delete, post)` derives `auth.can(admin, delete, post)`.

- [ ] **Step 4: Implement a minimal safe rule interpreter**

Support only:
- variables prefixed with `?`,
- conjunction bodies,
- exact predicate matching,
- max depth 3 for v1,
- no negation as failure,
- no arbitrary Prolog execution.

- [ ] **Step 5: Run Prolog tests**

Run: `swipl -q -g "load_test_files([]),run_tests" -t halt packages/core/tests/kb.plt`

Expected: PASS.

### Task 5: Generalize contradiction checks from property tuples to predicate tuples

**Files:**
- Modify: `packages/core/src/kb.pl`
- Modify: `packages/core/src/checks.pl`
- Modify: `packages/mcp/tests/tools/upsert-contradictions.test.ts`
- Modify: `packages/core/tests/kb.plt`

- [ ] **Step 1: Write direct predicate contradiction tests**

Create two requirements linked to predicate facts:

- `auth.can(user, delete, post)` with `polarity=assert`
- `auth.can(user, delete, post)` with `polarity=deny`

Expected: `contradicting_reqs/3` succeeds.

- [ ] **Step 2: Write derived contradiction tests**

Create:
- `core.is_a(admin, user)`
- rule: `auth.can(?child, ?action, ?resource) :- core.is_a(?child, ?parent), auth.can(?parent, ?action, ?resource)`
- `auth.can(user, delete, post)` assert
- `auth.can(admin, delete, post)` deny

Expected: contradiction succeeds only when the rule is active and safe.

- [ ] **Step 3: Add relationship support**

In `packages/core/schema/relationships.pl`, add:

```prolog
relationship_type(asserts_predicate).
relationship_type(requires_predicate).
relationship_type(uses_predicate).
relationship_type(defines_rule).
valid_relationship(asserts_predicate, req, fact).
valid_relationship(requires_predicate, req, fact).
valid_relationship(uses_predicate, fact, fact).
valid_relationship(defines_rule, fact, fact).
```

Keep `constrains` and `requires_property` unchanged.

- [ ] **Step 4: Implement predicate contradiction path**

Add `effective_req_predicate_fact/6` and include it in `contradicting_reqs/3`. Existing strict property conflict remains as compatibility path.

- [ ] **Step 5: Run tests**

Run: `bun test packages/mcp/tests/tools/upsert-contradictions.test.ts && swipl -q -g "load_test_files([]),run_tests" -t halt packages/core/tests/kb.plt`

Expected: PASS.

### Task 6: Make prose facts audit-only unless explicitly declared ontology facts

**Files:**
- Modify: `packages/core/src/checks.pl`
- Modify: `packages/mcp/src/tools/upsert.ts`
- Modify: `packages/mcp/tests/tools/check.test.ts`
- Modify: `packages/mcp/tests/tools/upsert.test.ts`
- Modify: `docs/prompts/llm-rules.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write check tests for prose workarounds**

Test cases:
- A requirement linked only to legacy/prose facts reports `ontology-readiness: prose-only`.
- A normative requirement with `tags: ["lane:ontology"]` but no predicate facts fails `ontology-req-predicate-pairing`.
- `observation` and `meta` remain non-blocking.

- [ ] **Step 2: Add check predicates**

In `checks.pl`, add exported checks:
- `check_ontology_fact_shape/1`
- `check_ontology_req_predicate_pairing/1`
- `check_ontology_readiness/1`
- `check_predicate_schema_usage/1`

- [ ] **Step 3: Update `kb_upsert` validation**

If a req has `tags` containing `lane:ontology`, require same-call or existing `asserts_predicate`/`requires_predicate` links. Keep non-ontology requirements permissive for migration.

- [ ] **Step 4: Update agent guidance**

In `docs/prompts/llm-rules.md` and `AGENTS.md`, state:

> Normative domain claims must be modeled as predicate facts or strict property facts. Prose facts are allowed only as `observation`/`meta` evidence and do not satisfy ontology readiness.

- [ ] **Step 5: Run tests**

Run: `bun test packages/mcp/tests/tools/check.test.ts packages/mcp/tests/tools/upsert.test.ts`

Expected: PASS.

### Task 7: Add MCP ontology modeling and predicate discovery tools

**Files:**
- Create: `packages/mcp/src/tools/model-ontology-claim.ts`
- Create: `packages/mcp/src/tools/ontology-predicates.ts`
- Modify: `packages/mcp/src/server/tools.ts`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/src/tools/model-requirement.ts`
- Create: `packages/mcp/tests/tools/model-ontology-claim.test.ts`
- Create: `packages/mcp/tests/tools/ontology-predicates.test.ts`
- Modify: `packages/mcp/tests/server/tools-coverage.test.ts`

- [ ] **Step 1: Write `kb_ontology_predicates` tests**

Expected tool output:

```json
{
  "query": "user can delete post",
  "predicates": [
    {
      "name": "can",
      "namespace": "auth",
      "arity": 3,
      "argumentNames": ["actor", "action", "resource"],
      "score": 0.92,
      "why": ["alias match: can", "source namespace: auth"]
    }
  ]
}
```

- [ ] **Step 2: Write `kb_model_ontology_claim` tests**

Tool input:

```json
{
  "text": "Users can delete posts.",
  "predicate": "auth.can",
  "args": ["user", "delete", "post"],
  "polarity": "assert",
  "source": "docs/requirements/posts.md",
  "confidence": 0.9
}
```

Expected apply plan creates:
- predicate fact,
- requirement,
- `requires_predicate` relation,
- no prose-only fact.

- [ ] **Step 3: Implement discovery tool**

Use `ontology-contract.ts` and `predicate-selection.ts`. Return at most 5 candidates by default.

- [ ] **Step 4: Implement modeling tool**

Validate selected predicate against schema arity and argument types. If confidence < 0.7, emit an `observation` fact with `review:ontology` instead of strict ontology write set.

- [ ] **Step 5: Update existing `kb_model_requirement`**

Keep existing subject/property behavior. Add optional `predicate`, `args`, and `polarity` fields that delegate to `kb_model_ontology_claim` when provided.

- [ ] **Step 6: Run MCP tests**

Run: `bun test packages/mcp/tests/tools/model-ontology-claim.test.ts packages/mcp/tests/tools/ontology-predicates.test.ts packages/mcp/tests/tools/model-requirement.test.ts packages/mcp/tests/server/tools-coverage.test.ts`

Expected: PASS.

### Task 8: Improve symbol extraction to interaction granularity

**Files:**
- Modify: `packages/cli/src/extractors/symbols-coordinator.ts`
- Modify: `packages/cli/src/extractors/symbols-ts.ts`
- Modify: `packages/cli/tests/extractors/symbols-ts.test.ts`
- Modify: `packages/cli/tests/traceability/symbol-extract.test.ts`
- Modify: `docs/symbol-traceability-taxonomy.md`

- [ ] **Step 1: Write extraction fixture for a frontend component**

Create a test fixture component with:

```ts
export function CanvasViewport() {
  function handlePan(delta: Point) { /* ... */ }
  function handleZoom(scale: number) { /* ... */ }
  function handleSelect(id: string) { /* ... */ }
  return null;
}
```

Expected extracted symbols:
- `CanvasViewport` with `granularity=component`
- `CanvasViewport.handlePan` with `granularity=interaction`, `parent_symbol=CanvasViewport`, `interaction_kind=pan`
- `CanvasViewport.handleZoom` with `granularity=interaction`, `interaction_kind=zoom`
- `CanvasViewport.handleSelect` with `granularity=interaction`, `interaction_kind=select`

- [ ] **Step 2: Extend `SourceSymbolKind` and analysis result**

Add `method`, `callback`, `interaction`, and `component` where appropriate. Preserve old kinds for backwards compatibility.

- [ ] **Step 3: Extract nested interaction functions**

In `collectSourceSymbols`, collect unique nested functions/callbacks inside exported components/classes when names match interaction patterns:
- `handle*`
- `on*`
- `pan`, `zoom`, `select`, `drag`, `drop`, `submit`, `cancel`, `open`, `close`

Fail closed on ambiguous duplicate names.

- [ ] **Step 4: Add coordinate enrichment for nested symbols**

Update `findNamedDeclaration` to resolve `Parent.child` names and unique nested functions.

- [ ] **Step 5: Run extractor tests**

Run: `bun test packages/cli/tests/extractors/symbols-ts.test.ts packages/cli/tests/traceability/symbol-extract.test.ts`

Expected: PASS.

### Task 9: Add traceability quality checks against coarse file links

**Files:**
- Modify: `packages/core/src/kb.pl`
- Modify: `packages/core/src/checks.pl`
- Modify: `packages/cli/src/traceability/validate.ts`
- Modify: `packages/cli/tests/traceability/validate.test.ts`
- Modify: `packages/cli/tests/commands/check.test.ts`
- Modify: `packages/mcp/tests/tools/check.test.ts`

- [ ] **Step 1: Write failing Prolog checks**

Create symbol facts:
- module symbol implements `REQ-CANVAS-GENERIC`,
- child interaction symbols `handlePan`, `handleZoom`, `handleSelect` have no requirement links.

Expected: `check_symbol_semantic_granularity/1` reports child symbols lacking specific requirement ownership.

- [ ] **Step 2: Implement symbol parent/child predicates**

Support `parent_symbol` property on symbols and a derived relation from `sourceFile` containment when explicit parent is absent.

- [ ] **Step 3: Implement coarse-link detection**

Flag a module/component symbol as coarse when:
- it has `implements`,
- it has extractable child symbols,
- children lack `implements`,
- the requirement title/source is generic or covers multiple interactions.

Keep this as warning/audit in v1; do not hard fail unless config opts in.

- [ ] **Step 4: Update staged validation formatting**

`formatViolations` should suggest the precise child symbol and requirement style:

```text
src/CanvasViewport.tsx:12 handlePan() -> create/link requirement like REQ-CANVAS-PAN; do not satisfy with module-level REQ-CANVAS-GENERIC only
```

- [ ] **Step 5: Run tests**

Run: `bun test packages/cli/tests/traceability/validate.test.ts packages/cli/tests/commands/check.test.ts packages/mcp/tests/tools/check.test.ts`

Expected: PASS.

### Task 10: Update docs and examples for agent behavior

**Files:**
- Modify: `docs/entity-schema.md`
- Modify: `docs/inference-rules.md`
- Modify: `docs/mcp-reference.md`
- Modify: `docs/prompts/llm-rules.md`
- Modify: `docs/symbol-traceability-taxonomy.md`
- Modify: `AGENTS.md`
- Create: `docs/examples/ontology-contract.md`
- Create: `docs/examples/ontology-front-end-interactions.md`
- Modify: `packages/cli/tests/documentation-consistency.test.ts`
- Modify: `packages/cli/tests/modeling-guidance.test.ts`

- [ ] **Step 1: Add ontology contract example**

Show how a project defines a compact namespace-scoped ontology instead of a huge global predicate list:

```yaml
id: FACT-SCHEMA-SUPPORTS-INTERACTION
type: fact
fact_kind: predicate_schema
predicate_namespace: ui
predicate_name: supports_interaction
predicate_arity: 3
argument_names: [component, interaction, input_method]
argument_types: [component, interaction, input]
aliases: [supports, lets user, can]
```

- [ ] **Step 2: Add frontend interaction example**

Document:
- `REQ-CANVAS-PAN` linked to `CanvasViewport.handlePan`,
- `REQ-CANVAS-ZOOM` linked to `CanvasViewport.handleZoom`,
- `REQ-CANVAS-SELECT` linked to `CanvasViewport.handleSelect`,
- predicate facts `ui.supports_interaction(canvas_viewport, pan, pointer)` etc.

- [ ] **Step 3: Update agent rules**

Add concise rules:
- Discover predicates before creating facts.
- Use `predicate` facts for normative domain claims.
- Use `observation` for uncertain prose.
- Link smallest meaningful symbol, not whole file, when behavior is inside a function/method.

- [ ] **Step 4: Run documentation tests**

Run: `bun test packages/cli/tests/documentation-consistency.test.ts packages/cli/tests/modeling-guidance.test.ts`

Expected: PASS.

### Task 11: Full verification and migration guardrails

**Files:**
- Modify as required by failing tests only.

- [ ] **Step 1: Run targeted Prolog tests**

Run: `swipl -q -g "load_test_files([]),run_tests" -t halt packages/core/tests/schema.plt packages/core/tests/kb.plt`

Expected: PASS.

- [ ] **Step 2: Run targeted unit tests**

Run: `bun test packages/cli/tests/schemas.test.ts packages/cli/tests/utils/ontology-contract.test.ts packages/cli/tests/utils/predicate-selection.test.ts packages/cli/tests/extractors/symbols-ts.test.ts packages/cli/tests/traceability/validate.test.ts packages/mcp/tests/tools/model-ontology-claim.test.ts packages/mcp/tests/tools/ontology-predicates.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts packages/mcp/tests/tools/check.test.ts`

Expected: PASS.

- [ ] **Step 3: Run typechecks**

Run: `bun run typecheck:cli && bun run typecheck:mcp && bun run typecheck:cli:tests && bun run typecheck:mcp:tests`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `bun run build`

Expected: PASS.

- [ ] **Step 5: Run full unit suite**

Run: `bun run test:unit`

Expected: PASS.

---

## Migration strategy

1. Keep all existing `fact_kind` values valid.
2. Treat legacy prose facts as readable but not ontology-ready.
3. Introduce ontology checks as warnings first.
4. Add opt-in hard mode for `lane:ontology` requirements.
5. Preserve `constrains`/`requires_property` contradiction behavior throughout.
6. Provide MCP modeling tools so agents can choose predicates instead of inventing prose.

## Explicit non-goals for this refactor

- Do not execute arbitrary Prolog supplied by users or agents.
- Do not require every project to define a complete ontology on day one.
- Do not break existing `subject`/`property_value` contradiction checks.
- Do not make coarse symbol links hard failures until extraction quality is proven.
- Do not add a new entity type unless the eight-type constraint is intentionally revisited in a separate ADR.

## Risks and mitigations

- **Predicate explosion:** mitigate with namespaces, aliases, source-scoped ranking, and at-most-5 MCP shortlist responses.
- **LLM confusion:** force a discovery-before-write workflow through `kb_ontology_predicates` and `kb_model_ontology_claim`.
- **Prose fallback abuse:** classify prose as observation/review unless explicitly modeled with predicate fields.
- **Unsafe rule execution:** store rules as data and interpret a safe subset; never consult stored rule strings as Prolog code.
- **Traceability noise:** start granular symbol checks as audit warnings and make hard gating opt-in.
- **Migration churn:** keep strict property facts as compatibility projection and only require ontology lane when tagged/configured.
