# Semantic Advisor Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure agents get deterministic semantic-modeling guidance before or during normative `kb_upsert` writes, so prose-heavy requirements are routed toward strict facts, predicates, ambiguity review, or ontology gaps.

**Architecture:** Add a shared MCP-side semantic advisor that analyzes proposed upsert payloads without mutating the KB. `kb_validate_upsert` will surface the advisor receipt first; `kb_upsert` will include non-blocking receipts as a fallback so older agents cannot silently bypass guidance. Later slices can add strict policy modes, repository-wide checks, and richer predicate/modeling integrations without changing Prolog contradiction semantics prematurely.

**Tech Stack:** Bun, TypeScript, MCP server tools, AJV/JSON Schema, existing `kb_validate_upsert`/`kb_upsert` handlers, Bun tests, Biome, Changesets.

---

## File Structure

- Create: `packages/mcp/src/semantic-advisor/types.ts` — public TypeScript interfaces for signals, lanes, ambiguity witnesses, receipts, and analyzer input.
- Create: `packages/mcp/src/semantic-advisor/analyze-prose.ts` — deterministic signal detection, lane classification, payload hashing, receipt generation, and user-facing warning text.
- Create: `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts` — focused tests for numeric/cardinality, permissions, conditionals, non-normative prose, and payload-hash stability.
- Modify: `packages/mcp/src/tools/validate-upsert.ts` — attach semantic advisor warnings/receipt to valid preflight payloads.
- Modify: `packages/mcp/tests/tools/validate-upsert.test.ts` — assert valid prose-heavy requirements return semantic warnings and already-modeled requirements do not.
- Modify: `packages/mcp/src/tools/upsert.ts` — include advisor warnings in successful `kb_upsert` structured output for normative `req` payloads; do not block in this first implementation.
- Modify: `packages/mcp/tests/tools/upsert-contradictions.test.ts` or create `packages/mcp/tests/tools/upsert-semantic-advisor.test.ts` — verify successful upsert returns advisory output without interfering with mutation.
- Modify: `packages/mcp/src/tools-config.ts` — update `kb_validate_upsert` and `kb_upsert` descriptions to tell agents to inspect semantic advisor warnings before applying writes.
- Modify: `docs/mcp-reference.md`, `docs/modeling-cheatsheet.md`, and `docs/inference-rules.md` — document semantic advisor receipts, warnings, and non-blocking v1 behavior.
- Create: `.changeset/<generated-name>.md` — changeset for `kibi-mcp` with human-facing summary first.

## Behavioral Contract

Semantic advisor v1 is advisory only:

- It never claims a contradiction from prose.
- It never auto-creates facts or relationships.
- It classifies prose into `strict_property`, `predicate`, `observation_review`, or `none`.
- It emits ambiguity witnesses when a phrase has multiple plausible interpretations.
- It returns a payload hash so later strict-mode work can require an advisor receipt that matches the exact upsert payload.

Initial signal families:

- `normative_modal`: `must`, `shall`, `should`, `may`, `must not`, `cannot`.
- `numeric_cardinality`: digits, number words, `at most`, `at least`, `exactly`, `no more than`, `cap at`.
- `numeric_threshold`: `maximum`, `minimum`, `under`, `within`, `expires`, `retained for`, units.
- `conditional`: `if`, `when`, `unless`, `except`, `only if`.
- `permission`: `only`, `may`, `can`, `allowed`, `denied`, `must not`, actor/action/resource-style prose.
- `state_or_default`: `state`, `mode`, `defaults to`, `ready`, `disabled`, `enabled`, `terminal`.

## Task 1: Add Semantic Advisor Core

**Files:**
- Create: `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`
- Create: `packages/mcp/src/semantic-advisor/types.ts`
- Create: `packages/mcp/src/semantic-advisor/analyze-prose.ts`

- [ ] **Step 1: Write failing tests for semantic advisor signals**

Create `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  SEMANTIC_ADVISOR_VERSION,
  analyzeSemanticAdvisorInput,
} from "../../src/semantic-advisor/analyze-prose.js";

describe("semantic advisor prose analysis", () => {
  test("flags cardinality prose with ambiguity witness and strict-property route", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSIONS",
        properties: {
          title: "Limit active sessions",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref: "Users may have at most two active sessions.",
        },
      },
    });

    expect(result.receipt.version).toBe(SEMANTIC_ADVISOR_VERSION);
    expect(result.receipt.candidate_lane).toBe("strict_property");
    expect(result.receipt.logic_readiness).toBe("needs_modeling");
    expect(result.receipt.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "numeric_cardinality" }),
        expect.objectContaining({ kind: "normative_modal" }),
      ]),
    );
    expect(result.receipt.ambiguity_witnesses[0]).toMatchObject({
      signal_kind: "numeric_cardinality",
      interpretations: expect.arrayContaining(["exactly", "at_most", "at_least"]),
    });
    expect(result.warnings.join("\n")).toContain("kb_model_requirement");
  });

  test("routes permission and conditional prose toward predicate modeling", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-COACH-ACCESS",
        properties: {
          title: "Only instructors can access coach features",
          status: "open",
          source: "docs/requirements/coach-access.md",
          text_ref: "Only instructors can access coach-specific features when assigned to the video.",
        },
      },
    });

    expect(result.receipt.candidate_lane).toBe("predicate");
    expect(result.receipt.suggested_next_tools).toContain("kb_suggest_predicates");
    expect(result.receipt.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "permission" }),
        expect.objectContaining({ kind: "conditional" }),
      ]),
    );
  });

  test("marks already-modeled requirements as checkable", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-MODELED",
        properties: {
          title: "Session timeout",
          status: "open",
          source: "docs/requirements/sessions.md",
          text_ref: "Session timeout must equal 30 minutes.",
        },
        relationships: [
          { type: "constrains", from: "REQ-MODELED", to: "FACT-SUBJECT" },
          {
            type: "requires_property",
            from: "REQ-MODELED",
            to: "FACT-TIMEOUT",
          },
        ],
      },
    });

    expect(result.receipt.logic_readiness).toBe("modeled");
    expect(result.warnings).toEqual([]);
  });

  test("does not warn for non-normative prose", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-BRAND",
        properties: {
          title: "Brand tone",
          status: "open",
          source: "docs/requirements/brand.md",
          text_ref: "The product feels delightful and magical.",
        },
      },
    });

    expect(result.receipt.logic_readiness).toBe("not_applicable");
    expect(result.receipt.candidate_lane).toBe("none");
    expect(result.warnings).toEqual([]);
  });

  test("changes receipt hash when payload changes", () => {
    const first = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSIONS",
        properties: { title: "Limit", status: "open", text_ref: "At most two sessions." },
      },
    });
    const second = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SESSIONS",
        properties: { title: "Limit", status: "open", text_ref: "At most three sessions." },
      },
    });

    expect(first.receipt.payload_hash).not.toBe(second.receipt.payload_hash);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
bun test packages/mcp/tests/semantic-advisor/analyze-prose.test.ts
```

Expected: FAIL because `packages/mcp/src/semantic-advisor/analyze-prose.ts` does not exist.

- [ ] **Step 3: Implement minimal semantic advisor types and analyzer**

Create `packages/mcp/src/semantic-advisor/types.ts` with explicit union types and no loose `any` usage:

```ts
export type SemanticAdvisorLane =
  | "strict_property"
  | "predicate"
  | "observation_review"
  | "none";

export type SemanticAdvisorReadiness =
  | "modeled"
  | "needs_modeling"
  | "not_applicable";

export type SemanticSignalKind =
  | "normative_modal"
  | "numeric_cardinality"
  | "numeric_threshold"
  | "conditional"
  | "permission"
  | "state_or_default";

export interface SemanticSignal {
  kind: SemanticSignalKind;
  evidence: string;
  candidate_lane: SemanticAdvisorLane;
  confidence: number;
}

export interface SemanticAmbiguityWitness {
  signal_kind: SemanticSignalKind;
  evidence: string;
  interpretations: string[];
  message: string;
}

export interface SemanticAdvisorReceipt {
  version: string;
  payload_hash: string;
  logic_readiness: SemanticAdvisorReadiness;
  candidate_lane: SemanticAdvisorLane;
  signals: SemanticSignal[];
  ambiguity_witnesses: SemanticAmbiguityWitness[];
  suggested_next_tools: string[];
  summary: string;
}

export interface SemanticAdvisorInput {
  payload: Record<string, unknown>;
}

export interface SemanticAdvisorResult {
  receipt: SemanticAdvisorReceipt;
  warnings: string[];
}
```

Create `packages/mcp/src/semantic-advisor/analyze-prose.ts` with deterministic regex-backed signal detection, stable JSON canonicalization, SHA-256 payload hashing, and lane selection.

- [ ] **Step 4: Re-run focused advisor tests**

Run:

```bash
bun test packages/mcp/tests/semantic-advisor/analyze-prose.test.ts
```

Expected: PASS.

## Task 2: Wire Advisor Into `kb_validate_upsert`

**Files:**
- Modify: `packages/mcp/src/tools/validate-upsert.ts`
- Modify: `packages/mcp/tests/tools/validate-upsert.test.ts`

- [ ] **Step 1: Write failing tests for validation warnings**

Add tests that assert:

- a valid normative prose-only `req` returns `valid: true`, non-empty `warnings`, and `semanticAdvisor.receipt.logic_readiness === "needs_modeling"`;
- a valid `req` with `constrains` + `requires_property` returns no advisor warnings;
- invalid payloads still return schema/modeling errors and do not mask those errors with advisor output.

- [ ] **Step 2: Verify tests fail**

Run:

```bash
bun test packages/mcp/tests/tools/validate-upsert.test.ts
```

Expected: FAIL because `ValidateUpsertResult.structuredContent` has no advisor field or warnings.

- [ ] **Step 3: Implement validation integration**

Update `ValidateUpsertResult.structuredContent` to include:

```ts
semanticAdvisor: SemanticAdvisorReceipt | null;
```

On successful payload validation, call `analyzeSemanticAdvisorInput({ payload: args })` and copy warnings into `structuredContent.warnings`. Keep invalid payload behavior unchanged except for the new `semanticAdvisor: null` field.

- [ ] **Step 4: Re-run validation tests**

Run:

```bash
bun test packages/mcp/tests/tools/validate-upsert.test.ts
```

Expected: PASS.

## Task 3: Wire Non-Blocking Advisor Receipt Into `kb_upsert`

**Files:**
- Modify: `packages/mcp/src/tools/upsert.ts`
- Create: `packages/mcp/tests/tools/upsert-semantic-advisor.test.ts`

- [ ] **Step 1: Write failing upsert receipt test**

Create a Prolog-backed test that inserts a prose-heavy `req` and expects successful mutation plus advisory structured output:

```ts
expect(result.structuredContent?.semanticAdvisor).toMatchObject({
  logic_readiness: "needs_modeling",
  candidate_lane: "strict_property",
});
expect(result.structuredContent?.warnings).toEqual(
  expect.arrayContaining([expect.stringContaining("kb_model_requirement")]),
);
```

- [ ] **Step 2: Verify test fails**

Run:

```bash
bun test packages/mcp/tests/tools/upsert-semantic-advisor.test.ts
```

Expected: FAIL because `UpsertResult.structuredContent` has no advisor output.

- [ ] **Step 3: Implement advisory output in `handleKbUpsert`**

Call the advisor after `validateKbUpsertArgs(args)` and before mutation. Include `semanticAdvisor` and `warnings` in `structuredContent`. Do not throw based on advisor output in v1.

- [ ] **Step 4: Re-run contradiction and advisor upsert tests**

Run:

```bash
bun test packages/mcp/tests/tools/upsert-semantic-advisor.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts
```

Expected: PASS.

## Task 4: Update MCP Tool Descriptions and Docs

**Files:**
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `docs/mcp-reference.md`
- Modify: `docs/modeling-cheatsheet.md`
- Modify: `docs/inference-rules.md`

- [ ] **Step 1: Write or update tests if tool descriptions are snapshotted**

Search existing MCP tool-surface tests for description assertions. If a test expects exact wording, update it first and verify failure.

- [ ] **Step 2: Update descriptions**

`kb_validate_upsert` should say it returns semantic advisor receipts and should be run before `kb_upsert`. `kb_upsert` should say it may return semantic warnings and agents must inspect them before finalizing normative requirements.

- [ ] **Step 3: Update documentation**

Document:

- semantic advisor receipts are advisory in v1;
- prose-only requirements are not contradiction-checkable;
- warnings should be repaired by `kb_model_requirement`, `kb_suggest_predicates`, or an explicit observation/ontology-gap;
- future strict-mode receipt validation can compare payload hashes.

- [ ] **Step 4: Run doc/tool tests**

Run the exact tests found in Step 1 plus:

```bash
bun test packages/mcp/tests/tools/validate-upsert.test.ts
```

Expected: PASS.

## Task 5: Add Changeset

**Files:**
- Create: `.changeset/<slug>.md`

- [ ] **Step 1: Create changeset with human-readable first section**

Use this shape:

```md
---
"kibi-mcp": minor
---

Agents now get semantic modeling guidance before or during requirement writes. When a requirement contains machine-checkable prose, Kibi explains why Prolog cannot reason over it yet and points the agent toward strict facts, predicates, ambiguity review, or ontology-gap modeling.

This makes prose-heavy requirements visible as logic debt instead of silently accepting them as contradiction-checkable knowledge.

- Add MCP semantic advisor receipts for upsert validation and upsert responses.
- Detect deterministic modeling signals for numeric, cardinality, conditional, permission, state/default, and modal prose.
- Document advisory v1 behavior and recommended repair paths.
```

- [ ] **Step 2: Run changeset-related formatting/checks**

Run:

```bash
bun run check
```

Expected: PASS.

## Task 6: Final Verification

**Files:** all modified files.

- [ ] **Step 1: Run LSP diagnostics on modified TypeScript files**

Run LSP diagnostics for:

- `packages/mcp/src/semantic-advisor/analyze-prose.ts`
- `packages/mcp/src/semantic-advisor/types.ts`
- `packages/mcp/src/tools/validate-upsert.ts`
- `packages/mcp/src/tools/upsert.ts`
- any new or modified test files

Expected: zero errors.

- [ ] **Step 2: Run focused MCP tests**

Run:

```bash
bun test packages/mcp/tests/semantic-advisor/analyze-prose.test.ts packages/mcp/tests/tools/validate-upsert.test.ts packages/mcp/tests/tools/upsert-semantic-advisor.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run MCP typecheck**

Run:

```bash
bun run typecheck:mcp
bun run typecheck:mcp:tests
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```bash
bun run build:mcp
```

Expected: PASS.

- [ ] **Step 5: Run final Kibi validation through MCP**

Run targeted `kb_check` rules through MCP, at minimum:

- `required-fields`
- `no-dangling-refs`
- `domain-contradictions`

Expected: no new violations attributable to this work.

## Deferred Best-Case Extensions

Do not include these in the first implementation unless all v1 work is green:

- Strict policy mode requiring receipt hashes before `kb_upsert`.
- New `kb_semantic_advisor` public MCP tool.
- Repository-wide `prose-machine-checkable-unmodeled` `kb_check` rule.
- Automatic apply-plan generation that calls or mirrors `kb_model_requirement` and `kb_suggest_predicates`.
- Logic coverage dashboard and trend metrics.
