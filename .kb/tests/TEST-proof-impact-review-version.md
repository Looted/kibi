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
    receipt_id: PR-42b434fa71f0800562d89974
    test_id: TEST-proof-impact-review-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: db6dbd88a314b1cd8f0c7925fbcfe9c1f4032d9fb9cea6e05563b9c58f11decb
    binding_hash: 40c5c40fb53c1e8147ef6b9b1bc73a091d3ab87a76ac375298e06a5e981fd7f3
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