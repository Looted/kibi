# Proof Sprint Findings: Kibi Self-Hosting Friction Log

- Status: Active (append-only during the sprint)
- Date: started 2026-08-25
- Context: Executing `docs/plans/2026-08-16-proof-readiness-plan.md` — raising Kibi's own requirement proof from 34/94 (~36%) toward 100%. This file records every rough edge, error, performance problem, and behavioral problem observed *while using Kibi to prove Kibi*, so product improvements can be triaged later without scope-creeping the sprint.
- Method note: observations are facts of the sprint; proposed fixes are clearly labeled suggestions and are NOT applied by the sprint unless a blocker forces it.

## How to read entries

Each entry: **ID · Area · Severity (blocker / friction / nit) · Observation · Suggested improvement**.

---

## Seeded findings (from planning research, 2026-08-25)

### F-001 · Proof registry · friction
Observation: `proof/verification-registry.json` contains 34 contract entries but only 29 unique test IDs. Duplicated: `TEST-cursor-consumer-local-mcp-launcher-v1`, `TEST-codex-consumer-local-mcp-registration-v1`, `TEST-kibi-predicate-suggestion-relevance-v1`, `TEST-kibi-consumer-local-plugin-launcher-ontology-v1`, `TEST-runtime-packed-engine-daemon`.
Impact: CI (`proof.yml`) runs 5 contracted suites twice on every push and daily scheduled run — wasted compute and longer wall-clock proof runs.
Suggestion: dedupe entries; add a registry-level uniqueness check to the proof workflow contract test.

### F-002 · Ratchet tooling · friction
Observation: `scripts/tests/proof-workflow-contract.test.ts` hardcodes baseline values (`currentRequirements: 94`, `proofProven: 34`, `currentUnproven: 60`) plus an exact gap-key list.
Impact: every intentional ratchet raise requires editing both `proof/baseline.json` and the test; easy to forget, produces red CI for correct progress.
Suggestion: derive test assertions from `baseline.json` (assert mode/ratchet semantics), not literal numbers.

### F-003 · Proof evaluation · behavioral
Observation: when no passing E2E tests exist for a requirement, `production_stage_status(_, _, [], _, blocked)` (packages/core/src/requirement_proof.pl:853) still evaluates `symbol_not_covered_by_tests([])` per symbol, so EVERY implementing symbol is listed in `uncoveredSymbols`.
Impact: with stale receipts (the normal state right after any commit, before CI re-runs proofs) the report shows ~81–97 rows with `missing_production_symbol_coverage` even though most are fully covered. Gap counts and ranked repairs become misleading precisely when an agent needs orientation; root cause (no fresh evidence) is masked by a flood of secondary gaps.
Suggestion: when `PassingE2eTests = []`, emit stage status `blocked` WITHOUT enumerating uncovered symbols, and suppress dependent gaps (`missing_production_symbol_coverage`) in favor of the root `missing_passing_e2e` gap. Same pattern applies to other stages that consume the passing-E2E list (executable_symbols).

### F-004 · Coverage output size · performance/friction
Observation: `kibi coverage --format json` duplicates full symbol coordinate lists inside at least three stage objects per row (`productionSymbols.coordinates`, `sourceCoordinates.coordinates`, plus repeated `symbols` ID arrays). Single-row payloads reach ~10 KB; 133 rows exceed 1 MB of mostly duplicated text.
Impact: agents iterating on coverage burn tokens/time parsing redundant JSON; local jq/python summarization required.
Suggestion: add a compact mode (IDs only, coordinates once) or dedupe coordinates behind a `$ref`-style table.

### F-005 · MCP coverage summary wording · nit
Observation: MCP `kb_coverage` summary reads "117 structurally covered and 0 proven out of 133" while the published report says "34 of 94 current requirements proven". Both are technically accurate but mix two denominators (133 total entities vs 94 current applicable requirements); the MCP line omits `notApplicable` context.
Impact: operators comparing badge vs tool output see contradictory-looking numbers.
Suggestion: make the summary sentence use the proof denominator explicitly: "X of Y current requirements proven (Z not applicable)".

### F-006 · Receipt lifecycle economics · design discussion
Observation: receipts are bound to the whole-workspace verification snapshot; ANY commit invalidates ALL receipts fleet-wide, so every push re-runs all ~29 contracts in CI before the report can show non-zero proof.
Impact: strict and tamper-evident, but expensive: docs-only commits trigger full E2E suites; between push and green CI, the published badge shows degraded numbers (observed: local HEAD showed 0% proven).
Suggestion (discussion): consider path-scoped receipt validity for contracts whose declared steps' inputs did not change, or accept cost and document the "badge lags pushes" behavior explicitly in README.

### F-007 · Local dev loop ergonomics · friction
Observation: `scripts/run-proof-runner.mjs` supports an `--only TEST-a,TEST-b` filter (source-reading required to discover it), but it is undocumented in `docs/cli-reference.md` / README workflows. `run-proof-contract.mjs --test-id` exists separately.
Impact: iterating on one requirement's proof locally looks like a full-suite-or-nothing choice; this sprint had to grep runner source to find the filter.
Suggestion: document `--only` next to the proof workflow docs and mention it in the plan doc's batch loop.

### F-008 · Repo hygiene · nit
Observation: repository root carries many committed artifacts unrelated to source navigation: `kibi-cli-*.tgz` / `kibi-core-*.tgz` / `kibi-mcp-*.tgz` etc. packed tarballs, `ses.log`, `tmp-coverage-debug/`, `coverage/`, `pnpm-lock.yaml` alongside `bun.lock`. (`kibi-report/` correctly gitignored.)
Impact: noisy root slows agent/human navigation; risk of stale packed packages being picked up by tooling.
Suggestion: move packs under a gitignored dir or delete; add hygiene rule to AGENTS.md if they are intentionally committed.

### F-009 · Branch-store messaging · behavioral
Observation: `git checkout -b feature/...` triggers the kibi post-checkout hook which printed: `branch ensure --from was removed: new branch stores compile from the current checkout's tracked sources. Use branch migrate for an explicit legacy-store move.` — reads like an error (mentions a removed flag) but is informational; new branch KB store starts unsynced (`Synced At: -`) with no hint about what to do next.
Impact: first-time observers cannot tell success from failure; nothing points to `kibi sync` as the next step.
Suggestion: reword hook output ("branch store created; run `kibi sync` to populate") and drop references to removed CLI flags.

## Sprint log (appended during execution)

- **2026-08-25 · Wave 0 · F-010 (nit, tooling)** — LSP reports `es2021/es2022 lib` type errors in `documentation/tests/e2e/packed/*.test.ts` (e.g., `cli-workflows.test.ts`: `.at`, `.replaceAll`) while the real compiler (`tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json`, via `bun run compile:e2e:packed`) passes in 2.6s. The workspace-root tsconfig doesn't model the packed tests' lib target, so IDE diagnostics cry wolf on files this sprint must edit in Wave 4. Suggestion: include a lib-correct tsconfig project reference or exclude packed tests from the root tsconfig.
- **2026-08-25 · Wave 0 · F-11 (friction, performance)** — `kibi sync --refresh-symbol-coordinates` took **3m22s** locally (201.9s engine time) for 133 reqs / 2859 symbols / 11271 relationships. CI runs a full sync before every proof job; combined with ~29 contracts this makes the inner dev loop slow. Suggestion: incremental/coordinate-only sync path or parallel extraction.
- **2026-08-25 · Wave 0 · F-12 (friction)** — `kibi verify` prints one giant single-line JSON blob per receipt (entire upsert result including full semantic-advisor inventory contract) into human-facing runner logs. A 15-contract partial run produced >1300 lines of mixed prose + JSON noise, making real failures hard to spot. Suggestion: default to a compact receipt line (test id + outcome + snapshot), add `--verbose-json` for debugging.
- **2026-08-25 · Wave 0 · process note** — Runner is fail-fast: first failing contract aborts the remaining queue (`break` in run-proof-runner.mjs). For long local runs, consider `--keep-going` with a failure summary so one flaky contract doesn't waste a 20-minute queue.

### F-019 · Proof contract test gap · friction
Observation: the five stale duplicate registry entries used the OLD packed runner name (`scripts/run-packed-e2e.mjs`) and the forbidden shared compile dir (`/tmp/kibi-e2e-packed-compiled`), yet `proof-workflow-contract.test.ts` stayed green because its isolation assertions filter steps by the exact NEW runner filename (`step[1] === "scripts/run-proof-packed-e2e.mjs"`). Legacy-shaped steps escape every assertion.
Impact: invalid legacy entries survived multiple CI runs, doubling work per push while tests claimed the registry was healthy.
Suggestion: assert per entry that EVERY packed step uses the current runner and that compiled dirs are mkdtemp-isolated regardless of step shape; add a registry-wide unique test_id assertion.

### F-020 · Receipt invalidation blast radius · friction (concrete F-006 demonstration)
Observation: editing three small files during Wave 0 (findings doc, `baseline.json`, contract test) flipped `verificationSnapshotDirty=true` and regressed local proof from 34 proven to 0 — `check-proof-baseline.mjs` then failed with `proofProven regressed from 34 to 0`. The whole contracted suite must re-run before any baseline gate passes again.
Impact: the sprint itself cannot touch docs/scripts between a runner pass and a baseline check; every wave must follow "all edits → commit → full runner → check". A ~20-minute tax on every iteration.
Suggestion: same discussion as F-006; additionally consider letting `check-proof-baseline` distinguish "receipts valid for parent snapshot + tree dirty only in non-contract paths" as an explicit, visible state instead of plain regression.

### F-021 · Advisor receipt visibility via MCP · friction
Observation: the MCP `kb_semantic_advisor` tool result rendered through this host shows only the one-line summary ("No strong machine-checkable requirement signals…"). The full receipt — deterministic `claim_key`s, spans, payload hashes, proposition statuses, apply plans — was only obtainable through the CLI JSON route (`kibi semantic-advisor --input -`). The same applies to several other tools whose structuredContent is not surfaced.
Impact: MCP-only agents cannot see the claim keys they MUST merge into `logic_claims`; they risk inventing keys (which would fail `strict-req-fact-pairing`). This sprint fell back to the CLI route repeatedly.
Suggestion: ensure host-visible text includes claim keys per clause even in the terse rendering, or document the CLI peer route as required for advisor receipts.

### F-022 · Advisor misses indicative universals · behavioral
Observation: "All entity and relationship mutations in the KB are recorded in a persistent audit log…" produced ZERO suggestions and zero propositions flagged normative (indicative phrasing). Only after rewriting with explicit "Every … must …" did the advisor emit a proposition (as `ontology_gap`, correctly).
Impact: agents modeling legacy prose written indicatively get empty receipts and may wrongly conclude there is nothing to model; proof then stalls at `missing_logic_claims`.
Suggestion: treat quantified universals ("all/every X is/are Y") as candidate normative propositions with lower confidence, or document the rewrite recipe prominently in modeling docs.

### F-023 · Exemplified norms classified nonlogical · behavioral
Observation: "Compound goals such as the status query must bypass the PrologProcess result cache…" was classified `nonlogical` twice, despite containing a clear deontic assertion. Removing the exemplification ("Compound goals including the status query must bypass…") reclassified it `ontology_gap` (groundable).
Impact: "such as" examples inside must-clauses silently drop out of the proposition ledger; requirements lose their most concrete grounding unless agents know to split examples into separate clauses.
Suggestion: classifier should strip exemplifications and keep the normative core instead of discarding the whole span.

### F-024 · Compound requirement bundling · data quality
Observation: `REQ-core-prolog-process-management` bundles four unrelated concerns (CLI Prolog lifecycle, JSON-RPC bridge, MCP branch-refresh-on-replacement — which duplicates `REQ-mcp-kb-freshness` — and one-shot query-cache consistency). 61 of 133 requirements also carry literal `\n` artifacts in stored `semantic_text` (see sprint log).
Impact: bundled requirements create cross-requirement overlap that contradiction checks must disambiguate; corrupted text undermines span-exact provenance for exactly the rows that need semantic backfill.
Suggestion: a migration batch that (a) repairs literal `\n` in stored `semantic_text`, and (b) splits multi-concern legacy requirements via `supersedes` chains.

## Sprint log (continued)

- **2026-08-25 · Wave 0** — Full contracted pass completed at HEAD: 15 contracts in first (aborted) run + 19 in second run, all exitCode 0; receipts restored **34 / 97 current proven** locally (matches published develop badge). Denominator grew 94 → 97 from three newer current requirements.
- **2026-08-25 · Wave 0** — Contract runtime profile: `TEST-test-journaled-engine-harness` dominates (~13 min; runs root suite 4332 tests + engine + packed cli-workflows). Remaining 28 entries average well under a minute each. Dedupe (F-001/F-019) removes ~5 redundant runs per push.
- **2026-08-25 · Wave 0** — Raised ratchet: `baseline.json` 94→97 current, unproven 60→63, tracked gaps refreshed (`stale_verification_receipt` and `missing_symbol_coordinates` at 0 and dropped; `incomplete_semantic_inventory` added at 2). Contract-test expectations updated in the same change (F-002 tax paid again — see suggestion).
