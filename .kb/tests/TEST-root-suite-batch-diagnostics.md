---
id: TEST-root-suite-batch-diagnostics
title: Batch timeout and failure diagnostics in root test suite
status: active
created_at: 2026-07-27T10:00:00.000Z
updated_at: 2026-07-27T10:00:00.000Z
priority: must
tags:
  - testing
  - diagnostics
  - root-suite
  - unit
links:
  - type: validates
    target: REQ-root-suite-batch-diagnostics
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-87cfa510020f5c5f463b500a
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 6cef7e08c617c26c668b68cec96f8e671a3928c6c2abf7437823b3f5374db8c7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-04T18:50:10.764Z'
    finished_at: '2026-10-04T18:50:11.387Z'
    artifact_digest: 6444661ef69d1a525dd5d6d43cd8430616d6d30c5a8a76df719c491ee35cbce8
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 716821c1f060e8c40cfbfaa39703741ddeb218e2d305e8d4072be1e1e5cd9b71
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Exercises the batch diagnostic helpers in `test/root.test.ts`:
`getBatchFailureMessage` returns `null` for clean batches and a
descriptive string for timeouts, non-zero exits, and summary-count
mismatches. `parseSuiteSummaries` extracts bun pass/fail/file counts
from combined stdout+stderr output across multiple batch runs.
