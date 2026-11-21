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
    receipt_id: PR-78281d7de73b7830cdfad3c9
    test_id: TEST-proof-semantic-signal-kinds
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: b2e47c22a0cf21eebee43d8a72d116f8309d0680cbe71536e2f467413d0fc2bc
    binding_hash: 4bd059d550d36af3654c880b14e7c68865f691f8bd3b51709c02133d89d4ff70
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