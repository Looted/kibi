---
title: The proof contract claims review code shall be proof_contract_claims_review, by a regex proof
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
    - symbol_id: SYM-proof-contract-claims-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-contract-claims-review-code
  proves:
    - CLAIM-DE4BC3D13ADA09E6
origin:
  kind: agent
  recorded_at: '2026-10-28T20:31:47.285Z'
id: TEST-proof-contract-claims-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5b3fa9d194f3454465bd4266
    test_id: TEST-proof-contract-claims-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 901f8336c34f307270fa149d56ae7ecee105e0e9082f4fdb809526a8afb8c58d
    binding_hash: 4cd7856c1f9349db25f6c0c393b36e54e9e5d71a7c436825b34b054d26bae8cc
    fingerprint: f9585398f033b64220e6a1424179ca8a1df418e87a35d89118167fabda3a05c2
    fingerprint_components:
      contract: 901f8336c34f307270fa149d56ae7ecee105e0e9082f4fdb809526a8afb8c58d
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
      - symbol_id: SYM-proof-contract-claims-review-code
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
      test_id: TEST-proof-contract-claims-review-code
      pattern:
        symbol_id: SYM-const-proof-contract-claims-review-code
        type: string
        value: proof_contract_claims_review
    certificate_digest: adc487e312fc1325a0e71ec172144fab7fbc86b4718f224532a96525dcf23e49
    claim_bindings:
      - claim_key: CLAIM-DE4BC3D13ADA09E6
        requirement_id: REQ-cli-migration-proof-codes
        fact_id: FACT-contract-claims-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: proof_contract_claims_review
---
Proves that the proof contract claims review code shall be proof_contract_claims_review, against the code Kibi reads at ingest.