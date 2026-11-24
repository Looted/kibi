# Slice 1 Implementation Plan: Conceptual Gold Set, `kb_map` Orientation Read, and Search Answer Hygiene

**Status:** Implementation Plan — Ready for Maintainer Review & Sign-Off  
**Date:** 2026-11-23  
**Parent RFC:** [nl-retrieval-and-orientation.md](./nl-retrieval-and-orientation.md) (Architecture RFC v2)  
**Target Branch Posture:** Built against current `develop` conventions (`repo-search-hints-gold.v2.jsonl`, all supported agent hosts, strict MCP/CLI parity).

---

## 1. Slice 1 Scope, Explicit Non-Scope & Pre-Implementation Approval Gates

### 1.1 What Slice 1 Ships
Slice 1 delivers the low-risk, zero-new-dependency Tier-0 foundation that solves **repository orientation**, **ADR visibility**, **weak-lift noise**, and **measurement** without changing check enforcement or adding breaking migrations:

1. **Workstream A:** `repo-search-conceptual-gold.v1.jsonl` + freshly-bootstrapped thin-KB fixture + evaluator scoring both **single-shot** recall/noise and **2-call agent reachability** (`kb_map` → `kb_search`).
2. **Workstream B:** `kb_map` MCP tool (`kibi map` CLI peer) backed by a deterministic Prolog aggregation predicate (`discovery:kb_map_json/3`), formatted into a compact (~8 KB default) governance atlas of accepted ADRs, subject areas (stripping a single dominant root prefix), firm rule counts, owning code directories, and ungoverned gaps.
3. **Workstream C:** Language-neutral orientation pointer in `kb_search` text digests when a query abstains or scores below `0.44`.
4. **Workstream D:** Answer-layer hygiene in `packages/cli/src/search-answer.ts` and `packages/cli/src/intent-search.ts`:
   - Separate ADR lane (`SEARCH_ANSWER_LIMITS.rationale` raised from `3` to `6`, collected across all ranked matches rather than only the top 10 seeds).
   - Weak-lift floor preventing low-scoring scenarios/tests/facts/symbols from dragging unrelated requirements into `answer.governing`, plus an honest ADR-only note when ADRs matched strongly without governing requirements.
   - Four meta-framing stop words (`"design"`, `"main"`, `"overall"`, `"principle"`) added to `STOP_WORDS` with zero change to scoring weights or calibrated thresholds (`0.18`, `0.44`).
5. **Workstream E:** KB self-hosting updates (requirements, scenarios, tests, `.kb/symbols.yaml`, proof tests), bundled skill & host-adapter updates, docs (`README.md`, `docs/`, `docs-site/`), and changeset.

### 1.2 Explicit Non-Scope (Deferred to Slice 2 or Data-Gated Future Work)
- **Deferred to Slice 2:** ADR-link validation check + migrating/repairing Kibi's 11 unlinked accepted ADRs; adding typed `decides` (or standardizing on ADR `relates_to`); score-ranked ADR-to-requirement lifting; persisting bootstrap's `projectSummary` as a `kb:project-overview` observation fact (after measuring the thin-KB fixture in Workstream A).
- **Deferred (Data-Gated):** Governance Cards, persistent derived JS search index, BM25F/adaptive weights, English question-shape routing, `kibi.semantic-retrieval.v1`, ONNX bi-encoder/cross-encoder, and LLM rerankers.

### 1.3 Pre-Implementation Maintainer Confirmation Gates
Implementing Slice 1 requires explicit approval on three items (two involve `firm` or shared contract rules):

| Checkpoint | Current State | Proposed Slice 1 Decision |
| :--- | :--- | :--- |
| **1. `REQ-kibi-mcp-tool-catalog` (`firm`)** | Fixes `MCP_TOOL_ORDER` at **19** default tools (`packages/mcp/src/tools-config.ts`). | **Supersede to 20 default tools** to expose `kb_map` as a dedicated tool, and include `kb_map` in `DEFAULT_PROFILE_TOOLS` (`core` profile: 8 → 9 tools) so projects using the slim profile still get the orientation primitive. |
| **2. `REQ-kibi-operation-catalog-names`** | Asserts exact 27-member `OPERATION_CATALOG` list (`packages/cli/tests/proofs/claims/operation-catalog-names.proof.test.ts`). | Add `kb_map` (28th operation) and update the requirement + proof test accordingly. |
| **3. `SESSION_BRIEF` (`packages/agent-core/src/session-brief.ts`)** | Fixed 5-line brief taught by `REQ-agent-core-session-brief` (`TEST-session-brief`). | **Recommend:** Keep `SESSION_BRIEF` untouched in Slice 1 (to avoid breaking prompt budgets and `TEST-session-brief` unnecessarily), and teach `kb_map` via `kb_search` weak/abstained pointers, `packages/mcp/src/server/docs.ts`, and `kibi-usage` / `kibi-bootstrap` skills. Confirm if you want `SESSION_BRIEF` updated instead. |

---

## 2. Workstream A — Conceptual Gold Set & Thin-KB Fixture (Build First)

Before modifying any retrieval or formatting logic, establish the baseline measurement suite.

### 2.1 New Gold Set: `documentation/evaluations/change-to-proof/repo-search-conceptual-gold.v1.jsonl`
Author 28–35 curated test cases spanning four explicit strata:

| Stratum | Example Queries | What It Evaluates |
| :--- | :--- | :--- |
| **A. Orientation & Design Decisions** (~8 cases) | • *"What are the main design principles and architectural decisions in Kibi?"*<br>• *"What is the overall architecture of this repository and how are packages structured?"*<br>• *"What extension points exist and what are plugins forbidden from doing?"* | Expected ADRs (`ADR-006`, `ADR-022`, `ADR-024`, `ADR-026`, `ADR-capability-plugins-v1`, etc.) and foundational requirements reachable via `kb_map` + follow-up `kb_search` / `kb_query`. |
| **B. Paraphrased Subsystem Questions** (~10 cases) | • *"How does Kibi store data and ensure consistency when multiple processes write?"*<br>• *"What stops two branches from mixing up their requirements or compiled stores?"*<br>• *"How do editor hooks warn before editing a human-approved requirement?"* | Single-shot ADR Recall@6 in `answer.rationale`, Wrong-Lift Noise Rate (e.g., ensuring `REQ-opencode-comment-routing` / `REQ-mcp-structured-text-per-host` stay out of `governing`), and 2-call reachability via `kb_map` vocabulary. |
| **C. Prohibitions, Gaps & History** (~5 cases) | • *"What is forbidden when building migration plans from status or check?"*<br>• *"What changed between the old inline comment annotation strategy and symbols.yaml?"* | Ensures negative-path facts and `notGoverning` / superseded ADRs (`ADR-annotation-strategy`, `ADR-traceability-manifest-only`) stay discoverable. |
| **D. Hard Abstention Traps** (~6 cases) | • *"What is the GDPR retention period for customer emails?"*<br>• *"Which Kubernetes pod autoscaling policy applies to the web tier?"*<br>• *"How are OAuth refresh tokens rotated for mobile clients?"* | `abstained: true` or zero false `governing` / `rationale` hits. |

### 2.2 Evaluation Harness Extension
Extend `scripts/change-to-proof-eval.ts` (or add a dedicated sibling module invoked by `scripts/repo-conceptual-eval.ts`, leaving the existing `repo-search-gold.v4.jsonl` CI gate script contract undisturbed initially):
- **Single-Shot Metrics:**
  - `adrRecallAt6`: fraction of expected ADRs present in `answer.rationale` (plus `results`).
  - `reqRecallAt5`: fraction of expected requirements present in `answer.governing` (for queries with linked expectations).
  - `wrongLiftRate`: count/fraction of cases where an unrelated off-topic requirement lands in `answer.governing`.
  - `abstentionPrecision` / `abstentionRecall` on Stratum D.
- **2-Call Agent Reachability Metric (`twoCallReachability`):**
  - Run `kb_map` (`kibi map --input '{"format":"json"}'`) once per fixture/repo.
  - Check whether every expected ADR ID or target subject key / vocabulary token appears in `kb_map` within its 8 KB budget, AND whether re-running `kb_search` using the exact ADR title/subject words surfaced by `kb_map` places the expected requirements/ADRs in the top 3.

### 2.3 Freshly-Bootstrapped Thin-KB Fixture
Add a deterministic test fixture (`packages/cli/tests/fixtures/thin-bootstrapped-kb/` or builder helper in `packages/cli/tests/map-orientation.test.ts`) modeling a real freshly-bootstrapped project:
- 25 current requirements across 3 components (`auth`, `billing`, `webhooks`), including 6 `firm` requirements and 4 unanchored requirements
- 3 accepted ADRs (2 linked to requirements, 1 unlinked)
- 1 observation fact tagged `kb:project-overview`
- 10 source files (7 linked in `symbols.yaml`, 3 unlinked)

Run `kb_map` and 8 realistic post-bootstrap questions against this fixture to establish empirical baseline data **before** designing Slice 2's bootstrap changes.

---

## 3. Workstream B — `kb_map` / `kibi map` Orientation Read

### 3.1 Prolog Aggregation Predicate (`packages/core/src/discovery.pl`)

Add a deterministic, read-only exported predicate `kb_map_json/3` to `packages/core/src/discovery.pl`, reusing `domain_subjects.pl` and `status.pl`:

```prolog
% In packages/core/src/discovery.pl module exports:
kb_map_json(+DomainFilter, +IncludeAdrs, -JsonString)
```

- **`DomainFilter`:** `none` for full repository orientation, or a domain/subject prefix atom (e.g. `'kibi.engine'` or `'engine'`) to zoom into one area.
- **`IncludeAdrs`:** `true` or `false`.
- **Single-pass data collected from the live RDF store (no body file reads in Prolog):**
  1. `overview`: active `fact` entities with `fact_kind` in `[observation, meta]` and tag `'kb:project-overview'` → `{ id, title, source, updated_at }`.
  2. `adrs`: `adr` entities whose status is not in `[superseded, deprecated, rejected, retired, obsolete, archived]` → `{ id, title, status, firmness, source, tags, linkedReqIds }` (reading both `relates_to` in either direction and `decides` when present, filtered to current requirements).
  3. `subjects`: using `domain_subjects:domain_index/1` and `domain_subjects:requirement_subject/3`:
     - All active subject keys (both defined subject facts and subject keys anchored by current requirements).
     - Per subject key: `{ key, defined, title, source, requirementIds (current), firmReqIds, mustReqIds, adrIds, codeFiles }`, where `codeFiles` come from `kb_relationship(implements, SymId, ReqId)` + `kb_entity(SymId, symbol, SymProps)` (`sourceFile`).
  4. `gaps`:
     - `unanchoredCurrentReqs`: count (and up to 10 sample IDs/titles) of current requirements appearing in zero `requirement_subject/3` tuples.
     - `unlinkedAcceptedAdrs`: count (and IDs) of accepted ADRs linked to zero current requirements.
     - `linkedSourceFiles`: count of distinct `sourceFile` paths referenced by `implements` / `executable_for` symbols.
  5. `stats`: `{ currentRequirements, firmRequirements, acceptedAdrs, definedSubjects, scenarios, tests, linkedSourceFiles }`.
  6. `scope`: `status:status_scope_dict(Scope)` (`snapshotId`, `syncedAt`).

### 3.2 TypeScript Orientation Formatter & Budget Controller (`packages/cli/src/map-orientation.ts`)

Create `packages/cli/src/map-orientation.ts` (parallel to `packages/cli/src/search-answer.ts`) owning grouping, prose reading, dominant-root stripping, and byte-budget fitting:

```ts
export type MapInput = Readonly<{
  domain?: string;
  depth?: number;      // default: 1 after dominant-root stripping (or 2 without)
  includeAdrs?: boolean; // default: true
  maxBytes?: number;   // default: 8_192 (bounded [1024, 32768])
  kb?: string;
}>;
```

#### Grouping & Dominant-Root Stripping Logic
1. Read raw subjects from `discovery:kb_map_json`.
2. **Dominant-root check (when `domain` is omitted):**
   If all subjects sharing the top single first-segment prefix (e.g., `"kibi"`) represent **`>= 75%` of all subjects** AND have **`>= 5` distinct second-level children** (on Kibi's KB: `320 / 360 = 88.9%` with dozens of second-level segments), record `strippedRoot: "kibi"` and group by the next segment (`engine`, `discovery`, `checks`, `cli`, `mcp`, `plugins`, etc.) rather than collapsing 320 subjects into one giant `"kibi"` bucket!
   - **Critical safety rule:** Never alter canonical `subjectKey`s in follow-up calls. `ask` always uses the real stored `subjectKey` (e.g., `kb_query({ factKind: "subject", subjectKey: "kibi.discovery.search" })` or `kb_search({ query: "<area>", semanticFacets: { objects: ["engine"] } })`), while `kb_map({ domain: "discovery" })` automatically matches both `"discovery"` and `"kibi.discovery.*"` when `strippedRoot === "kibi"`.
3. **Prose Extraction (reusing existing helpers):**
   - For `overview` facts: load markdown body via `loadMarkdownBody` (`packages/cli/src/search-ranking.ts`) and extract `proseExcerpt` (`packages/cli/src/search-answer.ts`).
   - For `adrs`: load markdown body and extract `adrExcerpt` (first sentences of `## Decision`, falling back to `## Rationale`/preamble, clipped to ~180 chars).
   - For defined `subjects`: read 1-sentence definition via `readSubjectDefinition` (`packages/cli/src/public/operations/subject-domain.ts`).
4. **Owning Code Directory Aggregation:**
   Collapse symbol `sourceFile` paths to top-2 segments (e.g., `packages/core/src`, `packages/cli/src`) sorted by frequency, capped at 5 per area.
5. **Deterministic Byte-Budget Shrinking (`maxBytes`, default `8_192`):**
   If `Buffer.byteLength(JSON.stringify(payload)) > maxBytes`, mark `truncated: true` and trim deterministically in order:
   1. Trim `sampleFirmRequirements` per area (3 → 1 → 0).
   2. Trim `codeRoots` per area (5 → 2 → 0).
   3. Trim `subdomains` list per area (keep counts).
   4. Drop `decisionExcerpt` from ADRs with fewer linked requirements (least-linked first).
   5. Trim lowest-requirement areas from `areas[]` (keeping `gaps` and `stats` intact so gaps are never hidden).
6. **Output Schema (`kibi.map.v1`):**
   - `version`: `"kibi.map.v1"`
   - `overview`: `{ present: boolean, entries: [{ id, title, summary }] }`
   - `strippedRoot?: string`
   - `areas`: `[{ key, subjectKey?, defined, definition?, requirementCount, firmCount, mustCount, adrIds, codeRoots, subdomains, sampleFirmRequirements, ask }]`
   - `decisions`: `[{ id, title, firmness, tags, decisionExcerpt?, linkedRequirementCount }]`
   - `gaps`: `{ unanchoredCurrentReqs, unanchoredSampleIds, unlinkedAcceptedAdrs, unlinkedAdrIds, linkedSourceFiles }`
   - `stats`: `{ currentRequirements, firmRequirements, acceptedAdrs, definedSubjects, scenarios, tests }`
   - `scope`: `{ branch, snapshotId, syncedAt }`
   - `truncated`: boolean
   - `note`: concise instruction explaining that these are the repo's recorded decisions, firm rules, vocabulary, and ungoverned gaps—and how to drill down with `kb_search` / `kb_query`.
7. **Uncompiled Store Parity:** Just like `executeQuery` and `executeSearch`, call `uncompiledSearchNotice(context)` (`packages/cli/src/public/operations/discovery-executors.ts:239-258`) when the branch store is uncompiled so `kb_map` reports `branchStore` cleanly instead of failing opaquely.

### 3.3 Full Operation, CLI, MCP, Runtime & Agent-Core File Wiring

| Package | File | Change |
| :--- | :--- | :--- |
| `kibi-core` | `packages/core/src/discovery.pl` | Export and implement `kb_map_json/3`. |
| `kibi-cli` | `packages/cli/src/map-orientation.ts` *(new)* | `buildMapPayload`, grouping, dominant-root stripping, byte budget trimmer, text formatter. |
| `kibi-cli` | `packages/cli/src/public/operations/types.ts` | Add `"kb_map"` to `OperationName`. |
| `kibi-cli` | `packages/cli/src/public/operations/contracts.ts` | Add `kb_map` JSON schema to `OPERATION_DATA_SCHEMAS`. |
| `kibi-cli` | `packages/cli/src/public/operations/specs/discovery.ts` | Add `mapSpec` (`name: "kb_map"`, `cliName: "map"`, `requiresProlog: true`, `effects: ["kb-read"]`). |
| `kibi-cli` | `packages/cli/src/public/operations/discovery-executors.ts` | Add `executeMap(input, context)` (reusing `uncompiledSearchNotice`, `requireProlog`, branch metadata). |
| `kibi-cli` | `packages/cli/src/public/operations/catalog.ts` | Register `mapSpec` in `OPERATION_CATALOG` (27 → 28 ops). |
| `kibi-cli` | `packages/cli/src/public/operations/index.ts` | Export `mapSpec`, `executeMap`, `MapInput`, `MapPayload`. |
| `kibi-cli` | `packages/cli/src/cli-operation-metadata.ts` | Add `kb_map` (`cliName: "map"`) metadata entry (must stay in parity with `OPERATION_CATALOG`). |
| `kibi-cli` | `packages/cli/src/cli-operation-loader.ts` | Add lazy `case "kb_map"` loading `mapSpec`. |
| `kibi-cli` | `packages/cli/src/commands/map.ts` *(new)* | Implement `mapCommand(domain, options)` supporting `--input`, `--domain`, `--depth`, `--no-adrs`, `--max-bytes`, `--format json\|table`, `--kb`. |
| `kibi-cli` | `packages/cli/src/cli-register-foundation.ts` | Register `kibi map [domain]` command. |
| `kibi-runtime` | `packages/runtime/src/index.ts` | Re-export `mapSpec`, `executeMap`, `MapInput`, `MapPayload` from `"kibi-cli/operations"`. |
| `kibi-mcp` | `packages/mcp/src/tools/map.ts` *(new)* | Implement `handleKbMap(prolog, args, context)`. |
| `kibi-mcp` | `packages/mcp/src/server/tool-types.ts` & `tools-runtime.ts` | Add `handleKbMap` to `ToolsRuntime` and runtime wiring. |
| `kibi-mcp` | `packages/mcp/src/server/tool-registration.ts` | Register `kb_map` tool handler. |
| `kibi-mcp` | `packages/mcp/src/tools-config.ts` | Add `"kb_map"` to `MCP_TOOL_ORDER`, `DEFAULT_PROFILE_TOOLS` (if approved), and `TOOL_TITLES`. |
| `kibi-mcp` | `packages/mcp/src/server/docs.ts` | Document `kb_map` in server tool overview / workflows. |
| `kibi-agent-core` | `packages/agent-core/src/kb-mcp-tools.ts` | Recognize CLI subcommand `map` → `"kb_map"` alongside `query`/`search`/`status`. |

---

## 4. Workstream C — Weak-Search Orientation Pointer (`discovery-executors.ts`)

In `packages/cli/src/public/operations/discovery-executors.ts` (`executeSearch`, lines 1218–1227):
- Whenever `intentResult.matches.length === 0` (abstained) **or** `searchHintsTrigger(intentResult.analysis) !== null` (weak, `topScore < 0.44`):
  - Append a short, language-neutral pointer to the plain-text digest:
    ```
    Call kb_map for this repository's accepted ADRs, firm rules, subject vocabulary and gaps, or kb_query({"type":"adr"}) to list all ADRs.
    ```
- **Why this works:**
  - In Experiment 1 (abstained), the agent immediately discovers `kb_map` and `kb_query({ type: "adr" })` instead of hitting a vocabulary dead end.
  - In Experiments 2 and 3 (weak lexical score `< 0.44`), the agent receives both the existing hints (if enabled) and the cheap path to full vocabulary orientation.
  - Zero English phrase matching, zero scoring changes, zero change to structured JSON contract.

---

## 5. Workstream D — Search Answer Quality Fixes (`search-answer.ts` & `intent-search.ts`)

### 5.1 Separate ADR Lane (`packages/cli/src/search-answer.ts`)
Currently, `buildSearchAnswer` (`search-answer.ts:1121, 1160-1164`) only inspects `seeds = matches.slice(0, 10)` and caps `rationale` at `SEARCH_ANSWER_LIMITS.rationale = 3` (line 308):
1. Raise `SEARCH_ANSWER_LIMITS.rationale` from `3` to `6`.
2. Scan **all** `matches` (not just the top 10 `seeds`) for entities with `entity.type === "adr"` and `!SUPERSEDED_ADR_STATUSES.has(text(entity.status))`, preserving rank order up to `limits.rationale` (`6`). Fetch their rows/bodies in the existing batch `graph.fetch` round trip (bounded within `entityLoads` or as needed for the ≤6 ADRs).
   - **Expected impact on Experiment 3:** `ADR-024` (at rank #10 with score `0.208`) was previously crowded out by rank-1..4 entries and dropped by the cap of 3; scanning across `matches` with cap `6` surfaces `ADR-024` directly in `answer.rationale`!
   - Keep `fitSearchAnswer` byte-budget protection intact (`ANSWER_TRIM_ORDER` drops excerpts first before dropping rationale entries).

### 5.2 Floor on Weak Lifts into `governing` (`packages/cli/src/search-answer.ts`)
Currently, any non-requirement entity in the top-10 `seeds` proposes its owning requirement into `candidates` (`search-answer.ts:1201-1202, 1235-1240, 1258`) regardless of how far below the top match it scored or whether only ADRs matched strongly.

1. Define a relative lift floor constant:
   ```ts
   export const LIFT_SCORE_RATIO = 0.75; // Validate against v4 + conceptual gold sets
   ```
2. Compute `topSeedScore = matches[0]?.score ?? 0` and `liftFloor = topSeedScore * LIFT_SCORE_RATIO`.
3. **Rule:**
   - Direct `req` matches always enter `candidates` (unaffected by `liftFloor`).
   - Non-`req` matches (`scenario`, `test`, `fact`, `symbol`) only propose owning requirements into `candidates` when `match.score >= liftFloor`! (They still enter `ungoverned` or `observations` normally if relevant, or are simply not promoted as governing policy.)
4. **Important Empirical Caveat Checked Ahead of Coding:**
   Let's check the exact numbers observed in Experiments 2 and 3:
   - **Experiment 2:** Top score = `0.318` (`ADR-019`). `TEST-mcp-structured-text-per-host` scored `0.204` (`0.204 / 0.318 = 0.642 < 0.75`). A `0.75` floor **cleanly blocks** `REQ-mcp-structured-text-per-host` from polluting `governing`!
   - **Experiment 3:** Top score = `0.350` (`ADR-010`), while `SCEN-opencode-python-comment-routing` scored `0.312` (`0.312 / 0.350 = 0.891 > 0.75`)! **Why did an OpenCode Python comment scenario score `0.312` on *"How does Kibi store data and ensure consistency when multiple processes write?"*?**
     - During implementation, inspect the exact token matches of `SCEN-opencode-python-comment-routing` on Experiment 3 (`"store"`, `"data"`, `"write"`, `"multiple"`?) rather than blindly bumping `LIFT_SCORE_RATIO` above `0.90` (which could break legitimate scenario/test lifts on `repo-search-gold.v4.jsonl`!).
     - Test candidate refinements against `repo-search-gold.v4.jsonl` if `0.75` alone leaves `SCEN-opencode-python-comment-routing` above floor: for example, checking whether a scenario/test lift requires either title/metadata token overlap or a stronger minimum absolute score (`>= 0.33` or `match.reasons` not purely body-incidental). Only adopt what keeps all 37 `v4` gold cases green!
5. **Honest ADR-Only `answerNote`:**
   Update `answerNote` (`search-answer.ts:1576-1608`) to take `rationaleCount` as well: when `governingCount === 0 && rationaleCount > 0`, say:
   `"Architectural decisions (ADRs) matched this query, while no current requirement matched strongly enough to enter governing. Review the listed rationale ADRs or call kb_map to explore related requirements and subject keys."`

### 5.3 Minimal Meta-Framing Stop Words (`packages/cli/src/intent-search.ts`)
Add `"design"`, `"main"`, `"overall"`, `"principle"` (which stems or normalizes cleanly with plural stripping: check `"principles"` → `"principle"` in `normalize()` at `intent-search.ts:322-331` — note `"principles"` has length 10, ends with `"s"`, not `"ss"`/`"ies"`, so it slices `"s"` → `"principle"`, length 9, `stem` skips `STEM_SUFFIXES` and strips trailing `"e"`? Wait: verify! `stem("principle")` at lines 340–353: `stemmed = "principle"` → `stemmed.length > 4 && stemmed.endsWith("e")` → returns **`"principl"`**! Meanwhile `STOP_TOKENS` computes `Array.from(STOP_WORDS).flatMap((word) => [word, normalize(word)])` at lines 357–359, so putting `"principle"` in `STOP_WORDS` automatically puts `"principl"` in `STOP_TOKENS`!).
- **Strict boundary:** Do **not** change `scoreEntity` channel weights (`0.58`/`0.17`/`0.20`/`0.05`), `minScore` (`0.18`), or `SEARCH_HINT_WEAK_SCORE` (`0.44`).
- Verify `repo-search-gold.v4.jsonl` and the hints gold gate immediately after this edit; ensure zero regressions and confirm `topScore` calibration holds.

---

## 6. Workstream E — KB Governance, Skills, Docs, Changeset & Proof Checklist

Following `AGENTS.md` and `.kb/` rules:

1. **Knowledge Base Updates (via `kb_upsert` / `kb_record` after maintainer approval):**
   - Supersede `REQ-kibi-mcp-tool-catalog` (`firm`, with maintainer sign-off) for 19 → 20 default tools (`kb_map`), and update `REQ-kibi-operation-catalog-names` + `REQ-kibi-mcp-tool-consolidation`.
   - Author new requirements, scenarios, tests, and facts for:
     - `kb_map` / `kibi map` orientation read (`REQ-kibi-map-orientation`),
     - `kb_search` ADR lane cap & all-match scan (`REQ-search-answer-adr-lane`),
     - Weak-lift floor & ADR-only note (`REQ-search-answer-lift-floor`),
     - Orientation pointer on weak/abstained search (`REQ-search-weak-map-pointer`).
   - Update `.kb/symbols.yaml` for all new/modified exported symbols across `packages/core/src/discovery.pl`, `packages/cli/src/`, `packages/mcp/src/`, and `packages/agent-core/src/`.
2. **Skills & Multi-Host Sync:**
   - Update `packages/runtime/src/skills/kibi-usage/SKILL.md` and its `resources/` (`operation-access.md`, `operation-fields.md`, `interfaces.md`) to cover `kb_map` / `kibi map`.
   - Run `scripts/sync-agent-skills.ts` so every supported host adapter receives the updated skill and `kb-mcp-tools` builds cleanly.
3. **Documentation & Release Hygiene:**
   - Update `README.md`, `docs/mcp-reference.md`, `docs/cli-reference.md`, and `docs-site/` (`landingContent` in `docs-site/theme.ts` and linked pages) to describe `kb_map` / `kibi map` accurately as a user-facing feature.
   - Add a changeset under `.changeset/` summarizing user impact and technical changes.

---

## 7. Exact Test & Verification Plan

### 7.1 Targeted Unit, Prolog & Parity Tests
- **Prolog (`packages/core/tests/`):** Add `kb.plt` / `discovery.pl` unit tests covering `kb_map_json/3` on empty KB, dominant-root KB, multi-root KB, `domain` filter zoom, `includeAdrs: false`, `kb:project-overview` observation read, and gap counts.
- **TypeScript (`packages/cli/tests/`):**
  - `map-orientation.test.ts` (new): dominant-root stripping (`>= 75%` and `< 75%` control), deterministic `maxBytes` truncation order, uncompiled store notice, `adrExcerpt` reading, thin-KB fixture verification, and parity across `executeMap` and `kibi map`.
  - `search-answer.test.ts`: ADR lane cap raised to 6 across all matches (including rank #10+), `LIFT_SCORE_RATIO` blocking weak lifts while keeping strong scenario/test lifts, ADR-only `answerNote`.
  - `intent-search.test.ts`: meta-framing stop words (`"design"`, `"main"`, `"overall"`, `"principle"`).
  - Existing parity/catalog tests to update: `packages/cli/tests/operations/catalog.test.ts`, `import-purity.test.ts`, `cli-operation-metadata.test.ts`, `packages/cli/tests/proofs/claims/operation-catalog-names.proof.test.ts`.
- **MCP & Agent-Core (`packages/mcp/tests/`, `packages/agent-core/tests/`):**
  - `packages/mcp/tests/proofs/tool-catalog.proof.test.ts` (19 → 20), `tool-profile.proof.test.ts` (if `kb_map` added to `DEFAULT_PROFILE_TOOLS`), `tool-registration-exact.test.ts`, `tools-coverage.test.ts`, `structured-text-host.test.ts`.
  - `packages/agent-core/tests/kb-mcp-tools.test.ts` (`kibi map` recognition).

### 7.2 Gold Gates & Proof Verification
1. **Existing CI Search Gates (Must Pass Unmodified):**
   - `repo-search-gold.v4.jsonl` against `repo-search-thresholds.json` (zero threshold changes).
   - Hints gold gate (`repo-search-hints-gold.v2.jsonl` on `develop`, or branch's current hints gold set).
2. **New Conceptual Gold Gate & Thin-KB Report:**
   - Record before/after measurements on `repo-search-conceptual-gold.v1.jsonl` (single-shot AND 2-call `kb_map` → `kb_search` reachability) and the thin-KB fixture.
3. **Full Suite, Kibi Self-Check & Proof Baseline:**
   - `bun test` (full workspace test run)
   - `bun run build`
   - `npx --no-install kibi sync && npx --no-install kibi check && npx --no-install kibi status`
   - `bun run proof:prepush` and `bun run proof:replay`
   - `ocr delegate preview` self-review before commit.

---

## 8. Final Confirmation Points Before Starting Implementation

Please confirm these three quick points before I begin coding Slice 1:

1. **Tool Catalog (`REQ-kibi-mcp-tool-catalog`, `firm`):** Confirm superseding the firm catalog count from **19 to 20** for `kb_map`—and confirm whether `kb_map` should also be included in the opt-in `core` profile (`DEFAULT_PROFILE_TOOLS`, 8 → 9 tools).
2. **`SESSION_BRIEF` Scope (`REQ-agent-core-session-brief`):** Confirm keeping the 5-line `SESSION_BRIEF` unchanged in Slice 1 (relying on `kb_map`'s discoverable tool name, weak-search pointers, MCP instructions, and `kibi-usage` skill) vs. adding a line to `SESSION_BRIEF`.
3. **Slice Boundary:** Confirm starting immediately with **Workstream A** (`repo-search-conceptual-gold.v1.jsonl` + thin-KB fixture baseline) followed by **Workstreams B–E**, keeping Slice 2 (ADR link check, 11-ADR repair, ADR-to-req lifting, and bootstrap overview capture) as the clean next PR/slice.
