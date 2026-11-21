---
title: The scoped check omission note id shall be scoped_check_omitted_quality, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-scoped-check-omitted-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-scoped-check-omitted-id
  proves:
    - CLAIM-CDC574A1940BB7F6
origin:
  kind: agent
  recorded_at: '2026-10-28T20:23:41.621Z'
id: TEST-proof-scoped-check-omitted-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-71b2fb836baae8bb150ca076
    test_id: TEST-proof-scoped-check-omitted-id
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c1871f2f9b583089d26f157146092da5ff0ce0663124dc17e2d8572529babb87
    binding_hash: 439643375a8841ca710b1e9786eda39d4e40ffb4a9e47df48864ec1bedeb849d
    fingerprint: 5fb9ad93f5cffceddf34118daca4b84d77dd7d15009acf29b0018e2afa7200c2
    fingerprint_components:
      contract: c1871f2f9b583089d26f157146092da5ff0ce0663124dc17e2d8572529babb87
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
      - symbol_id: SYM-proof-scoped-check-omitted-id
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-scoped-check-omitted-id
      pattern:
        symbol_id: SYM-const-scoped-check-omitted-id
        type: string
        value: scoped_check_omitted_quality
    certificate_digest: fc0681f2e0e52349eee272a90780740f71335dbc674d234373643d8787fa4f64
    claim_bindings:
      - claim_key: CLAIM-CDC574A1940BB7F6
        requirement_id: REQ-kibi-symbol-and-supersede-rule-names
        fact_id: FACT-scoped-check-omitted-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: scoped_check_omitted_quality
---
Proves that the scoped check omission note id shall be scoped_check_omitted_quality, against the code Kibi reads at ingest.