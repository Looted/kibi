# Proof and Verification Workflow

Use this resource when a requirement must be proven before handoff, when
wiring a proof-bearing test, or when `kb_ingest_proof` or `kibi prove`
rejected evidence.

Kibi does not support test runners. Kibi supports proof evidence. Any
producer (Playwright, pytest, JUnit, TAP, shell commands, database harnesses)
reports what happened as `kibi.proof-run.v1`; Kibi evaluates proof.

## Golden path

1. Query the test (`kb_query`, `type: test`) and read its
   `kibi.proof-contract.v1`, `proof_bindings`, and `verification_scope`.
2. Run the configured producer through the canonical command:

   ```bash
   kibi prove --test TEST-<id>
   # or: kibi prove --requirement REQ-<id> | --integration <id> | --all
   ```

   `kibi prove` captures the workspace snapshot, runs each integration's
   producer once (`shell: false`), revalidates the snapshot, evaluates the
   artifact against every selected contract, and appends idempotent
   `kibi.proof-receipt.v1` receipts.
3. Confirm with `kb_status` (fresh, current snapshot) and `kb_coverage`.

Never hand-write receipts. Kibi derives them from validated
`kibi.proof-run.v1` artifacts only.

## Proof contracts

A proof-bearing test declares explicit obligations (never a Cartesian
cases-times-projects matrix):

```yaml
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: web-e2e          # id from .kb/proof/integrations.json
  required_proofs:
    - symbol_id: SYM-PW-4F2A9C61B7D03E85
      target: chromium          # browser, runtime, db, device, or default
  success_policy: all_required_first_attempt
proof_bindings:                 # optional provenance metadata
  - symbol_id: SYM-PW-4F2A9C61B7D03E85
    target: chromium
    native_id: tests/checkout.spec.ts::accepts a card
```

Provenance lives in `proof_bindings`; the contract stays semantic.

## Integration configuration

`.kb/proof/integrations.json` (`kibi.proof-integration.v1`) is tracked,
Kibi-managed configuration describing evidence production only:

- `producer: command` — Kibi synthesizes the envelope from the process
  outcome; obligations are bound with `aggregate_run` provenance and the
  single process invocation counts as the known first attempt.
- `producer: playwright` (or custom) — the child emits `kibi.proof-run.v1`
  itself (bundled reporter: `kibi-cli/playwright-reporter`).
- `producer: junit` / `tap` — Kibi converts the native report at `artifact`
  using each test's `proof_bindings`; standard formats carry no retry
  history, so attempts are reported as `unavailable` and fail the strict
  first-attempt policy closed.

Cosmetic edits (descriptions, labels) never stale proof. Execution-relevant
edits (command, artifact, targets, options, bindings, contract) change the
effective fingerprint and do.

## Attempt semantics (factual, never optimistic)

- `attempts: {status: "complete", entries: [...]}` — known history; the
  strict policy requires a passing **first** entry.
- `attempts: {status: "unavailable"}` — unknown native history; the strict
  policy fails closed, except `aggregate_run` results, which are satisfied by
  the Kibi-launched process attempt when the run passed with exit code 0.
- `run.outcome` is authoritative: a failed, errored, cancelled, interrupted,
  or `no_results` run proves nothing, even with passing individual results.

## Common rejections

- `No proof integration configuration` — bootstrap has not configured proof
  for this repository yet; do not hand-wave, run the bootstrap proof step.
- `captured snapshot is not the live workspace snapshot` — the tree changed
  between capture and ingest; re-run `kibi prove`.
- `artifact command_argv does not match the configured command` — the
  artifact came from a different command than `integrations.json` configures.
- `attempt history unavailable` — the producer could not prove first-attempt
  success for a native-case obligation; use a producer with complete history
  or accept aggregate provenance.
- `proof_receipts is append-only` — receipts are append-only; update tests
  through the engine (which appends) or include the existing history when
  authoring test files directly.

## After code changes

Receipts bind to the snapshot, contract hash, and execution fingerprint at
run time. Any code or source change moves the snapshot and stales receipts:
re-run `kibi prove` for the affected selection, then confirm `kb_status` and
`kb_coverage` before handoff.

Full reference: `docs/proving-requirements.md`.

## Debugging proof regressions

When a proof ratchet fails, diagnose first. Do not treat
`proof/baseline.json` as the thing to edit.

1. Do not refresh `proof/baseline.json` as the first fix.
2. Identify the exact requirement and symbol responsible for the regression.
3. Use Kibi proof diagnostics rather than reverse-engineering
   `requirement_proof.pl`:

   ```bash
   kibi proof explain REQ-<id>
   kibi proof explain SYM-<id>
   kibi proof impact
   ```

   `kibi proof impact` compares the current Proof projection to
   `HEAD:proof/baseline.json` (the committed ratchet snapshot, not the
   working-tree file). It is diagnostic: fingerprint differences are reported
   and the command exits 0 on successful evaluation. The strict ratchet remains
   `scripts/check-proof-baseline.mjs`.
4. For `missing_production_symbol_coverage`, inspect symbol role, owning
   requirement, `covered_by`, candidate test scope, the requirement scenario
   chain, and the current proof receipt. `kibi proof explain` prints those as
   three labeled blocks so they cannot be confused:
   `required_proofs` (TEST contract obligations), `executable_for` (test-code
   identity), and `covered_by` (production coverage candidates with primary
   plus optional secondary reasons).
5. A behavioral production symbol requires qualifying behavioral/E2E evidence
   under the current proof model.
6. Unit coverage can satisfy structural/type-shape requirements only when the
   symbol genuinely represents structural shape and the proof model allows it.
7. `executable_for` identifies executable test code. Never use it on
   production helpers merely to remove production coverage obligations.
8. Do not trust TEST names. Resolve
   `TEST -> proof_contract.required_proofs -> SYM -> source` and inspect what
   the executable test actually exercises. Kibi does not infer “this TEST name
   does not match that source file.”
9. A passing proof producer does not automatically make every authored
   `covered_by` relationship semantically correct.
10. Prefer one meaningful E2E scenario covering multiple internal functions
    plus focused unit tests for edge cases, rather than an E2E test per helper.
11. Refresh the baseline only after a genuine intentional proof-state
    improvement requires the ratchet snapshot to be updated.
