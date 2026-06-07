# Semantic Advisor Modeling Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the semantic advisor from warning-only signal detection into feature-complete, non-enforcing modeling suggestions with draft strict facts, predicate facts, ambiguity observations, ontology-gap observations, confidence, and explanations.

**Architecture:** Keep enforcement out of scope. Extend the existing MCP-side semantic advisor result with `suggestions`, where each suggestion is deterministic, explainable, and safe to review before application. Reuse the existing `kb_validate_upsert` and `kb_upsert` surfaces so agents immediately see suggestions during preflight/fallback writes; a standalone public advisor tool can be added after the core suggestion contract is proven.

**Tech Stack:** Bun, TypeScript, existing MCP semantic advisor, existing `kb_validate_upsert`/`kb_upsert`, deterministic regex/heuristic extractors, Bun tests, Biome, Changesets.

---

## Task 1: Extend Advisor Result Contract

**Files:**
- Modify: `packages/mcp/src/semantic-advisor/types.ts`
- Modify: `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`
- Modify: `packages/mcp/src/semantic-advisor/analyze-prose.ts`

- [ ] Write failing tests for `receipt.suggestions` including strict property, predicate, ambiguity observation, and ontology-gap suggestions.
- [ ] Run `bun test ./packages/mcp/tests/semantic-advisor/analyze-prose.test.ts` and verify failure because suggestions do not exist.
- [ ] Add typed suggestion unions: `strict_property`, `predicate`, `ambiguity_observation`, `ontology_gap`.
- [ ] Implement minimal deterministic suggestion builders and keep existing warning behavior.
- [ ] Re-run the focused advisor test and verify pass.

## Task 2: Strict Property Suggestions

**Files:**
- Modify: `packages/mcp/src/semantic-advisor/analyze-prose.ts`
- Modify: `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`

- [ ] Add failing tests for `at most`, `at least`, `exactly`, `within`, `retained for`, `expires after`, boolean `enabled/disabled`, and enum-set prose.
- [ ] Implement deterministic extraction of operator/value/unit and a draft strict fact `applyPlan` containing subject, property, and requirement steps.
- [ ] Include confidence, evidence, rationale, and rejected alternatives.

## Task 3: Predicate Suggestions

**Files:**
- Modify: `packages/mcp/src/semantic-advisor/analyze-prose.ts`
- Modify: `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`

- [ ] Add failing tests for permission, conditional behavior, default value, state membership, state transition, exclusivity, temporal order, and uniqueness prose.
- [ ] Implement deterministic predicate suggestion builders using built-in predicate names and ordered arguments.
- [ ] Return draft predicate fact `applyPlan` and `requires_predicate` relationship guidance when the requirement ID is known.

## Task 4: Ambiguity and Ontology Gaps

**Files:**
- Modify: `packages/mcp/src/semantic-advisor/analyze-prose.ts`
- Modify: `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`

- [ ] Add failing tests for ambiguous numeric prose such as `Users may have two active sessions`.
- [ ] Add failing tests for logical but unsupported prose that should produce an ontology-gap schema recommendation.
- [ ] Implement ambiguity observation and ontology-gap observation apply plans.

## Task 5: Surface Suggestions in Existing MCP Flows

**Files:**
- Modify: `packages/mcp/tests/tools/validate-upsert.test.ts`
- Modify: `packages/mcp/tests/tools/upsert-semantic-advisor.test.ts`
- Modify: `docs/mcp-reference.md`
- Modify: `docs/modeling-cheatsheet.md`
- Modify: `.changeset/semantic-advisor-preflight.md`

- [ ] Add failing tests asserting `kb_validate_upsert` and `kb_upsert` expose `semanticAdvisor.suggestions`.
- [ ] Update docs and changeset to describe draft suggestions, not just warnings.
- [ ] Re-run focused tests.

## Task 6: Verification

**Files:** all modified files.

- [ ] Run LSP diagnostics on modified TypeScript files.
- [ ] Run focused tests:
  `bun test ./packages/mcp/tests/semantic-advisor/analyze-prose.test.ts ./packages/mcp/tests/tools/validate-upsert.test.ts ./packages/mcp/tests/tools/upsert-semantic-advisor.test.ts ./packages/mcp/tests/tools/upsert-contradictions.test.ts ./packages/mcp/tests/tools/upsert.test.ts`
- [ ] Run `bun run typecheck:mcp`.
- [ ] Run `bun run typecheck:mcp:tests`.
- [ ] Run `bun run build:mcp`.
- [ ] Run `bun run check`.

## Deferred

- Strict receipt enforcement.
- Configurable `off`/`warn`/`strict` policy.
- Standalone `kb_semantic_advisor` public MCP tool if real-product trials show agents need a separate tool instead of the existing validate/upsert flow.
- ML-assisted extraction. Deterministic suggestions must come first so quality can be measured.
