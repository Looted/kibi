---
title: The minimum supersede explanation length shall be 12 words, by an arithmetic proof
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
    - symbol_id: SYM-proof-min-why-changed-words
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-decision-firmness-min-why-words
  proves:
    - CLAIM-18032217B0DD0A8E
origin:
  kind: agent
  recorded_at: '2026-10-28T10:34:07.065Z'
id: TEST-proof-min-why-changed-words
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-50bf575130dd96c9f6230ffa
    test_id: TEST-proof-min-why-changed-words
    scope: unit
    outcome: passed
    code_snapshot: d1a0d2ef8f66c9c334383a818f6f2125685d0b4f5590d2f4a61aaeadee65c910
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:34:59.625Z'
    finished_at: '2026-10-28T10:34:59.750Z'
    artifact_digest: a49e4e28fb927b865303d5396ea1dc9af2b1237ccb5e3d261ae3a42c5c76005d
    contract_hash: a3049126037d577d3bdc8cb0c159c0361e044bdc28317ebfbf45298832dcd771
    binding_hash: cb1566553218b198bbb66bf3728bf19031f77fbccb309af7d5564929e4b15f3f
    fingerprint: 3816bb25edbcbdcd752783f098e57d9988dd0908bbd95fb909154c3de8110b60
    fingerprint_components:
      contract: a3049126037d577d3bdc8cb0c159c0361e044bdc28317ebfbf45298832dcd771
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
      - symbol_id: SYM-proof-min-why-changed-words
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
      test_id: TEST-proof-min-why-changed-words
      variable: min_why_changed_words
      value_type: int
      assumptions:
        - operator: eq
          value: 12
      claim:
        operator: eq
        value: 12
    certificate_digest: 4e022e2e40e39beb323b879d7e2e0ec24040957b31505bfdff07372be2198279
    claim_bindings:
      - claim_key: CLAIM-18032217B0DD0A8E
        requirement_id: REQ-kb-decision-firmness-settings
        fact_id: FACT-min-why-changed-words
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 12
          value_type: int
          variable: min_why_changed_words
---
Proves that the minimum supersede explanation length shall be 12 words, against the code Kibi reads at ingest.