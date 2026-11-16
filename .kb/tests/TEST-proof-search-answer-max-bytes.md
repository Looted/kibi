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
    receipt_id: PR-6ea6cafa33496e624be0be5a
    test_id: TEST-proof-search-answer-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: 7baf185385700cbc6052c693e2fdd4925358ed509447ee615fc111e64f05332f
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T13:13:21.691Z'
    finished_at: '2026-11-16T13:13:34.165Z'
    artifact_digest: a8fbcd1d37b88b5b6210ec5eae501c1908108a0e2126ffb36bdebb77dfba6d95
    contract_hash: 7da957ef53a62aa8477c53e4b61593c8447afc202440401f4fb5bd8eb1663614
    binding_hash: 585b5d06a9df057c67b66ef8c1f9bfbf7466b5df7879a26594603d46d1486555
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