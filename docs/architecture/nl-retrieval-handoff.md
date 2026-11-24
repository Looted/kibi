# Agent Handoff Document: Repository Orientation (`kb_map`) and Natural-Language Retrieval (Architecture Plan v2 & Slice 1)

**Date:** 2026-11-23  
**Branch:** `develop`  
**Companion Documents in Repo:**
- Original Architecture Plan (RFC v2): [`docs/architecture/nl-retrieval-and-orientation.md`](./nl-retrieval-and-orientation.md)
- Slice 1 Implementation Plan: [`docs/architecture/nl-retrieval-slice-1-plan.md`](./nl-retrieval-slice-1-plan.md)
- Conceptual Gold Set (28 cases): [`documentation/evaluations/change-to-proof/repo-search-conceptual-gold.v1.jsonl`](../../documentation/evaluations/change-to-proof/repo-search-conceptual-gold.v1.jsonl)
- Conceptual Evaluator Script: [`scripts/repo-conceptual-eval.ts`](../../scripts/repo-conceptual-eval.ts)

---

## Part 1: Current Execution Status & Handoff Guide

### 1.1 Maintainer Approvals (Already Confirmed on 2026-11-23)
The maintainer explicitly approved all three pre-implementation confirmation gates (`"1. Approve all / 2. Confirm / 3. Confirm"`):
1. **Dedicated `kb_map` MCP Tool (`kibi map` CLI peer):**
   - Supersede `REQ-kibi-mcp-tool-catalog` (`firm`, **19 → 20** default tools).
   - Add `kb_map` to `DEFAULT_PROFILE_TOOLS` (`core` profile: **8 → 9** tools).
   - Update `REQ-kibi-operation-catalog-names` (**27 → 28** operations in `OPERATION_CATALOG`).
2. **Keep `SESSION_BRIEF` (`packages/agent-core/src/session-brief.ts`) unchanged** in Slice 1 (relying on `kb_map` tool discoverability, weak-search pointers, MCP instructions, and `kibi-usage` skill).
3. **Slice Boundary:** Complete **Slice 1** end-to-end first (Workstreams A–E); keep **Slice 2** (ADR link check rule, repairing Kibi's 11 unlinked accepted ADRs, single ADR link convention, score-ranked ADR-to-requirement lifting, and bootstrap `kb:project-overview` write action) as a separate follow-up PR.

---

### 1.2 Critical Environment & Workspace Rules
1. **Shell `PATH` for `bun` and `node`:**  
   If your shell environment does not include `bun` and `node` on default `PATH`, prefix commands with:
   ```bash
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH"
   ```
   (`swipl` is at `/usr/bin/swipl`.)
2. **Preserve Pre-Existing Uncommitted Work:**  
   The working tree contains pre-existing uncommitted work for `packages/antigravity/` (`.changeset/antigravity-plugin.md`, antigravity `.kb/` entities, `.kb/symbols.yaml`, `.kb/relationships/*.yaml`, `AGENTS.md`, `README.md`, `docs-site/`, `package.json`, `scripts/`). **Never run `git checkout -- .`, `git reset --hard`, or `git add -A`**, and do not revert unrelated changes.
3. **Kibi Governance Rules:**
   - **Never** read or edit `.kb/` files directly; use visible `kb_*` MCP tools or `npx --no-install kibi <route> --input -`.
   - **Never** add `// implements` comments in source code (`ADR-traceability-manifest-only`); link symbols in `.kb/symbols.yaml` via `kb_upsert`.
   - **Never** hand-edit package versions or release manifests (`packages/core/release.json`, `releases/history.json`).

---

### 1.3 What Is Already Completed & Verified in the Working Tree

| Workstream / Step | Status | Files Created or Modified | Verification Run |
| :--- | :--- | :--- | :--- |
| **Workstream A: Conceptual Gold Set & Pre-Change Baseline** | **DONE** | • `documentation/evaluations/change-to-proof/repo-search-conceptual-gold.v1.jsonl` (28 curated cases across Strata A, B, C, D; all expected IDs verified via `kb_query`)<br>• `scripts/repo-conceptual-eval.ts` (supports `--single-shot-only` and full single-shot + 2-call `kb_map` → `kb_search` evaluation) | Baseline run recorded (see Section 1.4 below). |
| **Workstream B (Step 1): Prolog `discovery:kb_map_json/3`** | **DONE** | • `packages/core/src/discovery.pl` (exported & implemented `kb_map_json/3` collecting `overview`, `adrs`, `subjects`, `gaps`, `stats`, `scope` in one pass without disk body reads)<br>• `packages/core/tests/domain_subjects.plt` (added `kb_map_json_empty_kb` and `kb_map_json_collects_overview_adrs_subjects_and_gaps`)<br>• `packages/core/tests/discovery.plt` (added `discovery_kb_map` test block) | `swipl -q -g "load_files(['packages/core/tests/domain_subjects.plt']), (run_tests -> halt(0) ; halt(1))"` → **64/64 passed**.<br>`swipl -q -g "load_files(['packages/core/tests/discovery.plt']), (run_tests(discovery_kb_map) -> halt(0) ; halt(1))"` → **1/1 passed**. |
| **Workstream B (Step 2): TypeScript `map-orientation.ts` & All 18 Wiring Sites** | **DONE** | • `packages/cli/src/map-orientation.ts` *(new)* (`MAP_DEFAULT_MAX_BYTES = 8_192`, `DOMINANT_ROOT_SHARE = 0.75`, `DOMINANT_ROOT_MIN_CHILDREN = 5`, dominant-root stripping, `buildMapPayload`, `fitMapPayload`, `formatMapText`)<br>• `packages/cli/src/commands/map.ts` *(new)* (`kibi map [domain]`)<br>• `packages/cli/src/public/operations/types.ts` (`"kb_map"` added to `OperationName`)<br>• `packages/cli/src/public/operations/contracts.ts` (`kb_map` added to `BASE_DATA_SCHEMAS` and `EFFECT_OVERRIDES`)<br>• `packages/cli/src/public/operations/result-budget.ts` (`kb_map` `"fitted"` entry in `RESULT_BUDGETS`)<br>• `packages/cli/src/public/operations/discovery-executors.ts` (`executeMap`)<br>• `packages/cli/src/public/operations/specs/discovery.ts` (`mapSpec`)<br>• `packages/cli/src/public/operations/catalog.ts` (`mapSpec` in `OPERATION_CATALOG`, 27 → 28)<br>• `packages/cli/src/cli-operation-metadata.ts` (`kb_map` metadata matching `mapSpec.description` verbatim)<br>• `packages/cli/src/cli-operation-loader.ts` (`case "kb_map"`)<br>• `packages/cli/src/cli-register-json.ts` (`"kb_map"` in `INTEGRATED_OPERATIONS`)<br>• `packages/cli/src/cli-register-foundation.ts` (`kibi map [domain]` command)<br>• `packages/runtime/src/index.ts` (re-exports `mapSpec`, `executeMap`, `MapInput`, `MapPayload`)<br>• `packages/mcp/src/tools/map.ts` *(new)* (`handleKbMap`)<br>• `packages/mcp/src/server/tool-types.ts`, `tools-runtime.ts`, `tool-registration.ts`<br>• `packages/mcp/src/tools-config.ts` (`MCP_TOOL_ORDER` 19→20, `DEFAULT_PROFILE_TOOLS` 8→9, `TOOL_TITLES`)<br>• `packages/mcp/src/server/docs.ts` (`PROMPTS` & `DOC_RESOURCES` updated)<br>• `packages/agent-core/src/kb-mcp-tools.ts` (`map: "kb_map"` in `KIBI_CLI_ROUTES`) | Wired and ready for `bun run build` + unit/contract tests in Step 5. |
| **Workstream C (Step 3): Weak-Search Orientation Pointer** | **DONE** | • `packages/cli/src/public/operations/discovery-executors.ts` (`executeSearch` appends `' Call kb_map for this repository\'s accepted ADRs, firm rules, subject vocabulary and gaps, or kb_query({"type":"adr"}) to list all ADRs.'` when `matches.length === 0` or `searchHintsTrigger(analysis) !== null`) | Wired in `executeSearch`. |

---

### 1.4 Pre-Change Conceptual Baseline Metrics (Recorded Before Edits)
Baseline evaluation of `repo-search-conceptual-gold.v1.jsonl` (`--single-shot-only` before any code changes):
- **`caseCount`:** `28` (`adrCaseCount: 16`, `reqCaseCount: 21`, `abstentionCount: 6`)
- **`adrRecallAt6`:** `0.6875` (`11 / 16`)
- **`reqRecallAt5`:** `0.4762` (`10 / 21`)
- **`wrongLiftCaseCount`:** `2`:
  - `conc-repo-architecture` lifted `REQ-mcp-structured-text-per-host` (via rank #5 `TEST-mcp-structured-text-per-host`, score `0.204` vs top `0.318`, ratio `0.642 < 0.75`)
  - `conc-multiprocess-persistence` lifted `REQ-opencode-comment-routing` (via rank #3 `SCEN-opencode-python-comment-routing`, score `0.312` vs top `0.350`, ratio `0.891` due to a fenced Python comment example `# We chose PostgreSQL ... strong consistency ... data integrity` in Step 6 of that scenario; meanwhile `ADR-024` sat at rank #10 in `resultIds` and was dropped from `rationaleIds` by the cap of 3!)
- **`abstentionPrecision`:** `0.8333` (`5 / 6`)
- **`abstentionRecall`:** `0.8333` (`5 / 6`; `conc-trap-postgres-sharding` matched `ADR-017` at `0.1838` because `ADR-017` mentions sharded relationship files and PostgreSQL/SQLite)
- **`latencyMs`:** `p50: 1721`, `p95: 1838`, `max: 1864`

---

### 1.5 Exact Remaining Work (Steps 4, 5, and 6)

#### Step 4: Workstream D — Search Answer Hygiene & Meta-Framing Stop Words
1. **Edit `packages/cli/src/search-answer.ts`:**
   - Raise `SEARCH_ANSWER_LIMITS.rationale` (line 308) from `3` to `6`.
   - Export `export const LIFT_SCORE_RATIO = 0.75;`.
   - In `buildSearchAnswer` (around lines 1120–1260):
     - Before the initial `graph.fetch`, scan **all** `matches` (not just top 10 `seeds`) for non-superseded ADRs (`text(match.entity.type) === "adr" && !SUPERSEDED_ADR_STATUSES.has(text(match.entity.status))`). If `allMatchedAdrs.length > limits.rationale`, set `truncated = true`. Take `matchedAdrs = allMatchedAdrs.slice(0, limits.rationale)` and `matchedAdrIds = matchedAdrs.map((m) => text(m.entity.id))`.
     - Fetch `rows: unique([...seedIds, ...matchedAdrIds])` alongside `edges: seedIds` in the single initial `graph.fetch` round trip, seeding any missing matched ADR rows with their search row fallback just like `seeds`.
     - Populate `rationaleRows` first from `matchedAdrIds` in match-rank order (verifying `!SUPERSEDED_ADR_STATUSES.has(text(row.status))` after loading full rows), while keeping the existing step at line 1450 that adds linked ADRs from `governing` requirements (`for (const adr of adrRows) rationaleRows.set(text(adr.id), adr)`).
     - Compute `const liftFloor = (matches[0]?.score ?? 0) * LIFT_SCORE_RATIO;`.
     - Gate non-`req` requirement lifts by `match.score >= liftFloor`:
       - Direct `req` matches (`type === "req"`) are **unaffected** by `liftFloor`.
       - For `scenario` / `symbol` / direct `fact` with `owners.length > 0` (line 1201): only call `propose(...)` when `match.score >= liftFloor` (do **not** push owned-but-below-floor matches into `ungoverned`!).
       - For `test` (`testTargets`, lines 1235 & 1239): still resolve `test.targets.length === 0` into `ungoverned`, and when `test.targets.length > 0`, only call `propose(...)` when `test.score >= liftFloor`.
       - For `fact` (`assumedFacts`, line 1258): still resolve `owners.length === 0` into `ungoverned`, and when `owners.length > 0`, only call `propose(...)` when `fact.score >= liftFloor`.
     - Update `answerNote(governingCount: number, ungoverned: readonly SearchAnswerUngoverned[], rationaleCount = 0)` (lines 1566, 1576–1608) and pass `rationale.length` at line 1566:
       - When `governingCount === 0 && rationaleCount > 0`, return:
         `lead + ungovernedFact + overridden + "Architectural decisions (ADRs) matched this query, while no current requirement matched strongly enough to enter governing. Review the listed rationale ADRs or call kb_map to explore related requirements and subject keys."`
       - Keep the existing `governingCount === 0` message when `rationaleCount === 0` and existing `governingCount > 0` message unchanged.
2. **Edit `packages/cli/src/intent-search.ts`:**
   - Add `"design"`, `"main"`, `"overall"`, `"principle"` to `STOP_WORDS` (lines 142–212; `STOP_TOKENS` automatically includes `normalize("principle") === "principl"`, which matches `"principles"`).
   - **Do NOT** alter channel weights (`0.58`/`0.17`/`0.20`/`0.05`), `minScore` (`0.18`), or `SEARCH_HINT_WEAK_SCORE` (`0.44`).

#### Step 5: Build, Unit/Contract/Parity/Proof Tests & Gold Gates
1. **Build packages:**
   ```bash
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" bun run build
   ```
2. **Add new unit tests:**
   - `packages/cli/tests/map-orientation.test.ts` *(new)*:
     - Dominant-root stripping (`>= 75%` share & `>= 5` children strips root; `< 75%` multi-root does not strip).
     - `domain` zoom matching both canonical key and stripped-root shorthand.
     - Deterministic `maxBytes` truncation order (`sampleFirmRequirements` → `codeRoots` → `subdomains` → `decisionExcerpt` → `areas`, keeping `gaps` and `stats` intact).
     - `kb:project-overview` observation read + `adrExcerpt` extraction.
     - Uncompiled branch store notice parity (`branchStore`).
     - **Freshly-bootstrapped thin-KB fixture** (25 current reqs across `auth`/`billing`/`webhooks`, 6 `firm`, 4 unanchored, 3 accepted ADRs with 2 linked & 1 unlinked, 1 `kb:project-overview` observation fact, 10 source files with 7 linked & 3 unlinked) verifying `kb_map` output + 8 realistic post-bootstrap queries.
     - CLI `kibi map` + `kibi map --input -` parity.
   - `packages/cli/tests/search-answer.test.ts`: ADR lane cap 6 scanning beyond rank #10 (`seeds`), `LIFT_SCORE_RATIO = 0.75` blocking weak lifts without leaking owned items into `ungoverned`, ADR-only `answerNote`.
   - `packages/cli/tests/intent-search.test.ts`: meta-framing stop words (`"design"`, `"main"`, `"overall"`, `"principle"` / `"principles"`).
   - `packages/agent-core/tests/kb-mcp-tools.test.ts`: `kibiCliOperation("kibi map")` and `kibiCliOperation("npx --no-install kibi map --input -")` return `"kb_map"`.
3. **Update existing catalog/profile/parity/proof tests & golden fixtures:**
   - `packages/cli/tests/operations/catalog.test.ts` (27 → 28, add `kb_map: "map"`).
   - `packages/cli/tests/operations/import-purity.test.ts` (27 → 28).
   - `packages/cli/tests/parity/cases.ts` (add `kb_map` parity case) & `packages/cli/tests/parity/harness.test.ts` (27 → 28).
   - `packages/cli/tests/proofs/claims/operation-catalog-names.proof.test.ts` (27 → 28, add `"kb_map"`).
   - Regenerate CLI public-mutation goldens:
     ```bash
     PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" KIBI_UPDATE_GOLDEN=1 bun test packages/cli/tests/public-mutation/
     ```
   - `packages/mcp/tests/parity/registry-completeness.test.ts` (27 → 28).
   - `packages/mcp/tests/tools-config-exact.test.ts` (add `kb_map`).
   - `packages/mcp/tests/proofs/tool-catalog.proof.test.ts` (19 → 20, update claim value `20` and test descriptions).
   - `packages/mcp/tests/proofs/tool-profile.proof.test.ts` (add `"kb_map"` to `DEFAULT_PROFILE_TOOLS` sorted expectation).
   - `packages/mcp/tests/server/tool-profile.test.ts`, `server-start-exact.test.ts`, `tools-coverage.test.ts`, `tool-registration.coverage.test.ts`, `tool-registration-exact.test.ts`, `tool-surface-consumer.test.ts`, `tools/job-status.test.ts` (19 → 20), `server.test.ts`.
   - Add `kb_map` seed entry to `packages/mcp/tests/fixtures/contracts/seed/seed.json` and update `packages/mcp/tests/server/tools-contract-fixture.test.ts` (19 → 20, add `"kb_map"`), then regenerate MCP contract fixtures:
     ```bash
     PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" UPDATE_MCP_CONTRACT_FIXTURES=1 bun test packages/mcp/tests/server/tools-contract-fixture.test.ts
     ```
   - Update `packages/mcp/tests/fixtures/contracts/docs-and-prompts.json` to match `packages/mcp/src/server/docs.ts` (verified by `packages/mcp/tests/server/docs-exact.test.ts`).
4. **Run unit tests, Prolog tests, and gold gates:**
   ```bash
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" bun run test:unit
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" bun run test:coverage:prolog
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" bun run build
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" bun run scripts/change-to-proof-eval.ts --repo-kb documentation/evaluations/change-to-proof/repo-search-gold.v4.jsonl --thresholds documentation/evaluations/change-to-proof/repo-search-thresholds.json
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" bun run scripts/change-to-proof-eval.ts --repo-kb documentation/evaluations/change-to-proof/repo-search-hints-gold.v1.jsonl --thresholds documentation/evaluations/change-to-proof/repo-search-hints-thresholds.json
   PATH="/home/looted/.bun/bin:/home/looted/.nvm/versions/node/v24.21.0/bin:$PATH" bun run scripts/repo-conceptual-eval.ts
   ```

#### Step 6: Workstream E — KB Governance, Multi-Host Skills, Docs, Changeset & Final Verification
1. **KB Updates (strictly via `kb_upsert` / `kb_record`):**
   - Supersede firm `REQ-kibi-mcp-tool-catalog` with `REQ-kibi-mcp-tool-catalog-v2` (`firm`, `origin: { kind: "human", ref: "maintainer approval 2026-11-23 (Slice 1 nl-retrieval-slice-1-plan.md)", approved_by: "maintainer" }`, `## Why this changed` explaining 19 → 20 default tools for `kb_map`), mark `REQ-kibi-mcp-tool-catalog` `status: "superseded"`, update `FACT-mcp-default-tool-count` (`value_int: 20`) and `TEST-proof-mcp-default-tool-count`.
   - Update `REQ-mcp-default-tool-profile`, `FACT-mcp-default-profile-tools` (8 → 9 with `kb_map`), and `TEST-proof-mcp-default-profile-tools`.
   - Update `REQ-kibi-operation-catalog-names`, `FACT-operation-catalog-names` (27 → 28 with `kb_map`), and `TEST-proof-operation-catalog-names`.
   - Author new requirements, facts, scenarios, and tests:
     - `REQ-kibi-map-orientation` (`SCEN-kibi-map-orientation`, `TEST-kibi-map-orientation`)
     - `REQ-search-answer-adr-lane` (`SCEN-search-answer-adr-lane`, `TEST-search-answer-adr-lane`)
     - `REQ-search-answer-lift-floor` (`SCEN-search-answer-lift-floor`, `TEST-search-answer-lift-floor`)
     - `REQ-search-weak-map-pointer` (`SCEN-search-weak-map-pointer`, `TEST-search-weak-map-pointer`)
   - Update `.kb/symbols.yaml` via `kb_upsert` for all new/modified symbols (`discovery.pl`, `map-orientation.ts`, `commands/map.ts`, `discovery-executors.ts`, `specs/discovery.ts`, `tools/map.ts`, `search-answer.ts`, `intent-search.ts`, etc.).
   - Record any required `kb_review_firm_edit` receipts (`verdict: "keeps"`) for touched symbols implementing firm requirements that remain true.
2. **Skills & Multi-Host Sync:**
   - Update `packages/runtime/src/skills/kibi-usage/SKILL.md` and `resources/` (`operation-access.md`, `operation-fields.md`, `interfaces.md`) to teach `kb_map` / `kibi map`.
   - Run `bun run sync:agent-skills` to propagate across all supported host packages (`claude`, `codex`, `cursor`, `opencode`, `zcode`, `antigravity`).
3. **Docs & Changeset:**
   - Update `README.md`, `docs/mcp-reference.md`, `docs/cli-reference.md`, and `docs-site/theme.ts` (`landingContent`).
   - Add `.changeset/kb-map-and-search-hygiene.md` (2–4 sentences of user impact + technical summary).
4. **Final Verification:**
   - `bun run check` (Biome)
   - `bun run build`
   - `bun run test:unit` + `bun run test:coverage:prolog`
   - `npx --no-install kibi sync && npx --no-install kibi check && npx --no-install kibi status` (clean & fresh)
   - Proof runs (`bun run proof:run` / `proof:prepush` / `proof:replay`)
   - Self-review diff with `ocr delegate preview` (`.agents/skills/open-code-review-delegate/SKILL.md`).

---

## Part 2: Original Architecture Plan (RFC v2)

*(Full text of [`docs/architecture/nl-retrieval-and-orientation.md`](./nl-retrieval-and-orientation.md))*

### Executive Summary & What Changed from v1 to v2

Following a comprehensive empirical review against `develop` (`a00d3513`) and maintainer design decisions, this v2 plan replaces the heavy v1 retrieval overhaul with a **lean, zero-dependency Tier-0 architecture** built in two small slices, while deferring speculative ML/indexing machinery until measured evidence on a conceptual gold set proves a remaining gap.

#### Locked Maintainer Decisions
1. **Dedicated `kb_map` Tool (`kibi map` CLI peer):** Ship `kb_map` as the 20th default MCP tool (rather than overloading empty `kb_query({})`) so orientation is immediately discoverable across tool catalogs, host hooks, and CLI help, with explicit maintainer approval to supersede `REQ-kibi-mcp-tool-catalog` (`firm`, `19 -> 20`).
2. **Product Positioning — Governance Orientation, Not a General Repo Tour:** Frame `kb_map` narrowly and truthfully around Kibi's core mission: *"the architectural decisions, firm rules, subject vocabulary, and ungoverned gaps you must respect here"*—not a generic wiki/code tour.
3. **Bootstrap Overview Stored as a Non-Firm Observation Fact:** Persist `bootstrapContext.projectSummary` as a standard `observation` fact tagged `kb:project-overview` (non-firm, **outside** the `subject` ancestry tree), avoiding root-prefix contradiction-pairing explosions and firm-edit friction.

#### What Was Cut or Deferred from v1 (and Why)
- **Cut: Persistent derived card index & latency claims.** Synchronous `.md` body reads across Kibi's KB take ~35 ms out of ~3.2–3.4 s total CLI search latency; the actual latency sits in Prolog answer verdicts, candidate paging, and graph edges. A second branch/snapshot-synchronized index solves a non-bottleneck.
- **Cut: Replacing `intent-v1` scoring with BM25F + adaptive channel weights.** Because `repo-search-gold.v4.jsonl` already consists of plain NL queries without `sourceLocations` or `semanticFacets`, the `0.58` lexical ceiling is already priced into the `0.18` acceptance threshold and firm `0.44` hint cutoff. Replacing the scoring scale invalidates calibrated thresholds without measured need.
- **Cut: English phrase-list question routing.** Breaks non-English KBs while the rest of Tier 0 stays language-neutral.
- **Cut: Replacing the full search pool with Governance Cards.** Would hide 40 observation facts, 9 meta facts, negative-path facts (*"what is forbidden"*), 719 `assumes`-only facts, and 583 tests without direct requirement links.
- **Deferred (data-gated): `kibi.semantic-retrieval.v1`, ONNX bi-encoder/cross-encoder plugin, LLM reranker, `kibi ask`, and `search-answer.v2`.** In five of six Kibi setups, the caller is already a frontier LLM that reranks far better than a small local cross-encoder once shown the KB's vocabulary. Any semantic tier waits until the conceptual gold set (scored on both single-shot and 2-call orientation + search workflows) shows an actual remaining gap—followed first by a throwaway spike rather than premature SDK/packaging commitments.

### Problem Statement & Empirical Reality

When a user bootstraps Kibi or opens an unfamiliar repository and asks an agent to use Kibi to understand what governs the repository, `kb_search` currently fails on open-ended natural-language questions.

#### Reproduced Failure Traces on Kibi's Own KB (~5,900 Entities)
1. **Experiment 1 — Broad Principles Listing Request:**  
   *Query:* `"What are the main design principles and architectural decisions in Kibi?"`  
   *Result:* `intent-v1` returned `count: 0`, `abstained: true` across ~5,905–5,946 candidates. `kibi-plugin-search-hints` (`potion-base-8M`) fired on abstention and returned 10 noisy hints led by `REQ-kibi-skills-write-without-ritual` (`0.718` via `SYM-kibi-decisions-skill-guidance`), adapter package reqs, and proof-regex tests—and **zero ADRs**.
2. **Experiment 2 — Repository Structure & Package Overview:**  
   *Query:* `"What is the overall architecture of this repository and how are packages structured?"`  
   *Result:* Top 4 ranked matches were ADRs (`ADR-019`, `ADR-025`, `ADR-capability-plugins-v1`, `ADR-013`), while `ADR-006` (*Monorepo structure*) missed lexically and sat at hint #4. Worse, `answer.governing` contained **only** `REQ-mcp-structured-text-per-host`, lifted from rank #5 `TEST-mcp-structured-text-per-host` (`0.204`).
3. **Experiment 3 — Paraphrased Subsystem Question:**  
   *Query:* `"How does Kibi store data and ensure consistency when multiple processes write?"`  
   *Result:* `SCEN-opencode-python-comment-routing` ranked #3 (`0.312`) and polluted `answer.governing` with `REQ-opencode-comment-routing`; `ADR-024` (*Journaled single-writer engine*) landed at rank #10 (`0.208`) and was **dropped from `answer.rationale`** because `SEARCH_ANSWER_LIMITS.rationale` is `3`. `REQ-kibi-engine-durable-transactions` never appeared.

#### The Decisive Counter-Experiment: Vocabulary, Not Ranking, Is the Primary Bottleneck
When re-asking Experiment 3 and Experiment 2 using the KB's own terminology—**with zero code changes**—today's `intent-v1` search succeeded immediately:
- `"journaled single-writer engine persistence and concurrent writers"` → returned `ADR-024` at #1 (`0.48`) and put `REQ-kibi-engine-durable-transactions` and `REQ-kibi-engine-single-writer-protocol` into `answer.governing`.
- `"monorepo package structure"` → returned `ADR-006` at #1 (`0.58`).

### Corrected Root-Cause Analysis (5 Verified Causes)
1. **No Orientation Read for Decisions, Firm Rules, Vocabulary, and Gaps:** On Kibi's own KB, **320 of 360 subject facts sit under the single root `kibi`**, and second-level prefixes (`kibi.engine`, `kibi.discovery`, `kibi.plugins`) are undefined, so grouping must detect and strip a dominant root prefix rather than assuming authored parent subjects exist.
2. **Matched ADRs Are Capped at 3 and Limited to Top-10 Seeds (`packages/cli/src/search-answer.ts`).**
3. **Unfloored Weak Lifts Pollute `answer.governing` (`packages/cli/src/search-answer.ts`).**
4. **Sparse & Stale ADR Links in KB Data (11 of 29 accepted ADRs link to zero requirements — addressed in Slice 2).**
5. **Meta-Framing Nouns Dilute the IDF Denominator (`packages/cli/src/intent-search.ts`).**

### Two-Slice Delivery Plan
- **Slice 1 — Zero-Schema-Risk Orientation, Gold Set & Answer Hygiene:**
  1. Conceptual Gold Set + Thin-KB Fixture (`repo-search-conceptual-gold.v1.jsonl` + 2-call agent reachability).
  2. `kb_map` MCP Tool & `kibi map` CLI Command (~8 KB default governance atlas).
  3. Orientation Pointer on Weak or Abstained `kb_search`.
  4. Separate ADR Lane in `search-answer.ts` (cap `3 -> 6` across all ranked matches).
  5. Floor on Weak Lifts into `governing` (`LIFT_SCORE_RATIO = 0.75` + ADR-only `answerNote`).
  6. Minimal Meta-Framing Stop Words (`"design"`, `"main"`, `"overall"`, `"principle"`).
- **Slice 2 — ADR Data Hygiene, Bidirectional ADR Lifting & Bootstrap Overview Capture (Follow-Up PR):**
  1. Single ADR link convention + consistency check + repairing Kibi's 11 unlinked accepted ADRs.
  2. Bidirectional score-ranked ADR → requirement lifting (max 2–3 per ADR).
  3. Bootstrap capture persisting `bootstrapContext.projectSummary` as a non-firm `observation` fact tagged `kb:project-overview`.

---

## Part 3: First Slice Implementation Plan (Slice 1)

*(Full text of [`docs/architecture/nl-retrieval-slice-1-plan.md`](./nl-retrieval-slice-1-plan.md))*

### 1. Slice 1 Scope & Non-Scope
Slice 1 delivers the low-risk, zero-new-dependency Tier-0 foundation that solves **repository orientation**, **ADR visibility**, **weak-lift noise**, and **measurement** without changing check enforcement or adding breaking migrations:
1. **Workstream A:** `repo-search-conceptual-gold.v1.jsonl` + freshly-bootstrapped thin-KB fixture + evaluator scoring both **single-shot** recall/noise and **2-call agent reachability** (`kb_map` → `kb_search`).
2. **Workstream B:** `kb_map` MCP tool (`kibi map` CLI peer) backed by a deterministic Prolog aggregation predicate (`discovery:kb_map_json/3`), formatted into a compact (~8 KB default) governance atlas of accepted ADRs, subject areas (stripping a single dominant root prefix), firm rule counts, owning code directories, and ungoverned gaps.
3. **Workstream C:** Language-neutral orientation pointer in `kb_search` text digests when a query abstains or scores below `0.44`.
4. **Workstream D:** Answer-layer hygiene in `packages/cli/src/search-answer.ts` and `packages/cli/src/intent-search.ts`:
   - Separate ADR lane (`SEARCH_ANSWER_LIMITS.rationale` raised from `3` to `6`, collected across all ranked matches rather than only the top 10 seeds).
   - Weak-lift floor (`LIFT_SCORE_RATIO = 0.75`) preventing low-scoring scenarios/tests/facts/symbols from dragging unrelated requirements into `answer.governing`, plus an honest ADR-only note when ADRs matched strongly without governing requirements.
   - Four meta-framing stop words (`"design"`, `"main"`, `"overall"`, `"principle"`) added to `STOP_WORDS` with zero change to scoring weights or calibrated thresholds (`0.18`, `0.44`).
5. **Workstream E:** KB self-hosting updates (requirements, scenarios, tests, `.kb/symbols.yaml`, proof tests), bundled skill & host-adapter updates, docs (`README.md`, `docs/`, `docs-site/`), and changeset.

### 2. Workstream A — Conceptual Gold Set & Thin-KB Fixture
- **Gold Set (`documentation/evaluations/change-to-proof/repo-search-conceptual-gold.v1.jsonl`):** 28 curated cases across Stratum A (8 orientation & design decisions), Stratum B (10 paraphrased subsystem questions), Stratum C (4 prohibitions, gaps & history), and Stratum D (6 hard software abstention traps).
- **Evaluator (`scripts/repo-conceptual-eval.ts`):** Measures single-shot `adrRecallAt6`, `reqRecallAt5`, `wrongLiftCases`, `abstentionPrecision`, `abstentionRecall`, and 2-call `kb_map` → `kb_search` reachability (`mapSurfacedRate`, `twoCallAdrRecallAt6`, `twoCallReqRecallAt5`, `mapBytes`).
- **Freshly-Bootstrapped Thin-KB Fixture (`packages/cli/tests/map-orientation.test.ts`):** 25 current requirements across 3 components (`auth`, `billing`, `webhooks`), 6 `firm` requirements, 4 unanchored requirements, 3 accepted ADRs (2 linked, 1 unlinked), 1 `kb:project-overview` observation fact, and 10 source files (7 linked, 3 unlinked), tested against `kb_map` and 8 realistic post-bootstrap questions.

### 3. Workstream B — `kb_map` / `kibi map` Orientation Read
- **Prolog Predicate (`packages/core/src/discovery.pl`):** `kb_map_json(+DomainFilter, +IncludeAdrs, -JsonString)` collecting `overview`, `adrs`, `subjects` (via `domain_subjects:subject_defined/2` and `requirement_subject/3`), `gaps`, `stats`, and `scope` (`status:status_scope_dict/1`).
- **TypeScript Formatter & Budget Controller (`packages/cli/src/map-orientation.ts`):**
  - Dominant-root detection (`>= 75%` share AND `>= 5` distinct second-level children) strips the dominant prefix (e.g. `kibi.`) for display grouping while keeping canonical stored `subjectKey`s intact in `ask` follow-ups.
  - Deterministic byte-budget shrinking (`fitMapPayload`, default `maxBytes = 8_192`, bounded `[1024, 32768]`): trims `sampleFirmRequirements` (3→1→0) → `codeRoots` (5→2→0) → `subdomains` (10→3→0) → `decisionExcerpt` (least-linked first) → lowest-requirement `areas` (keeping `gaps` and `stats` intact).

### 4. Workstream C — Weak-Search Orientation Pointer
- In `packages/cli/src/public/operations/discovery-executors.ts` (`executeSearch`), append:
  `Call kb_map for this repository's accepted ADRs, firm rules, subject vocabulary and gaps, or kb_query({"type":"adr"}) to list all ADRs.`
  whenever `intentResult.matches.length === 0` or `searchHintsTrigger(intentResult.analysis) !== null`.

### 5. Workstream D — Search Answer Quality Fixes
- `SEARCH_ANSWER_LIMITS.rationale` raised `3 -> 6`, scanning all `matches` for non-superseded ADRs.
- `LIFT_SCORE_RATIO = 0.75` gating non-`req` requirement proposals into `candidates`.
- ADR-only `answerNote` when `governingCount === 0 && rationaleCount > 0`.
- `"design"`, `"main"`, `"overall"`, `"principle"` added to `STOP_WORDS` in `packages/cli/src/intent-search.ts`.

### 6. Workstream E — KB Governance, Skills, Docs, Changeset & Verification
- Update KB entities and `.kb/symbols.yaml` strictly via `kb_upsert` / `kb_record`.
- Update `packages/runtime/src/skills/kibi-usage/` and run `bun run sync:agent-skills`.
- Update `README.md`, `docs/mcp-reference.md`, `docs/cli-reference.md`, `docs-site/theme.ts`, and add `.changeset/kb-map-and-search-hygiene.md`.
- Verify all unit tests, Prolog tests, both existing search gold gates (`repo-search-gold.v4.jsonl`, `repo-search-hints-gold.v1.jsonl`), `repo-conceptual-eval.ts`, `kibi sync && kibi check && kibi status`, proof checks, and `ocr delegate preview`.
