---
title: The entity context rules shall be entity-context-missing and entity-context-acknowledged, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-entity-context-rules
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-entity-context-rules
  proves:
    - CLAIM-B3FD178F3940E1E5
origin:
  kind: agent
  recorded_at: '2026-10-28T11:04:56.249Z'
id: TEST-proof-entity-context-rules
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-60fccc459d53919226312ac5
    test_id: TEST-proof-entity-context-rules
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 98de3d74d7d5c440d07142e60746bf49e6ce3b107fcdef97e6a5406addd5755d
    binding_hash: b6acf67e8207f291570616c28bd658eaa01afcffce5b513af7dd3f891e92952d
    fingerprint: f427a3ea9d2a9b91a7463f265d6f68d9f1e89cb72d817941e4c7ed2811dd3a3a
    fingerprint_components:
      contract: 98de3d74d7d5c440d07142e60746bf49e6ce3b107fcdef97e6a5406addd5755d
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
      - symbol_id: SYM-proof-entity-context-rules
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-entity-context-rules
      domain:
        symbol_id: SYM-const-entity-context-rules
        members:
          - entity-context-missing
          - entity-context-acknowledged
      results:
        - member: entity-context-missing
          outcome: passed
        - member: entity-context-acknowledged
          outcome: passed
    certificate_digest: a81872e5985165998226960b57176786cd06b709aa7df965d73b0088c7cd440d
    claim_bindings:
      - claim_key: CLAIM-B3FD178F3940E1E5
        requirement_id: REQ-kb-entity-context-rule-ids
        fact_id: FACT-entity-context-rules
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - entity-context-acknowledged
            - entity-context-missing
---
Proves that the entity context rules shall be entity-context-missing and entity-context-acknowledged, against the code Kibi reads at ingest.