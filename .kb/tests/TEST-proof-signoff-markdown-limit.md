---
title: The Kibi signoff chat view shall show at most 15 rows, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-signoff-markdown-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-signoff-signoff-markdown-limit
  proves:
    - CLAIM-D2526E4DB4D51D99
origin:
  kind: agent
  recorded_at: '2026-10-28T10:15:32.281Z'
id: TEST-proof-signoff-markdown-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-42f58f69dd41cfa29d63befb
    test_id: TEST-proof-signoff-markdown-limit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 4303a6096eff515b3df3498631ba13aff1e8fd752c2fffeaaafc19717b8c52ed
    binding_hash: d97f952ee312c10d8f0604864caba9ffa81cdc644c7c91e44bd282aa06851660
    fingerprint: dbf06c991e16634d687e12ad1a52851f54991ff7c2d2180f40db37335da27caa
    fingerprint_components:
      contract: 4303a6096eff515b3df3498631ba13aff1e8fd752c2fffeaaafc19717b8c52ed
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
      - symbol_id: SYM-proof-signoff-markdown-limit
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-signoff-markdown-limit
      variable: markdown_row_limit
      value_type: int
      assumptions:
        - operator: eq
          value: 15
      claim:
        operator: eq
        value: 15
    certificate_digest: a57ea34f882d7adc602dee1f8ee55551eb42076bddeaf79e9586eb7efd705e03
    claim_bindings:
      - claim_key: CLAIM-D2526E4DB4D51D99
        requirement_id: REQ-kibi-signoff-brief-location
        fact_id: FACT-signoff-markdown-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 15
          value_type: int
          variable: markdown_row_limit
---
Proves that the Kibi signoff chat view shall show at most 15 rows, against the code Kibi reads at ingest.