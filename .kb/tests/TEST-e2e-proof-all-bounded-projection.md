---
title: Installed public prove-all excludes large unrelated archived test metadata
status: passing
tags:
  - proof
  - consumer
  - projection
  - e2e
text_ref: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-e2e-proof-all-bounded-projection
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-proof-all-bounded-projection
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-proof-all-bounded-projection
    target: default
    native_id: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts::selects the sole proof contract without materializing 500 large archived test records
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1755ebf29d6cfdf3d74d6223
    test_id: TEST-e2e-proof-all-bounded-projection
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
    binding_hash: 274c159a935e414cef40ea00ab8d63b137a217d698d275ffe06c3156db8d99cc
    fingerprint: 11fbce064ce17639cfde47d49343868d55f0f45e291f3e8957f46a2cb45ce696
    fingerprint_components:
      contract: e907fd1c9501319fb8fc5095259d957e65ed3f47f001ff09d33b6731491b6fa9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ece4d7e80cdc573eca949587eef9a5e70569e82dfca2500a5499082cbab90e0f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-all-bounded-projection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This is PR 282's installed regression: prove-all picks the single contract among 500 large archived records. Strict proof stopped at 109 of 110 until the projection had real end-to-end coverage.
