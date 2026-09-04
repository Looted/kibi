---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
---

Proof runs are now self-identifying, failures are attributable, and integration selection finally matches real repositories. `kibi prove` sets `KIBI_PROOF_RUN=1` in every producer child process, so runner configs that must behave differently under proof (disabling retries, for example) can branch on a stable marker instead of guessing from output-path variables — this fixes silent contract violations like proof runs executing with Playwright retries enabled. When a run fails, gap reasons now name the failing member results instead of an opaque "run did not pass", so one slow scenario no longer hides why four domain contracts were refused. `--integration` accepts multiple comma-separated ids, `--integration-except` skips integrations without `--all`, and a selector that matches nothing is now a loud error instead of a silent no-op.

Two long-standing consumer sharp edges are fixed: the symbol compiler lock is stolen immediately when its recorded holder pid is provably dead instead of blocking writes for the full timeout, and `kb_suggest_predicates` now defers to the semantic advisor's nonlogical classification (`review_nonlogical`) instead of emitting predicate suggestions for rationale, example, or subjective prose.

The built-in predicate catalog grows ten consumer-escalated families — fail-closed authorization, deployment preconditions, data-migration sequencing, diagnostic visibility, mutation authority, request deduplication, async boundaries, canonical identifiers, responsive breakpoints, and operational pauses — and retrieval ranking no longer lets an exact-pattern miss veto strong lexical and semantic evidence, so claims like "must complete in < 500ms", "read canonical data only", and "renderer-neutral persistence" now ground to precise predicates.

Technical summary: `commandEnvironment` exports `KIBI_PROOF_RUN`; `evaluateContractAgainstRun` adds failing-member attribution to run-failure gap reasons; `prove` selectors parse comma-separated id sets with fail-fast empty matching; `acquireSymbolCompilerLock` steals well-formed locks with dead holder pids; `suggest-predicates` routes all-nonlogical inputs to `review_nonlogical`; `rankSchema` treats exact-score 0 as a miss rather than a veto; `resource_constraint`, `failure_behavior`, `migration_boundary_rule`, and `abstraction_boundary_rule` gain retrieval cues and intent rules; `predicate-catalog-5.ts` and `predicate-usage-hints-4.ts` add the ten new families.
