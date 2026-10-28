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
    receipt_id: PR-121c8274dd737fe61acfa422
    test_id: TEST-proof-impact-review-path
    scope: unit
    outcome: passed
    code_snapshot: 21d3705e88a7719227fc5095b0ab5b18b69f15341f63355c92a4a88c77f7ea32
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:02:54.897Z'
    finished_at: '2026-10-28T21:02:55.025Z'
    artifact_digest: f0ff1889d50b3ba702cb9601b466296542253e591f20f2aa3d765fa62b02b400
    contract_hash: 77d30bcba18c52c4207c2085c7374e5897dac094a92fcfaffdcef4032c254c60
    binding_hash: 460a519eaf2623ca35dd6a237a7c628e15d86b0a5d988347ac2ac0ec5b8ccb43
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