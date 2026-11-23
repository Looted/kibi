---
title: The self-attested exception review code shall be review_exception_approval_self_attested, by a regex proof
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
    - symbol_id: SYM-proof-self-attested-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-EXCEPTION_SELF_ATTESTED_REVIEW_CODE
  proves:
    - CLAIM-F1D38D76B1677DCF
origin:
  kind: agent
  recorded_at: '2026-10-28T20:27:05.814Z'
id: TEST-proof-self-attested-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e5924f9d9acbb47875cab7a1
    test_id: TEST-proof-self-attested-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 041af690b8ab98188c8446fd9e158871c1d3a0931f167b4d75664e215ad326a9
    binding_hash: 7641f4e5291e38f23a4d96225a183687622cadc1b676815bea044c9c9fb2629b
    fingerprint: 435a949a7fce3ed1ddd6dc05ca9362cd7176fb4e946f380278582e0a9b2cc999
    fingerprint_components:
      contract: 041af690b8ab98188c8446fd9e158871c1d3a0931f167b4d75664e215ad326a9
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
      - symbol_id: SYM-proof-self-attested-review-code
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
      test_id: TEST-proof-self-attested-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-EXCEPTION_SELF_ATTESTED_REVIEW_CODE
        type: string
        value: review_exception_approval_self_attested
    certificate_digest: b779807e302da08de5dc41fe4a269dac349520f614d4106b73cd3723dcf4a592
    claim_bindings:
      - claim_key: CLAIM-F1D38D76B1677DCF
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-self-attested-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_exception_approval_self_attested
---
Proves that the self-attested exception review code shall be review_exception_approval_self_attested, against the code Kibi reads at ingest.