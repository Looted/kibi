---
id: TEST-core-journaled-engine-lifecycle
title: Engine daemon serialization, recovery, and protocol fencing
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-43040587d759e2c582860a44
    test_id: TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: edc0588eed59351e216a3466342eacd255130ecbca12d0f17c5c6c51dd2fd1cf
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T16:15:30.108Z'
    finished_at: '2026-11-10T16:15:54.970Z'
    artifact_digest: ae4096fe6b6d215c4f97f93ab6687962d86d1d0ad85418fa02babcdf9e4cc930
    contract_hash: b7dc5d32f96051a86b60601e00ae710889d1f7a44003510d9ca41e3180a98a93
    binding_hash: 8470b39284e835770ef462163620727c4d2aa50e75c14d390037085e12255263
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The daemon suite starts simultaneous clients, verifies one socket and ordered
requests, exercises disconnects and stop/restart recovery, checks branch
isolation and protocol/workspace mismatch errors, and reports an actionable
failure when the configured Node host is unavailable.
