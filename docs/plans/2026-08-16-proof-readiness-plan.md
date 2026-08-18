# Kibi Proof Readiness: 0% → 100%

- Status: Active
- Date: 2026-08-16
- Audience: Kibi maintainers

Internal delivery plan for bringing **this repository's** requirement proof from 0% to 100%. It is not product documentation.

Kibi reaches 100% only when every current requirement clears every strict proof stage. The target is not negotiable by changing the denominator, marking valid requirements non-current, weakening E2E scope, or treating structural coverage as evidence.

## Baseline

Measured on 2026-08-16 from clean verification snapshot `feb3ae5f740b`:

- 117 total requirements, 28 non-current/not-applicable, 89 current.
- 0 of 89 fully proven.
- Sequential proof rail: 89 current → 15 semantic → 15 scenario → 14 implementation → 11 E2E → 0 evidence.
- All 89 lack passing E2E proof. Other leading gaps are 72 missing semantic inventories, 72 incomplete contradiction checks, 70 missing logic claims, 66 missing production-symbol coverage, 23 missing production symbols, 22 missing receipts, 8 stale receipts, 8 missing coordinates, and 6 missing scenarios.

The denominator is expected to grow as Kibi evolves. Recompute the baseline after each merged batch; “100%” always means `proofProven === total - proofNotApplicable` for the live snapshot.

## Delivery sequence

### 1. Establish the proof runner and ratchet

- Move report generation after contracted E2E verification in CI.
- Maintain a version-controlled registry of qualifying test IDs and their exact `verification_contract.v1` argv. Run each contract through `kibi verify`, then generate and publish the report in the same clean job and snapshot.
- Run on every `develop` push and weekly so seven-day receipt freshness cannot silently expire.
- Add a committed proof baseline checked in CI. During migration, fail on decreases in proven count, increases in current unproven requirements, or regressions in any tracked gap count. Raise the floor in every proof batch; replace the ratchet with an equality gate at 100%.

### 2. Prove the 11 last-mile requirements

These already clear the first four report gates and should produce the first non-zero score. Refresh or create their exact receipts, link executable symbols, complete production-symbol `covered_by` links, and refresh coordinates:

`REQ-kibi-conservative-requirement-proof`, `REQ-kibi-dependency-ordered-repair-plan`, `REQ-kibi-distribution-parity-matrix`, `REQ-kibi-fresh-verification-receipts`, `REQ-kibi-html-health-report`, `REQ-kibi-ontology-convergence-witnesses`, `REQ-kibi-proposition-complete-ingestion`, `REQ-kibi-telemetry-acceptance-gate`, `REQ-kibi-telemetry-remediation-evidence`, `REQ-kibi-verification-evidence-contract`, and `REQ-test-journaled-engine-harness`.

Exit condition: all 11 report `proofStatus: proven` on the same clean snapshot.

### 3. Clear the four near-ready gate blockers

- Add source-bound production ownership for `REQ-core-journaled-engine-persistence`.
- Add scenario-backed contracted E2E tests for `REQ-kibi-change-to-proof-evaluation`, `REQ-kibi-change-to-proof-plan-compiler`, and `REQ-kibi-intent-aware-source-discovery`.
- Run those contracts through `kibi verify`, then finish executable/production coverage and coordinates in the same batch.

Exit condition: the original 15-requirement semantic cohort is fully proven.

### 4. Backfill the remaining 74 as vertical proof slices

Work in small subsystem batches: core, CLI, MCP, agent plugins, VS Code, and SkillOpt. For each requirement, complete the whole chain before starting the next batch:

1. Build the proposition-complete semantic inventory and stable logic-claim manifest.
2. Use predicate suggestion before ontology authoring; ground every modeled claim and resolve ambiguity or contradiction checks.
3. Add or repair the scenario and its linked test.
4. Link production and executable symbols, production coverage, requirement source, and exact coordinates.
5. Declare the E2E verification contract, run it through `kibi verify`, and confirm the row is proven.

Do not bulk-accept generated semantics. Review each batch, run targeted `kb_check` rules, then run full check, coverage, and status before raising the CI floor.

### 5. Lock and maintain 100%

- Make CI require zero current rows with `proofStatus !== proven`, zero blocking contradictions, a clean verification snapshot, and fresh receipts.
- Keep report publication downstream of that gate so the badge and HTML always describe the tested snapshot.
- Require every new or changed requirement to ship with its complete proof chain; reject denominator growth without corresponding proof.
- Review the weekly run as an operational freshness signal. A stale or failed contract must lower the published badge rather than reuse older evidence.

## Completion criteria

The work is complete when a clean `kibi coverage` reports every current requirement proven, `kibi check` has no blocking violations, `kibi status` is clean and fresh, the scheduled proof runner can reproduce the result from a fresh checkout, and CI prevents proof from dropping below 100%.
