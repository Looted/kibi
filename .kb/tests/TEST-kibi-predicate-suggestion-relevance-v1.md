---
title: Predicate Suggestion Relevance End-to-End Contract
status: active
priority: must
text_ref: packages/mcp/tests/tools/suggest-predicates.test.ts
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - relevance
  - e2e
  - review:context-missing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-predicate-suggestion-relevance-v1
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-228cab3bd223d49effff448e
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a9c62e5097336d21bdb27c462a081d0ef0c1bbf78da42dd885a526e4c4ea4f5d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T19:00:21.357Z'
    finished_at: '2026-10-27T19:01:45.973Z'
    artifact_digest: 30114b10dbad22ffdaf612a6b8de0f3a1a84fff8a9e16c59937ca5f71c040d01
    contract_hash: 591f5200542a98be532340312e47ae45a2d9fc3475eaa6db6c7abfa6d063bf37
    binding_hash: 1ae1c839b244a82e70e44cf54ce98ba2bc9b93890067e4ed1e5e4a3dfd8148b4
    fingerprint: 66c49dedca0fab50fa69126a13f443c32c13439ffc5fdb5d189a638b3b04e599
    fingerprint_components:
      contract: 591f5200542a98be532340312e47ae45a2d9fc3475eaa6db6c7abfa6d063bf37
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
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
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