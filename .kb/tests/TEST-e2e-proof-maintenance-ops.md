---
title: Proof receipt maintenance operations run end to end against a packed CLI
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-proof-maintenance-ops
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-proof-maintenance-ops
    target: default
    native_id: documentation/tests/e2e/packed/proof-maintenance-ops.test.ts::proof receipt maintenance operations
id: TEST-e2e-proof-maintenance-ops
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1d351222262d989de979646a
    test_id: TEST-e2e-proof-maintenance-ops
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
    binding_hash: ee6647e553f452722fb03f315347aab311ce034ac6683b3f2541aa13725478f5
    fingerprint: 3f18e5b25f13814b178dd4b22d750cb2ebd0f43dd7181893405cd652cc7f5447
    fingerprint_components:
      contract: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4e32d5743cbd1a31791822b29d9b10218695f9e450568aa7e86afb8588295582
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-maintenance-ops
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This runs migrate-legacy, prune and JUnit ambiguity against a packed CLI. It exposed that migrate-legacy had to read authored documents, because sync no longer compiled the legacy lane.
