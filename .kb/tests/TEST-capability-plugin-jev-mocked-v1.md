---
title: Jev mocked classifier and default-tree absence
status: passing
tags:
  - plugins
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-jev-mocked-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-jev-mocked-v1
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e8e016b0b4d5cbdfd7cee48c
    test_id: TEST-capability-plugin-jev-mocked-v1
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:27:32.212Z'
    finished_at: '2026-10-25T12:27:32.292Z'
    artifact_digest: 9cefa6f1042f3e01600ec1dd2842336abd171040f63c977947602a50902a9a60
    contract_hash: 94b719e8d7bd9c1d066a2901109d39016fbf3f80c627373c0b71cb9d4fe263a2
    binding_hash: dcac67cae37ac2522c8493fc31919aba96759f85292c707af6d525d7332a79eb
    fingerprint: b129d1f9cfee213d9a4ac391924d1cf5004708f46d751f8fa75038e95a7ddf30
    fingerprint_components:
      contract: 94b719e8d7bd9c1d066a2901109d39016fbf3f80c627373c0b71cb9d4fe263a2
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
      - symbol_id: SYM-unit-test-capability-plugin-jev-mocked-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# TEST-capability-plugin-jev-mocked-v1

Automated coverage: packages/plugin-jev/tests/jev.test.ts and packages/cli/tests/plugins/default-deps-exclude-jev.test.ts
