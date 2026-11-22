---
title: A semantic lane shall be strict_property, predicate, rule, observation_review or none, by an exhaustive proof
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
    - symbol_id: SYM-proof-semantic-lanes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cap-plugin-semantic-lanes-163e7bc6
  proves:
    - CLAIM-B15674FBA5592F7B
origin:
  kind: agent
  recorded_at: '2026-10-29T10:30:19.944Z'
id: TEST-proof-semantic-lanes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d28aa45fa7679476afa7c4b4
    test_id: TEST-proof-semantic-lanes
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: bf7b5d9d53b92fb9070cc090d5183ea009bf094354cb1104b8f074d9bed82d3f
    binding_hash: e4cfb74fc690c140f2aa5239d0a79953661002c1dd1d866e4ed9876778b3a97c
    fingerprint: c60af9ad681d926580485c7da886372f59142a63f1df1915a2f2264b0f77d339
    fingerprint_components:
      contract: bf7b5d9d53b92fb9070cc090d5183ea009bf094354cb1104b8f074d9bed82d3f
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
      - symbol_id: SYM-proof-semantic-lanes
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
      test_id: TEST-proof-semantic-lanes
      domain:
        symbol_id: SYM-cap-plugin-semantic-lanes-163e7bc6
        members:
          - strict_property
          - predicate
          - rule
          - observation_review
          - none
      results:
        - member: strict_property
          outcome: passed
        - member: predicate
          outcome: passed
        - member: rule
          outcome: passed
        - member: observation_review
          outcome: passed
        - member: none
          outcome: passed
    certificate_digest: 580c1b1ac664679dcd0b0768ce383c7163c38db289f6d994e618361c7607a8a6
    claim_bindings:
      - claim_key: CLAIM-B15674FBA5592F7B
        requirement_id: REQ-capability-plugin-vocabulary
        fact_id: FACT-semantic-lanes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - none
            - observation_review
            - predicate
            - rule
            - strict_property
---
Proves that a semantic lane shall be strict_property, predicate, rule, observation_review or none, against the code Kibi reads at ingest.