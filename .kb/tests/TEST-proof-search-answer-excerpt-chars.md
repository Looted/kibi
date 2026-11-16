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
    receipt_id: PR-8c3cac7a3ea70ebab04a8a63
    test_id: TEST-proof-search-answer-excerpt-chars
    scope: unit
    outcome: passed
    code_snapshot: 7baf185385700cbc6052c693e2fdd4925358ed509447ee615fc111e64f05332f
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T13:13:21.691Z'
    finished_at: '2026-11-16T13:13:34.165Z'
    artifact_digest: a8fbcd1d37b88b5b6210ec5eae501c1908108a0e2126ffb36bdebb77dfba6d95
    contract_hash: 1a8991baaf6f1eec23690770ca12f0c165ed5b4e87e8f3a32ec9bbdd9e7f8790
    binding_hash: 6dcaaf2950161bcbfc52fb76bf6a8789c8d48c2a03561beab459ea9a84886460
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