---
title: A search answer shall be at most 16384 bytes, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-answer-max-bytes
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-search-answer-limits
      export: SEARCH_ANSWER_LIMITS.maxBytes
  proves:
    - CLAIM-46AE98A8124BBE18
origin:
  kind: agent
  recorded_at: '2026-10-28T11:10:25.869Z'
id: TEST-proof-search-answer-max-bytes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8a3470c986b94493c30db92e
    test_id: TEST-proof-search-answer-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 7da957ef53a62aa8477c53e4b61593c8447afc202440401f4fb5bd8eb1663614
    binding_hash: 1b4021d8c708e8e7759139e33de4e1ba4c3b23bb2fce31f5f5bdd2a187bf8fc1
    fingerprint: 477451f194dbb4b7f9e8871deae55a98f3de0c81efe4cabee4002909bd568d98
    fingerprint_components:
      contract: 7da957ef53a62aa8477c53e4b61593c8447afc202440401f4fb5bd8eb1663614
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
      - symbol_id: SYM-proof-search-answer-max-bytes
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
      test_id: TEST-proof-search-answer-max-bytes
      variable: max_bytes
      value_type: int
      assumptions:
        - operator: eq
          value: 16384
      claim:
        operator: eq
        value: 16384
    certificate_digest: e6afcd3941868019b53007010b6eb19f61f21edc4f3af6e73d14be1c61dad489
    claim_bindings:
      - claim_key: CLAIM-46AE98A8124BBE18
        requirement_id: REQ-kibi-search-answer-limits
        fact_id: FACT-search-answer-max-bytes
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 16384
          value_type: int
          variable: max_bytes
---
Proves that a search answer shall be at most 16384 bytes, against the code Kibi reads at ingest.