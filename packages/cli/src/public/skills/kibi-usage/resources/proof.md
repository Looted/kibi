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
  itself (bundled producer: `kibi-cli/playwright-producer`).
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
