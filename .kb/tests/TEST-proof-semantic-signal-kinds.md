---
title: A semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default, by an exhaustive proof
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
    - symbol_id: SYM-proof-semantic-signal-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cap-plugin-semantic-signal-kinds-eb004334
  proves:
    - CLAIM-674F7648CC43012D
origin:
  kind: agent
  recorded_at: '2026-10-29T10:30:51.059Z'
id: TEST-proof-semantic-signal-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6f9846e8ab25b7379c71ae66
    test_id: TEST-proof-semantic-signal-kinds
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:52:19.056Z'
    finished_at: '2026-10-30T19:52:19.161Z'
    artifact_digest: 570970ef1abfefba6632e4082b180cd8a81db12af18bf415fddba3dae4cb4770
    contract_hash: b2e47c22a0cf21eebee43d8a72d116f8309d0680cbe71536e2f467413d0fc2bc
    binding_hash: bc0d179f6dd9da4f373d4839d3774be95b0dde033c7851537c056cddd3b7a313
    fingerprint: f0ff8c6042281a050ea1783d1d3bdeabf0553c58a1f4965160459faa26f3eabd
    fingerprint_components:
      contract: b2e47c22a0cf21eebee43d8a72d116f8309d0680cbe71536e2f467413d0fc2bc
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
      - symbol_id: SYM-proof-semantic-signal-kinds
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
      test_id: TEST-proof-semantic-signal-kinds
      domain:
        symbol_id: SYM-cap-plugin-semantic-signal-kinds-eb004334
        members:
          - normative_modal
          - numeric_cardinality
          - numeric_threshold
          - conditional
          - permission
          - state_or_default
      results:
        - member: normative_modal
          outcome: passed
        - member: numeric_cardinality
          outcome: passed
        - member: numeric_threshold
          outcome: passed
        - member: conditional
          outcome: passed
        - member: permission
          outcome: passed
        - member: state_or_default
          outcome: passed
    certificate_digest: 95998e52d3d79d724c4b293e394aad800936a21a22368c9f09456a96306925bd
    claim_bindings:
      - claim_key: CLAIM-674F7648CC43012D
        requirement_id: REQ-capability-plugin-vocabulary
        fact_id: FACT-semantic-signal-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - conditional
            - normative_modal
            - numeric_cardinality
            - numeric_threshold
            - permission
            - state_or_default
---
Proves that a semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default, against the code Kibi reads at ingest.