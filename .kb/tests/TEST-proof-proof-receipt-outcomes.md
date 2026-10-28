---
title: A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-proof-receipt-outcomes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-receipt-outcomes
  proves:
    - CLAIM-C7F57251FDD48ED8
origin:
  kind: agent
  recorded_at: '2026-10-28T10:57:49.557Z'
id: TEST-proof-proof-receipt-outcomes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b1b3d8c0821b9be2e13355c0
    test_id: TEST-proof-proof-receipt-outcomes
    scope: unit
    outcome: passed
    code_snapshot: 384992ab10a9d5988c607ac168f6a6dfbde65187ee9b60b46cb95fb216aff1eb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:00:12.137Z'
    finished_at: '2026-10-28T11:00:12.251Z'
    artifact_digest: 316065b22056fc6caa5d9d223204a1d4a6f252f32713d256012f8af3f1388e37
    contract_hash: 37cf90aab72c9456eacd36eab72fb45933e39d472bffff1932a4610ca6e37d98
    binding_hash: 7c2261214dd6bfa6ac419605f9dbeccdd1bbedb5ad823ab43cc1035c8fa16189
    fingerprint: 1ac3748a7063dedfb68399bdb8a939c9437b7496887a61fd28a1ee6261d0261c
    fingerprint_components:
      contract: 37cf90aab72c9456eacd36eab72fb45933e39d472bffff1932a4610ca6e37d98
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
      - symbol_id: SYM-proof-proof-receipt-outcomes
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-proof-receipt-outcomes
      domain:
        symbol_id: SYM-proof-receipt-outcomes
        members:
          - passed
          - failed
          - errored
          - cancelled
          - skipped
          - timed_out
          - interrupted
      results:
        - member: passed
          outcome: passed
        - member: failed
          outcome: passed
        - member: errored
          outcome: passed
        - member: cancelled
          outcome: passed
        - member: skipped
          outcome: passed
        - member: timed_out
          outcome: passed
        - member: interrupted
          outcome: passed
    certificate_digest: b0c9d674f3884f5cd13ea2599c5729ef0db6359926c524bf15bcc5699ad08f41
    claim_bindings:
      - claim_key: CLAIM-C7F57251FDD48ED8
        requirement_id: REQ-kibi-claim-bound-proof-settings
        fact_id: FACT-proof-receipt-outcomes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - cancelled
            - errored
            - failed
            - interrupted
            - passed
            - skipped
            - timed_out
---
Proves that a proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted, against the code Kibi reads at ingest.