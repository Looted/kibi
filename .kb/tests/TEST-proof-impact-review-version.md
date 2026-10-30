---
title: The impact review version shall be kibi.impact-review.v1, by a regex proof
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
    - symbol_id: SYM-proof-impact-review-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-impact-stage-e-impact-review-version
  proves:
    - CLAIM-CC2BEED3DB80189F
origin:
  kind: agent
  recorded_at: '2026-10-28T17:32:36.813Z'
id: TEST-proof-impact-review-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e8cf5122b5dee8ae4b810af5
    test_id: TEST-proof-impact-review-version
    scope: unit
    outcome: passed
    code_snapshot: 5ed496f2f4162fe5e2f3ba3d9e466d7f9ee6dc45325e320c48977a64f361547b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:35:21.222Z'
    finished_at: '2026-10-28T17:35:21.343Z'
    artifact_digest: ba008267355b44c214aaa835a98656e5dd0bad7da97ed665963271300e67c01d
    contract_hash: db6dbd88a314b1cd8f0c7925fbcfe9c1f4032d9fb9cea6e05563b9c58f11decb
    binding_hash: d0a1ebdf81b325147c97444345a6b91f96a4955a61ece7fa919524769a793ed4
    fingerprint: df1cbd7c80f79052bef1976476d513c7beadcd19889d7482d64f5a34689535bf
    fingerprint_components:
      contract: db6dbd88a314b1cd8f0c7925fbcfe9c1f4032d9fb9cea6e05563b9c58f11decb
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
      - symbol_id: SYM-proof-impact-review-version
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
      test_id: TEST-proof-impact-review-version
      pattern:
        symbol_id: SYM-impact-stage-e-impact-review-version
        type: string
        value: kibi.impact-review.v1
    certificate_digest: ec58ccf3d9cacfdcb502c41c92f4ae90a584b3725155e37d87fd0e50bb6a858c
    claim_bindings:
      - claim_key: CLAIM-CC2BEED3DB80189F
        requirement_id: REQ-impact-review-identifiers
        fact_id: FACT-impact-review-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.impact-review.v1
---
Proves that the impact review version shall be kibi.impact-review.v1, against the code Kibi reads at ingest.