---
id: kibi-usage
name: Kibi Usage
description: Use Kibi's source-first, exact-Git, migration-aware, proof-aware operations safely across MCP or the trusted local CLI, including partial completion repair.
version: 2.1.0
kibiCompatibility: ">=1.0.0"
tags:
  - kibi
  - mcp
  - cli
  - source-first
  - branching
  - traceability
  - recovery
resources:
  - resources/operation-access.md
  - resources/branch-lifecycle.md
  - resources/source-authoring.md
  - resources/relationship-directions.md
  - resources/fact-lanes.md
  - resources/workflows.md
  - resources/ui-requirements.md
  - resources/logic-ir.md
  - resources/kb-improvement.md
---
# Kibi Usage

Consult this skill before any Kibi knowledge base operation, on first
interaction with a Kibi-enabled repo, after stale or dirty status is suspected,
and before mutations.

Kibi is an agent-native requirements compiler. Use it to retain product intent,
compile branch-local requirements and scenarios, link symbols to ownership,
and prove implementation with fresh evidence.

## Interface Selection

Use whichever capability is visible and approved. The surfaces are equal peers:

1. If approved Kibi MCP tools are visible, use them.
2. Otherwise use `npx --no-install kibi ...` from the trusted project-local CLI.
3. If the operator capability is unavailable or too old for the needed route,
   stop and identify the missing capability.
4. Never use a global fallback, an installing runner, or an unapproved route.

Hosts may expose prefixed identifiers such as `kibi_kb_search`,
`kibi_kb_query`, and `kibi_kb_upsert`; map them to the canonical MCP names.

The CLI JSON route accepts the same business object as MCP:

```bash
printf '%s\n' '{"query":"checkout","limit":10}' | npx --no-install kibi search --input -
```

Read `resources/operation-access.md` for the route, result version, effects,
mutability, and Prolog requirements of each operation.

## Safe workflow

1. Always discover before you mutate: start with `kb_search`, then exact-filter with `kb_query`. Use
   `kb_status` when branch or freshness confidence matters.
2. Resolve genuine ambiguity with the human; use semantic advisor/modeling
   operations for deterministic interpretation and typed facts.
3. Create endpoints before relationships and upsert small batches sequentially.
   Keep the canonical `REQ-* -> SCEN-* -> TEST-*` chain.
4. Author tracked Markdown/YAML/manifests and relationship shards through Kibi;
   Kibi never Git-stages or commits those files. Do not read or edit `.kb`
   directly.
5. Finish with targeted and final `kb_check`, then read status/coverage and
   state freshness, verification, proof, and limitations separately.

Run `kb_check` with specific rules during iteration and the unfiltered final
check. Never fire `kb_upsert` calls in parallel; create or confirm endpoint
entities before linking them. The canonical MCP names are `kb_search`,
`kb_query`, `kb_upsert`, and `kb_check`.

## Exact Git attachment

The active ref is the exact KB identity. `KIBI_BRANCH` is used verbatim; Git's
symbolic HEAD is used otherwise. Slash, `@`, Unicode, `main`, `master`, and
detached states are not normalized or merged. Hashed stores and their
`branch.json` identity fence are compiled artifacts. A missing exact store is
created by `kibi sync` from this checkout's tracked sources. Kibi never copies
stores across branches and never selects merge winners; unresolved authored Git
conflicts block compilation. See `resources/branch-lifecycle.md` for legacy
migration, worktrees, quarantine, restore, and purge.

## Typed results and recovery

Every CLI JSON/MCP result has `kibiProtocol`, `operation`, `resultVersion`,
`status`, `data`, `effects`, `diagnostics`, and typed `nextActions`. Treat
`status: error` as a failed pre-commit operation. If the status is
`committed_with_repairs`, the mutation already committed: inspect failed effects,
execute each required repair action in order, and never retry the original
operation. Record effect failures, followed actions, and unsafe retries in
diagnostic telemetry.

## Source-first mutation

Use `document.path` when a new entity has no single configured writable target.
Existing entities preserve body bytes when `document.body` is omitted; new
requirements default their body to `semantic_text`. Relationship mutations
patch canonical shards while preserving unrelated records. Authored entity
deletion returns a hash-bound approval plan; requirements normally evolve via a
new entity linked with `supersedes`. Read `resources/source-authoring.md` before
source writes, deletion approval, or recovery.

## Semantic and proof guardrails

Prolog proves only encoded facts. Keep ambiguity, ontology gaps, incomplete
grounding, stale snapshots, and failed or unavailable evidence explicit. Use
`fact_kind: subject` plus `property_value`/`predicate` lanes for contradiction-
safe normative claims; use `observation` or `meta` for bug/workaround notes and
`flag` only for actual runtime/config gates. Requirements require scenarios,
tests, symbol ownership, and fresh proof-bearing receipts before claiming proof.
For an existing product KB that needs semantic backfill, read
`resources/kb-improvement.md`.

## Predicate Ontology Decision Tree

Call `kb_semantic_advisor`, `kb_model_requirement`, or `kb_suggest_predicates`
before encoding a normative clause. Use `fact_kind: predicate` with
`requires_predicate` when a suitable schema exists; use `fact_kind: observation`
for an ontology gap. Keep the `REQ -> TEST` chain and use `verified_by` for
proof-bearing links. Relationship direction is fixed, and every `from` in a
relationship batch must equal the upserted entity ID.

## Symbol-First Traceability

Represent implementation ownership with a `symbol` entity and an `implements`
relationship from the symbol to the requirement. Do not rely on legacy
`// implements REQ-xxx` comments as the traceability record.

## Complete Logical Coverage

Decompose all atomic normative clauses into `claim_key`/`claim_text` entries in
`logic_claims`; human or agent review still confirms that the atomic clauses
exhaust the prose. Run `logic-coverage` and `domain-contradictions` after
modeling. Use `status: implemented` only as historical input; use a valid status
such as `closed`, add an `implemented` tag, and link evidence instead.

## Anti-Patterns and Remediation

Reject reversed relationship direction, a Bug-as-flag record without a runtime
gate, direct `.kb/` edits, and a generic `strict kb_upsert.properties` field.
Keep symbol payloads minimal. When a generic `Query failed` appears, do not keep
retrying the same payload; inspect the typed error and `nextActions`.

Kibi may now author tracked Markdown/YAML evidence transactionally. The former
statement “Kibi operation writes do not automatically stage markdown evidence”
means Kibi writes do not Git-stage it: review and commit remain ordinary Git
workflows.
