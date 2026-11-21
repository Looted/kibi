---
title: The impact review file shall be .kibi/impact-review.json, by a regex proof
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
    - symbol_id: SYM-proof-impact-review-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-impact-review-path
  proves:
    - CLAIM-88D4AA7291A107CB
origin:
  kind: agent
  recorded_at: '2026-10-28T21:00:40.634Z'
id: TEST-proof-impact-review-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-82f60a161f3acc4a71d5f249
    test_id: TEST-proof-impact-review-path
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 77d30bcba18c52c4207c2085c7374e5897dac094a92fcfaffdcef4032c254c60
    binding_hash: 7ed5133c155912b9378d92f26d376236ed79ccfe225a176e6724cd8184437624
    fingerprint: 5f8ff91996e08dc4fe85f1b6c6c46fce4372eed59bc08a97b0384e3f27bebd9c
    fingerprint_components:
      contract: 77d30bcba18c52c4207c2085c7374e5897dac094a92fcfaffdcef4032c254c60
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
      - symbol_id: SYM-proof-impact-review-path
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
      test_id: TEST-proof-impact-review-path
      pattern:
        symbol_id: SYM-const-impact-review-path
        type: string
        value: .kibi/impact-review.json
    certificate_digest: 6a65c5edb19f1bb67c97a90bd28030d0e25a04c61eaf935cbd5f1470fe715dc1
    claim_bindings:
      - claim_key: CLAIM-88D4AA7291A107CB
        requirement_id: REQ-impact-review-file
        fact_id: FACT-impact-review-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kibi/impact-review.json
---
Proves that the impact review file shall be .kibi/impact-review.json, against the code Kibi reads at ingest.