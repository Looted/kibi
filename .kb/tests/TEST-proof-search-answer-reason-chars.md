---
title: A requirement's reason in the kb_search answer shall be at most 280 characters, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-answer-reason-chars
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-search-answer-limits
      export: SEARCH_ANSWER_LIMITS.excerptChars
  proves:
    - CLAIM-CE95957228E6BE42
origin:
  kind: agent
  recorded_at: '2026-11-16T13:12:53.001Z'
id: TEST-proof-search-answer-reason-chars
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4559e4841dab3c3fd02483ae
    test_id: TEST-proof-search-answer-reason-chars
    scope: unit
    outcome: passed
    code_snapshot: 7baf185385700cbc6052c693e2fdd4925358ed509447ee615fc111e64f05332f
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T13:13:06.768Z'
    finished_at: '2026-11-16T13:13:19.450Z'
    artifact_digest: e4f77a906aa1e684445fb39a95a5822581d4edd4c055ac04ad54671493a1bc8c
    contract_hash: d576ff8cd8f1d109c9b20eabd85326a1f3db7fd012f1d7cb1f1a49203a984e56
    binding_hash: 79484766c583d3e688d03848e1009e021d7ec9bfda1f796d66a09b437301e335
    fingerprint: 5cd2f2f95eefbf913eca8baaafdbd9ebc822817a1783711460068e21c4d7cdcd
    fingerprint_components:
      contract: d576ff8cd8f1d109c9b20eabd85326a1f3db7fd012f1d7cb1f1a49203a984e56
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
      - symbol_id: SYM-proof-search-answer-reason-chars
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
      test_id: TEST-proof-search-answer-reason-chars
      variable: reason_text_max_chars
      value_type: int
      assumptions:
        - operator: eq
          value: 280
      claim:
        operator: lte
        value: 280
    certificate_digest: a3a1a72463438e52bf7aeb06d58bfabeee5a04099c17d129c0fe5cb72e516b54
    claim_bindings:
      - claim_key: CLAIM-CE95957228E6BE42
        requirement_id: REQ-search-answer-reason-length
        fact_id: FACT-search-answer-reason-length
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: lte
          value: 280
          value_type: int
          variable: reason_text_max_chars
---
Proves that a requirement's reason in the kb_search answer is at most 280 characters, against the clip length Kibi reads at ingest.