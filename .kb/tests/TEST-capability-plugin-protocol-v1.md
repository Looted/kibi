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
    receipt_id: PR-f2b21269e7fa80fb9d43045e
    test_id: TEST-capability-plugin-protocol-v1
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:51:49.179Z'
    finished_at: '2026-10-30T19:51:49.262Z'
    artifact_digest: 485ca58cc836274a16de9314309d8eea429520fdbdaf300919075402411de334
    contract_hash: 20c4acc0db77eeeed7930815d81a4bceeede78ff6fc204e8ec32dd7d39854ddb
    binding_hash: 731249527710939de3c1a5e1619fb3d25679fa8d3131d3566329966708503484
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
