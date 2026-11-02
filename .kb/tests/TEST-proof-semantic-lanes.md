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
    receipt_id: PR-60f5914c147547d5332b4273
    test_id: TEST-proof-semantic-lanes
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:52:16.181Z'
    finished_at: '2026-10-30T19:52:16.296Z'
    artifact_digest: 96b507b776a8675f231c681256dcd463b4f6da27606654e2d23da60a8e994830
    contract_hash: bf7b5d9d53b92fb9070cc090d5183ea009bf094354cb1104b8f074d9bed82d3f
    binding_hash: 252f7e74ed4cd16f22dd696f272c2792ad2463cfd91f597c1f576dcceae47edf
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