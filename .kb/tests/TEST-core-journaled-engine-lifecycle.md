---
id: TEST-core-journaled-engine-lifecycle
title: Engine daemon serialization, recovery, and protocol fencing
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - engine
  - lifecycle
links:
  - type: validates
    target: SCEN-core-journaled-engine-lifecycle
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-journaled-engine-lifecycle
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ffcb98a4a7dad72f6fe5380b
    test_id: TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: b7dc5d32f96051a86b60601e00ae710889d1f7a44003510d9ca41e3180a98a93
    binding_hash: 635032676e1ae7283a48bb69e6f1a019749d8df6c41fe1a3055a41ba714f90c6
    fingerprint: 568603ba5a195f54e2722d72447cf95b16e55a89a8d146c35138b36a876f5dfd
    fingerprint_components:
      contract: b7dc5d32f96051a86b60601e00ae710889d1f7a44003510d9ca41e3180a98a93
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
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
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
The daemon suite starts simultaneous clients, verifies one socket and ordered
requests, exercises disconnects and stop/restart recovery, checks branch
isolation and protocol/workspace mismatch errors, and reports an actionable
failure when the configured Node host is unavailable.
