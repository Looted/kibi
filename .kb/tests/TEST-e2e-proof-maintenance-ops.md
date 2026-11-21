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
    receipt_id: PR-3813c1a370f1a604d7483067
    test_id: TEST-e2e-proof-maintenance-ops
    scope: end_to_end
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
    binding_hash: 536db826aae4174a97af6d0a3904e08828df6898eb193daa80725cc331715f79
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
