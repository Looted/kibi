---
title: Capability plugin protocol validation tests
status: passing
tags:
  - plugins
  - protocol
  - review:context-missing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-protocol-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-protocol-v1
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b125d7bdc9cbe1eeec2f62d4
    test_id: TEST-capability-plugin-protocol-v1
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:27:37.151Z'
    finished_at: '2026-10-25T12:27:37.232Z'
    artifact_digest: 6436b4644c808b271d8dc7467c901e9c9d7cd8ea4f85930fb80df02494d12e65
    contract_hash: 20c4acc0db77eeeed7930815d81a4bceeede78ff6fc204e8ec32dd7d39854ddb
    binding_hash: 9a07060b1d3c0dbf809b7a33c61500fb3face135b4f7a225a1cf2770d65f8a01
    fingerprint: 4674f5cdb2dd804f473fc55b5c6b6e858e5ef57971038340f28e2ff84139c15e
    fingerprint_components:
      contract: 20c4acc0db77eeeed7930815d81a4bceeede78ff6fc204e8ec32dd7d39854ddb
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
      - symbol_id: SYM-unit-test-capability-plugin-protocol-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# TEST-capability-plugin-protocol-v1

Automated coverage: packages/plugin-sdk/tests/sdk.test.ts
