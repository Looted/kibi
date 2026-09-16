# Implementation Learnings

## Shared mutation parity

- Keep the whole entity-and-relationship assertion in one `rdf_transaction`; validating relationships independently is not sufficient to prevent partial graph state.
- Persistence belongs to the shared executor through `context.prolog.save()`, while runtime lifecycle hooks remain responsible for transport-specific post-success freshness work.
- Internal MCP controls can remain adapter-compatible without becoming CLI inputs when the exact top-level CLI schema rejects undeclared fields.
- Parity assertions must normalize transport-only branch paths and error envelopes, then compare both operation results and post-mutation graph state.

## Dogfooding findings — tech-debt remediation session (2026-09)

Inefficiencies, bugs, and missing features observed while using Kibi daily on this repository. Ordered by friction cost.

### Fixed during this session

- `kb_status` stale-reason scan was quadratic (one full entity-table scan per stale file): git-checkout mtime churn wedged `kb_status_json` for minutes; fixed by a single-pass source→entity-id index.
- `check_selected/2` silently returned empty results for unknown rule names; now fails closed on generated registry facts.
- `strict-readiness` was implemented and documented but missing from the `kb_check` input enum; the registry is now generated from one JSON source with CI drift enforcement.
- Stale `schema.plt` expectation referenced the removed `verification_contract` field instead of `proof_contract`.

### Bugs / inefficiencies still open

1. **Semantic-inventory drift blocks sync with no repair path.** When a requirement file's prose changes after its KB copy was compiled, `kibi sync` fails proposition-complete ingestion. The error says to run `kb_semantic_advisor`, but repairing by hand requires reverse-engineering `requirementSemanticText` (the extractor's prose normalization) to reproduce the exact `semantic_source_hash`, composing a 45-proposition upsert payload, and knowing that the check compares the *file-derived* prose, not the stored `semantic_text`. Missing: a `sync --repair-semantic-inventory <id>` flow (or an error-suggested one-shot repair) and an error message that names the two diverging hashes.
2. **Proof producer has no per-step timeout.** `scripts/run-proof-producer.mjs` uses `spawnSync` without `timeout`; one wedged npm install (DNS flake) blocked `prove --all` indefinitely and poisoned the whole integration run's receipts (all 87 tests recorded `failed` from one hung step). Needs a bounded step timeout plus step-level retry.
3. **Any authored `.kb` change invalidates all 87 proof receipts.** Removing 12 stale relationship-shard rows forced a full ~50-minute re-prove even though no contract's subject matter changed. Missing: incremental proof re-evaluation driven by the snapshot delta (the content-hash sync cache already knows what changed).
4. **Packed proof contracts re-pack and re-install per contract.** Each of the ~90 proof steps runs `npm pack` for 7 packages plus an npm install into a throwaway prefix; only the undocumented `KIBI_E2E_PREFIX` env var enables a baked install. On WSL2 this turned a fast run into a 50-minute one and tripped the 300s per-test timeout. Missing: a documented bake flow (or producer-managed shared install) and a warm npm cache that persists across contracts.
5. **Frozen MCP contract fixtures regenerate from the built runtime bundle.** `UPDATE_MCP_CONTRACT_FIXTURES=1` snapshots whatever `kibi-runtime/dist` currently bundles; regenerating before a full rebuild silently writes stale fixtures that only fail later in packed e2e/proof. Missing: a staleness check (compare fixture inputs against dist mtime/hash) or regeneration from source.
6. **`kibi delete` cannot remove authored edges whose endpoints are gone.** Deleting relationships of already-deleted entities errors with "Failed to inspect … Query failed", so stale shard rows must be repaired with out-of-band scripts (the repo has precedent: `migrate-relationship-shards.ts`, but it's not a general tool).
7. **`kibi delete` stdout is enormous and fragile.** Deleting 4 symbols emits a 1.26 MB JSON blob (the deletion plan embeds source hashes); piping it through another process truncates it. The apply-plan approval envelope (`{plan, approvedPlanHash}`) is undocumented in the delete output, and validation errors read `"/ must NOT be valid"`.
8. **Stale engine sockets and daemons accumulate.** After abnormal exits, `/run/user/1000/kibi-*.sock` collected ~10 entries and one stale daemon respawned; `kibi doctor` reports all-clean while `kibi engine stop` is needed. Missing: socket liveness sweep in `doctor` and socket cleanup on daemon exit.
9. **`kibi check --staged` staleness diagnostics don't say what diverged.** `symbols_manifest_stale` names the files but not which comparison failed (baseline vs staged manifest, missing symbol, granularity filter). Debugging required custom probes against `assessStagedSymbolsManifest`. Missing: a `--explain-staleness <file>` that prints expected-vs-merged symbol tables.
10. **Coarse-reason semantics differ across branch lineages.** `COARSE_GRANULARITY_REASONS` gained `legacy-link` only on one line; the same manifest repair (annotating a coarse symbol) is accepted on one branch and produces staleness on another. The reason set should be versioned with the KB schema, not branch state.
11. **`--refresh-symbol-coordinates` costs 60–130s per commit.** The staged gate requires a refresh whenever behavior sources change; the refresh re-extracts the whole tree despite the 30s extraction TTL. Missing: incremental refresh scoped to staged files, or a `check --staged --refresh` one-step repair.
12. **`check-proof-baseline` failure output is a raw JSON blob.** Integrity violations dump unbounded structured content to stderr; a summarized failure table (rule, count, first entity) would suffice.
13. **`kb_semantic_advisor` output is unbounded.** 478 KB of JSON for an 8 KB requirement; no `--summary` or claim-only mode for the common "give me the inventory contract" case.
14. **`kibi query`/engine commands block for the full 120s timeout with no progress.** During the quadratic-status wedge, every command printed nothing until timeout; a phase heartbeat (stage diagnostics exist but only for commit goals) would distinguish "slow" from "wedge".
15. **Local-line fixture gap:** `kb_job_status` was added to the MCP server without regenerating the packed parity fixture (catalog-only snapshot), so `mcp-cli-operation-parity` fails on that line; the fixture generator should snapshot *registered* tools rather than the catalog.
