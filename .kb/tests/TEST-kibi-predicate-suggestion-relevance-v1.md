---
title: Predicate Suggestion Relevance End-to-End Contract
status: passing
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
    receipt_id: PR-e9cd08c30506d743fb316f54
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 35a491d9823c7a05484c300945b0578ad590fb32222b0602563f88dcd5e2e0df
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T08:54:25.827Z'
    finished_at: '2026-11-10T08:54:33.955Z'
    artifact_digest: 021df5e3ad8236c689ca3cc47929f5b28246c84d1f96f22fe242516a8dee2cd0
    contract_hash: 591f5200542a98be532340312e47ae45a2d9fc3475eaa6db6c7abfa6d063bf37
    binding_hash: d706c3cf50166e0020e68ad52dca6c1f21237297522dde1bdd3f43cac831465a
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