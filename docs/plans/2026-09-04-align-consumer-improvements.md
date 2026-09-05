# Align Consumer Improvements — Incorporation Batch

- Date: 2026-09-04
- Branch: `feat/align-consumer-improvements`
- Sources: `~/projects/align/docs/kibi-improvements.md` (2026-09-02),
  `~/projects/align/docs/kibi/upstream-ontology-gaps-2026-08-16.md`,
  `~/projects/align/docs/kibi-quality-audit.md`
- Baseline triage: written against packed kibi 1.0.1 (`15b922d8`); several
  items were already incorporated at HEAD and are listed only as verified.

## Incorporated in this batch

### Proof pipeline

1. **`KIBI_PROOF_RUN=1` producer marker** — `kibi prove` now exports
   `KIBI_PROOF_RUN=1` into every integration child process. Runner
   configurations should branch on this marker instead of guessing from
   `KIBI_PROOF_OUTPUT` (the Align `playwright.config.ts` bug). Documented in
   `docs/cli-reference.md` and `docs/proving-requirements.md`.
2. **Aggregate-failure gap attribution** — when a run fails but an
   obligation's own proof result passed, the gap reason now names the failing
   member results (capped at 5, `+N more`) and states that the obligation's
   own result passed. Pass/fail semantics are unchanged. This resolves the
   Align case where one timed-out mobile scenario refused 4 domain contracts
   with an opaque "run did not pass".
3. **`prove --integration` multi-id + `--integration-except`** —
   `--integration <ids>` accepts comma-separated ids; `--integration-except
   <ids>` (modifier, requires a selector such as `--all`) skips listed
   integrations. A selector matching no proof-bearing test is now an error
   instead of a silent empty run.

### CLI robustness

4. **Symbol compiler lock pid liveness** — a well-formed lock owner record
   whose holder pid is provably dead is stolen immediately instead of
   blocking for the full 15s timeout (the Align 15s wedge). Corrupt or
   initializing metadata and live holders stay fail-closed.
5. **Unknown-flag exit codes** — verified at HEAD: unknown subcommand,
   prove, and global options all exit non-zero (the Align `status --json`
   exit-0 observation no longer reproduces). Regression tests added.

### Advisor / ontology

6. **Nonlogical routing in `kb_suggest_predicates`** — prose the semantic
   advisor classifies as nonlogical (rationale, example, subjective) now
   returns `recommendedAction: review_nonlogical` with no candidates, no
   schema draft, and no claim-key merge. Advisor routing wins; the Align
   tool inconsistency cannot recur.
7. **Predicate catalog gap-diff + new families** — all 32 no-candidate
   claim texts were reconstructed (read-only) from the Align requirement
   sources and re-run against the current catalog. Results drove:
   - a ranker fix: an exact-scorer miss (score 0) no longer vetoes a
     predicate's lexical+semantic evidence; the applicability gate remains
     the semantic authority;
   - tuning for `resource_constraint`, `failure_behavior`,
     `migration_boundary_rule`, and `abstraction_boundary_rule`;
   - ten new built-in schemas: `fail_closed_authorization_rule`,
     `deployment_precondition_rule`, `data_migration_rule`,
     `diagnostic_visibility_rule`, `mutation_authority_rule`,
     `request_deduplication_rule`, `async_boundary_rule`,
     `canonical_identifier_rule`, `responsive_breakpoint_rule`,
     `operational_pause_rule` (each with intent rules, usage hints, and
     examples).

   Post-change diff: 14/32 claims now reach a boundable candidate
   (`provide_argument_bindings`); 7/8 documented follow-up capability claims
   (fail-closed, migration sequencing, deployment hold, canonical-only
   boundary, operational pause, renderer-neutral persistence) now resolve to
   a specific predicate. The remaining 18/32 claims are honest gaps:
   umbrella/bundled requirements (auth-profile sync, Supabase surface,
   TianBei pipeline, CP-001, E2E-001), provider-specific session flows, and
   one-off UI interaction claims (seek-and-pause jumps, cursor states,
   viewport tool locking, shared store synchronization). These need
   requirement decomposition or product clarification, not new predicates.

## Deferred (documented, not implemented)

- `kibi proof coverage` view (which contracted tests lack fresh receipts for
  the current snapshot), `kibi proof prune`, legacy `verification_receipts`
  migration action.
- MCP long-operation async/job pattern for `kb_check` on large KBs.
- "Receipts committed in HEAD^" freshness messaging in `kibi status`.

## Engine post-ingest wedge — reproduction outcome

Reproduced on a synthetic Align-scale workspace (1800 entities, ~1000
relationships, journaled branch store, current-source CLI at this branch).
Measured with fresh processes each run:

| State | `status` | `check` | `query test` | `prove` |
| --- | --- | --- | --- | --- |
| Journal 13.7MB (seq 4648), pre-compaction | 43–57s | 77.5s | 19.7s | >300s (killed) |
| After `engine stop` + `sync --rebuild` (792KB) | 0.67s | 2.65s | 0.25s | — |
| Same store + prove of 1 contract | 0.73s | 2.8s | — | 2.57s |
| Same store + prove of 500 contracts | 0.43s | — | — | >300s (killed) |

Three distinct mechanisms, matching Align's "only `engine stop` +
`sync --rebuild` (~4.5 min) heals" report:

1. **Journal accumulation slows every runtime globally.** With a
   multi-megabyte journal, status/check/query run 30–85× slower than after a
   rebuild; at Align's size this crosses the 120s MCP timeout. Nothing
   compacts the journal automatically; `sync --rebuild` shrinks 13.7MB →
   792KB and restores sub-second status.
   *Follow-up:* automatic journal checkpoint/compaction (Align's
   `engine compact` ask) or a threshold-triggered rebuild, plus a typed
   "store degraded, run X" diagnostic instead of silent slowdown.
2. **Proof ingest does one full journaled upsert per contracted test**
   (`operations/proof/ingest-proof.ts` calls `executeUpsert` inside the
   per-test loop), so `prove` cost is O(contracts) × per-upsert cost:
   1 contract = 2.6s, 500 contracts > 300s on an otherwise healthy store.
   *Follow-up:* batch receipt persistence (one transaction for all derived
   receipts) or amortized saves, keeping append-only semantics.
3. **Killed runtimes orphan their swipl children, which hold store locks.**
   Repeatedly during this investigation, a CLI/bun process that was killed
   left its `swipl` child alive (one ran 2h16m) holding the rdf/branch lock;
   later runtimes then fail or hang until the orphan is killed. Lock files
   being deleted without killing the holder does not clear the in-memory
   mutex. This matches Align's "fresh daemons hang too".
   *Follow-up:* liveness-checked lock acquisition for the rdf/branch lock
   (same pattern as the symbol-compiler-lock fix in this batch), and
   parent-death signaling (e.g., `PR_SET_PDEATHSIG` or a supervisor poll)
   so swipl children never outlive their PrologProcess.

Additional bug candidate found while probing: after a rebuild, a raw
`kb_attach('<store>')` + `kb_storage_mode/1` deadlocks even with zero live
holders and no lock files (the engine/CLI runtime paths are unaffected —
status/check/upsert/prove all work). This blocks the documented
`scripts/populate-kb.ts` direct-attach pattern. *Follow-up:* engine-level
investigation of attach + journaled-storage initialization ordering.

Caveat: the 43–57s pre-compaction measurements were taken while a bulk
populate runtime was concurrently attached, so journal size and lock
contention are confounded in that row; the post-rebuild rows are clean.

## Verification

- `packages/cli` and `packages/mcp` predicate/proof/CLI test suites pass,
  including 13 new consumer-claim regression cases in
  `packages/mcp/tests/tools/suggest-predicates.test.ts` and the lock /
  evaluate / selector unit tests noted above.
