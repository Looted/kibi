---
id: kibi-usage
name: Kibi Usage
description: Guides agents to use Kibi MCP, facts, relationships, and validation correctly
version: 1.3.0
kibiCompatibility: ">=0.11.0"
tags:
  - kibi
  - mcp
  - knowledge-base
  - traceability
  - agent-guidance
resources:
  - resources/relationship-directions.md
  - resources/fact-lanes.md
  - resources/workflows.md
  - resources/operation-access.md
  - resources/ui-requirements.md
  - resources/logic-ir.md
---
# Kibi Usage

Consult this skill before any Kibi knowledge base operation, on first interaction with a Kibi-enabled repo, after stale or dirty KB status is suspected, and before mutations.

## Interface Selection

Kibi exposes two peer surfaces over the same 18 operations: visible MCP tools and the trusted project-local CLI. Both accept the same business input and effects (see `resources/operation-access.md`). Choose by what is visible and approved in the current environment — MCP and the CLI are equal choices, not a preference order:

1. If Kibi MCP tools are visible and approved in the current environment, use MCP.
2. Otherwise, in a trusted workspace, use the project-local CLI through a non-installing runner: `npx --no-install kibi ...` or `bunx --no-install kibi ...`. The CLI is a peer interface, not a fallback.
3. If the project-local CLI is unavailable or too old for the needed route, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner. Never probe or install packages as a side effect of interface selection.

Use exact MCP tool names, dedicated CLI routes, input modes, effects, and Prolog requirements from `resources/operation-access.md`. Do not invent a generic operation runner. Do not read or edit files inside `.kb/` directly.

CLI JSON mode accepts MCP-shaped business input at `--input <file|->`.

```bash
echo '{"type":"req","id":"REQ-001","properties":{"title":"Test","status":"open"}}' | npx --no-install kibi upsert --input -
```

```bash
echo '{"query":"authentication","limit":10}' | bunx --no-install kibi search --input -
```

## MCP Tool Names

Kibi canonical MCP names include `kb_search`, `kb_query`, `kb_upsert`, `kb_check`, `kb_status`, `kb_validate_upsert`, and related `kb_*` tools. OpenCode may expose prefixed identifiers such as `kibi_kb_search`, `kibi_kb_query`, and `kibi_kb_upsert`. Use the visible Kibi MCP tool identifiers and map them back to canonical operations before reasoning about behavior.

## Discovery First

Always discover before you mutate. Start exploratory work with `kb_search` across metadata and markdown body text. Split broad queries into one to three focused probes and review top hits before concluding knowledge is absent.

Use `kb_query` for exact lookups by `id`, `type`, `tags`, or `sourceFile`. Use `kb_status` when branch attachment, freshness, or stale context could affect the decision. Mutate only after discovery confirms the target state.

## Approval Boundaries

Do not perform Kibi mutations unless the current task calls for knowledge-base changes or the user explicitly asks for them. Discovery and validation are acceptable when needed to understand impact, freshness, traceability, or existing requirements.

Kibi guidance does not define a repository's package manager, branch names, release scripts, or publishing workflow. Follow the repository's own instructions for those concerns. Never use Kibi interface selection to install packages, change dependency manifests, or bypass sandbox and approval boundaries.

## Relationship Directions

Relationship direction is fixed and semantic. Reversed links break traceability queries and validation.

| Relationship | Direction | Meaning |
|-------------|-----------|---------|
| `implements` | symbol -> req | Symbol owns or implements requirement behavior |
| `specified_by` | req -> scenario | Requirement is specified by a scenario |
| `verified_by` | req/scenario -> test | Requirement or scenario is verified by a test |
| `validates` | test -> req/scenario | Test validates a requirement or scenario |
| `executable_for` | symbol -> test | Symbol is executable test code for a test entity |
| `constrains` | req -> fact(subject) | Requirement constrains a domain fact |
| `requires_property` | req -> fact(property_value) | Requirement requires a property value |
| `requires_predicate` | req -> fact(predicate) | Requirement requires a ground ontology predicate |
| `supersedes` | old-req -> new-req | Old requirement is replaced by new requirement |
| `covered_by` | symbol -> test | Production symbol has coverage evidence from a test |

Before/after for reversed direction:

- Wrong: `relationships: [{ type: "implements", from: "REQ-001", to: "SYM-001" }]`
- Right: `relationships: [{ type: "implements", from: "SYM-001", to: "REQ-001" }]`

## Symbol-First Traceability

Preserve source-file traceability whenever creating or updating requirements, facts, scenarios, tests, or symbols. Prefer durable `sourceFile` references and symbol coordinates that point to tracked repository files. For code ownership, create or update a `symbol` entity and add an `implements` relationship from the symbol to the requirement; link symbols to tests with `covered_by` when coverage evidence is needed.

Do not use legacy `// implements REQ-xxx` comments as the primary marker for new or modified code. Use comments only as a temporary compatibility fallback when symbol metadata cannot be updated in the same task.

Preferred traceability model:

```yaml
symbol:
  id: SYM-admin-billing-policy
  title: Admin billing policy check
  status: active
  sourceFile: src/admin/billing.ts
relationships:
  - type: implements
    from: SYM-admin-billing-policy
    to: REQ-ADMIN-BILLING-POLICY
```

## Typed Logic IR Lane

Readable prose is retained for people, while every assertive proposition is inventoried and either grounded in a strict fact, a predicate fact, or a safe typed rule. Use the required extraction pass followed by an adversarial coverage audit; do not let a high-confidence single suggestion stand in for the rest of a compound requirement. Load `resources/logic-ir.md` for the IR grammar, proposition ledger, safety boundary, and proof semantics.

Use `kb_semantic_advisor` with up to three typed `interpretations` for ambiguous clauses. Kibi canonicalizes alternatives and keeps materially different meanings unresolved. Create `fact_kind: rule_schema` and `fact_kind: rule` endpoints from `kb_model_requirement`'s validated plan, then link `req -> rule` with `requires_rule`. Run `rule-safety`, `rule-verifiability`, `semantic-completeness`, `logic-coverage`, and `domain-contradictions`; unresolved, incomplete, or timed-out reasoning is not evidence of consistency.

The portable skill body must carry the core contract even when its detailed resources are unavailable: `kb_semantic_advisor` returns a `propositions[]` ledger and `semantic_inventory`; submit typed `interpretations` when wording has more than one plausible logical reading; validate modeled conditions through `kibi.logic.v1`; and preserve unresolved propositions as explicit gaps. Do not read or edit files inside `.kb` directly.

## Strict Fact Lane

Normative requirements that must participate in contradiction blocking use the strict fact lane. Create a `fact_kind: subject` fact and link it from the requirement via `constrains`. Create a `fact_kind: property_value` fact and link it via `requires_property`.

```yaml
id: FACT-USER-ROLE
fact_kind: subject
subject_key: user.role_assignment
```

```yaml
id: REQ-019
relationships:
  - type: constrains
    from: REQ-019
    to: FACT-USER-ROLE
  - type: requires_property
    from: REQ-019
    to: FACT-LIMIT-3
```

Model one semantic claim per strict `property_value` fact. Reusing the same `subject_key` and `property_key` lets `domain-contradictions` compare requirements mechanically. If a new requirement intentionally changes a value, create a replacement requirement and link the old requirement to the new one with `supersedes` instead of leaving two current contradictory requirements.

Use `kb_model_requirement` for automated strict-fact modeling when available. It generates subject and property_value facts, links them with `constrains` and `requires_property`, and handles low-confidence downgrades to observation facts automatically.

Granular fact examples for coherence checks include `REQ-ROLE-SET-2` versus `REQ-ROLE-SET-3` on `user.roles.allowed_set` (`user,admin` versus `user,admin,superadmin`) and `REQ-ADMIN-CAN-MANAGE-BILLING` versus `REQ-ONLY-SUPERADMIN-MANAGES-BILLING` on `billing.manage.allowed_actor`. See `resources/fact-lanes.md`; `domain-contradictions` uses these canonical keys.

## UI / Visual Requirement Modeling

Optional, per-project lane for recording what the screen should look like so UI edits cannot silently drift from the spec. Non-UI projects skip it; no check rule requires it.

Use three layers: a prose `req` as the searchable anchor, strict `property_value` facts for checkable positions/alignment/order (linked `constrains` / `requires_property`, so incompatible values on the same subject/property are rejected on write unless `supersedes`), and relational predicates linked with `requires_predicate` (built-in `visual_layout_rule(subject, relation, target)` for "X must remain visually aligned with Y"). Model UI components as `symbol` entities with `sourceFile` and `symbol_role: behavioral`, linked `implements` to the requirement, so component edits surface the visual spec in impact diagnostics. Full payloads and workflow: `resources/ui-requirements.md`.

## Complete Logical Coverage

Readable prose is not evidence that a requirement is machine-checkable. Before treating a normative requirement as modeled, decompose its entire body into atomic normative clauses and ground every clause. One correct fact or relationship never proves that the other prose is covered.

1. Call `kb_semantic_advisor` with the complete requirement prose. When the automatic split is incomplete or a sentence contains multiple obligations, pass an explicit `clauses` array containing every atomic normative clause.
2. Use the stable `claim_key` returned for each clause. Every ground `property_value` or `predicate` fact must preserve that key in `claim_key` and preserve the clause in `claim_text`. Use the advisor-returned inventory exactly; do not add punctuation or wording variants of an existing clause.
3. Put the complete set of keys in the requirement's `logic_claims` manifest. Merge returned keys with existing values; never overwrite earlier claims while modeling a later clause.
4. Ground each key through exactly one suitable logical lane: `requires_property` to one strict `property_value` fact, `requires_predicate` to one ground `predicate` fact, or `requires_rule` to one safe `rule` fact. A subject fact supports a strict claim but does not ground a key by itself. Observation, meta, ambiguity, and ontology-gap facts explicitly remain unresolved and do not count as logical coverage.
5. Run `kb_check` with `logic-coverage`, `rule-safety`, `rule-verifiability`, `semantic-completeness`, `predicate-verifiability`, and `domain-contradictions`. `logic-coverage` enforces a one-claim/one-ground-fact mapping and rejects distinct claim keys that encode the same logical term; human or agent review still confirms that the atomic clauses exhaust the prose and that each ground term preserves its meaning.

Kibi emits a non-blocking logical-coverage debt diagnostic for every current requirement without a manifest, independent of title wording. The `logic-coverage` rule is enabled by default for requirements that do declare manifests, so an unfiltered final check catches missing or orphaned ground claims while legacy requirements remain explicit backfill work.

A complete `logic_claims` manifest alone is not a complete model. Semantic-advisor readiness remains partial until the payload has at least one distinct `requires_property`, `requires_predicate`, or `requires_rule` grounding slot per assertive claim. This count prevents one token edge from suppressing the remaining plans; only `logic-coverage` readback proves that each slot reaches the fact with the matching claim key.

Never invent, reuse across different clauses, or manually alter a claim key. Kibi derives it from `claim_text` and rejects mismatched mutation and Markdown inputs.

For a compound requirement, the manifest and linked facts form a clause-completeness contract:

```yaml
requirement:
  id: REQ-CHECKOUT-RETENTION
  logic_claims: [CLAIM-A1B2C3D4E5F60718, CLAIM-18273645AABBCCDD]
facts:
  - fact_kind: predicate
    claim_key: CLAIM-A1B2C3D4E5F60718
    claim_text: Checkout requires payment authorization before submission.
  - fact_kind: property_value
    claim_key: CLAIM-18273645AABBCCDD
    claim_text: Customer data must be retained for 7 years.
```

The example keys are illustrative; use only keys returned for the exact clause text.

## Predicate Ontology Decision Tree

Preserve the readable requirement prose. Facts add a machine-queryable model; they do not replace prose, and stored predicate facts are data queried by Kibi's Prolog layer rather than executable Prolog supplied by the agent.

1. Call `kb_semantic_advisor` on the complete prose, verify its atomic clause inventory, and choose one lane per clause.
2. For each relational clause, call `kb_suggest_predicates` with that clause and the current `existingLogicClaims`. Read each candidate as a Prolog-shaped ground term `predicate_name(arg1,...,argN)`: the schema fixes the predicate name, arity, argument roles, and argument order.
3. Accept a candidate only when its meaning and every ordered argument fit the prose. Use the returned `applyPlan`, including its exact `predicate_name`, `predicate_args`, `canonical_key`, and `polarity`; never invent a predicate name, reorder arguments, add variables, or write a raw Prolog clause.
4. Create or confirm the requirement and `fact_kind: predicate` endpoints, preserve `claim_key` and `claim_text`, merge the returned `logicClaims` into the requirement, then link requirement -> predicate fact with `requires_predicate`. Treat the requirement's logical representation as the conjunction of every linked ground term. Encode a prohibition with `polarity: deny` on the fitting positive schema, not a made-up negative predicate. An `assert` and `deny` requirement over the same namespace, name, and ordered arguments are a blocking `domain-contradictions` conflict, so requirements must reuse the same canonical schema and argument vocabulary for equivalent domain claims.
5. Use an existing built-in or project-local `fact_kind: predicate_schema`. Create a new schema only when the task explicitly authorizes ontology extension and supplies a stable name, arity, `argument_names`, and `argument_types`; otherwise record `fact_kind: observation` with `review:ontology-gap`.
6. For each scalar, threshold, duration, boolean, enum-set, or cardinality clause, use `kb_model_requirement` with the current `existingLogicClaims` and the strict subject/property lane instead. For ambiguity or a lexical false positive, preserve the prose as a review observation and report the requirement as logically incomplete.
7. Validate every payload, create endpoints first, apply `kb_upsert` calls sequentially, read back all affected IDs, and run targeted `rule-safety`, `rule-verifiability`, `semantic-completeness`, `logic-coverage`, `predicate-verifiability`, and `domain-contradictions` checks before the final unfiltered `kb_check`. Exact query output can return an array when one relationship type has multiple targets; verify every target rather than reading only one edge.

Example: “Checkout requires payment authorization before order submission” fits `dependency_rule(subject, prerequisite, dependent)`. The ground model is `dependency_rule(checkout,payment_authorization,order_submission)`, stored as:

```yaml
fact_kind: predicate
predicate_name: dependency_rule
predicate_args: [checkout, payment_authorization, order_submission]
canonical_key: dependency_rule(checkout,payment_authorization,order_submission)
polarity: assert
claim_key: <claim key returned by kb_semantic_advisor>
claim_text: Checkout requires payment authorization before order submission.
```

Link the requirement to that predicate fact with `requires_predicate`. Do not use `verified_by`, `requires_predicate`, or another relationship type as the `predicate_name`; graph relationships and ontology predicates are different layers.

Detailed built-in, project-local, deny, strict-scalar, ambiguous, false-positive, and ontology-gap examples are immutable reference material in `resources/fact-lanes.md` and `resources/workflows.md`.

## Fact vs Flag

Use `flag` for runtime or config gates only, such as feature flags, kill-switches, and deferred capabilities.

Bugs, incidents, and workarounds belong in `fact` entities with `fact_kind: observation` or `meta`. These fact kinds are excluded from contradiction inference, making them appropriate for non-blocking evidence. Do not create a `flag` named like a bug to track a defect.

## Create Before Link

Always confirm or create endpoint entities before linking them. Query target IDs with `kb_query` first. If an endpoint does not exist, create it with `kb_upsert` before creating the relationship. Relationships to missing entities produce dangling references that `kb_check` will flag.

For `kb_upsert`, keep relationship rows anchored to the entity being upserted: each row's `from` must equal the upserted entity ID. If you need a `SYM -> REQ` link, upsert the symbol endpoint first, then link that symbol to the requirement.

Keep symbol payloads minimal: include only fields needed to identify the symbol, status, and source traceability. Put extra prose, examples, or audit notes in documentation or evidence artifacts instead of custom `kb_upsert.properties`; strict `kb_upsert.properties` rejects unknown fields.

When a generic `Query failed` appears, do not keep retrying the same payload. First call `kb_validate_upsert`, query or create missing endpoints, reduce the payload to required fields, and retry once. If it still fails, report the blocker.

## Small Behavior Fix Impact Evidence

For a behavior-changing source edit, first query for an existing requirement. If no requirement exists, create one for the corrected behavior. Model strict facts from that requirement when the invariant is contradiction-sensitive.

Do not link facts directly to tests. Facts describe invariants; requirements or scenarios are verified by executable tests. Use `REQ -> TEST` with `verified_by` or `TEST -> REQ` with `validates`, then link the requirement to facts with `constrains` and `requires_property`. Link touched production symbols to requirements with `implements` and to tests with `covered_by` when coverage evidence is needed.

Kibi operation writes do not automatically stage markdown evidence. When a staged hook requires impact evidence, ensure tracked documentation artifacts for requirements, facts, tests, symbol metadata, or coordinate refreshes are authored and staged alongside source changes.

## Sequential Upserts

Never fire `kb_upsert` calls in parallel. Execute them sequentially to avoid lock contention and ensure deterministic ordering, especially when creating chains of related entities.

## Checks

Run `kb_check` with specific rules during iteration for fast feedback. For normative requirement modeling, include `rules: ["rule-safety", "rule-verifiability", "semantic-completeness", "logic-coverage", "predicate-verifiability", "domain-contradictions"]`; add `required-fields` and `no-dangling-refs` after writes. Run a full `kb_check` without rule filters before declaring Kibi work complete.

The `domain-contradictions` rule detects conflicts between strict-lane facts linked to requirements. When a contradiction is found, the supported escape hatch is `supersedes`: create a new requirement that supersedes the old one, then link the new requirement to updated facts.

## Stale or Dirty KB Handling

Call `kb_status` when branch KB context may be stale or after switching context. Report freshness findings to the user rather than relying on outdated KB context. If `kb_status` indicates a schema migration is needed, ask the user or operator to handle it outside the agent session.

## Anti-Patterns and Remediation

| Anti-Pattern | Problem | Remediation |
|-------------|---------|-------------|
| Reversed relationship direction | Traceability queries break | Verify direction against the relationship table above |
| Legacy implements comments | Comments are not durable queryable symbols | Create or update a `symbol` entity and link it to the requirement |
| Bug-as-flag | `flag` misused for defect tracking | Use `fact` with `fact_kind: observation` or `meta` |
| Parallel upserts | Lock contention and nondeterminism | Execute `kb_upsert` calls sequentially |
| Embedded scenarios in reqs | Violates canonical traceability chain | Create separate `req`, `scen`, and `test` entities |
| Missing `kb_check` | Undetected dangling refs and violations | Run targeted checks during work, full check at completion |
| Tags as multi-ID lookup | Tags are metadata, not identifiers | Use `kb_query` with explicit `id` values |
| `relates_to` for strict modeling | Loses contradiction safety | Use `constrains` and `requires_property` instead |
| One fact for a compound requirement | Leaves untracked prose outside contradiction checks | Decompose all atomic clauses, preserve claim keys, and validate `logic_claims` with `logic-coverage` |
| Replacing `logic_claims` on each call | Discards previously grounded clauses | Pass existing keys and merge the returned manifest |
| Observation counted as coverage | Ambiguity or ontology gaps appear machine-checkable | Keep the claim unresolved until a strict or predicate ground fact exists |
| Relationship type used as predicate name | Confuses graph edges with ontology terms | Select a declared predicate schema and keep `requires_predicate` as the req -> fact edge |
| `status: implemented` on requirements | Not a valid lifecycle status | Use a valid status such as `closed`, add an `implemented` tag, and link evidence instead |
