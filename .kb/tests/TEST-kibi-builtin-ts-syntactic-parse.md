---
title: Syntax-only TypeScript provider tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - plugins
  - symbols
  - typescript
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-builtin-ts-syntactic-parse
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-builtin-ts-syntactic-parse
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-01f196b5147a52edb8290c43
    test_id: TEST-kibi-builtin-ts-syntactic-parse
    scope: end_to_end
    outcome: passed
    code_snapshot: d03b318c12facb56b8ef1ca0d9d475e26593f5d439c1b41ee1dc050744bddc38
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T06:04:14.431Z'
    finished_at: '2026-11-17T06:04:15.008Z'
    artifact_digest: 4aa1bde493b002ab65281207c706941bac946929a69d7b108b5d5f1da6a80f03
    contract_hash: e815d5aefc25d2c632e3af1fdd1800456f3e0a0af7197a681e63f5bc0d65a649
    binding_hash: 47ee8a3f17db3599491f1bd246372c06d5d489c1634f689b6206d3e23e27de95
    fingerprint: 6e8475680b7e396ab1a8c92ea17c0120dd13ed72153f27f5b9271b5b7b82cdc0
    fingerprint_components:
      contract: e815d5aefc25d2c632e3af1fdd1800456f3e0a0af7197a681e63f5bc0d65a649
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
      - symbol_id: SYM-test-kibi-builtin-ts-syntactic-parse
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that the builtin TypeScript extractors, granularity candidates and coordinate enrichment parse files into a project without library declarations or import resolution, and still find names exported through a local export list.