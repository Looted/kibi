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
    receipt_id: PR-47c529d50ef1fbb4f28dea36
    test_id: TEST-proof-entity-context-rules
    scope: unit
    outcome: passed
    code_snapshot: 4f161374550f014eb48d8e921619cbdaa1e1e274ac4673138b0e5ff3cbb2b55f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:06:03.420Z'
    finished_at: '2026-10-28T11:06:03.590Z'
    artifact_digest: 28fe7f462537574e93c285f46dcb3c84a6dfcd734121d356056d8dbf65d2d395
    contract_hash: 98de3d74d7d5c440d07142e60746bf49e6ce3b107fcdef97e6a5406addd5755d
    binding_hash: 31ade0bdf018a295ad3a7de1525026087aca0db503020a5de9e17564cd41fab2
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