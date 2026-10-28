---
title: A search answer shall keep at most 280 characters of an ADR decision excerpt, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-answer-excerpt-chars
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-search-answer-limits
      export: SEARCH_ANSWER_LIMITS.excerptChars
  proves:
    - CLAIM-779D56CBE5452DFC
origin:
  kind: agent
  recorded_at: '2026-10-28T11:12:01.359Z'
id: TEST-proof-search-answer-excerpt-chars
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e3ddba372a4d7f7481cd80cb
    test_id: TEST-proof-search-answer-excerpt-chars
    scope: unit
    outcome: passed
    code_snapshot: 98c9548fc40fd9d92b46f3a96e28309ed72f08183f2027ffa1ec112951c0d07b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:13:05.917Z'
    finished_at: '2026-10-28T11:13:06.072Z'
    artifact_digest: d5dfe1219afe24dfc56281859892f2e0c22280396dbb5f5cab8d7b8c174e81a6
    contract_hash: 1a8991baaf6f1eec23690770ca12f0c165ed5b4e87e8f3a32ec9bbdd9e7f8790
    binding_hash: 141edff317e4e7a57fccbd17c0653692595b427786d9974c121500521f3c672b
    fingerprint: d8176013dfd96bc8a807321b900596ef242885e7f1c61f7db9ab3d64f83f674c
    fingerprint_components:
      contract: 1a8991baaf6f1eec23690770ca12f0c165ed5b4e87e8f3a32ec9bbdd9e7f8790
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
      - symbol_id: SYM-proof-search-answer-excerpt-chars
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
      test_id: TEST-proof-search-answer-excerpt-chars
      variable: excerpt_chars
      value_type: int
      assumptions:
        - operator: eq
          value: 280
      claim:
        operator: eq
        value: 280
    certificate_digest: a239d8e22d011b44ec6fea8d2a4700f7eb074838ec295a6164569cc5dd998cd8
    claim_bindings:
      - claim_key: CLAIM-779D56CBE5452DFC
        requirement_id: REQ-kibi-search-answer-limits
        fact_id: FACT-search-answer-excerpt-chars
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 280
          value_type: int
          variable: excerpt_chars
---
Proves that a search answer shall keep at most 280 characters of an ADR decision excerpt, against the code Kibi reads at ingest.