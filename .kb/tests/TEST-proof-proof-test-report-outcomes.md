---
title: A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted, by an exhaustive proof
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
    - symbol_id: SYM-proof-proof-test-report-outcomes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-proof-test-report-outcomes
  proves:
    - CLAIM-C11CA176D75C6530
origin:
  kind: agent
  recorded_at: '2026-10-28T11:08:00.855Z'
id: TEST-proof-proof-test-report-outcomes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8065034005c35dc8d3607958
    test_id: TEST-proof-proof-test-report-outcomes
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 3eed387257d41202fffe288fd281956fe3e9636cb52b4820bbb28f224181cf2b
    binding_hash: 659e7249fd2aff36e5ddd77340ce2dfab67aec8ac5fe6914f3f4eb475935a229
    fingerprint: 25393ef0e95a304844c457b58a0847cd23e155b146df6b59e969f3bb0515bc51
    fingerprint_components:
      contract: 3eed387257d41202fffe288fd281956fe3e9636cb52b4820bbb28f224181cf2b
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
      - symbol_id: SYM-proof-proof-test-report-outcomes
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
      test_id: TEST-proof-proof-test-report-outcomes
      domain:
        symbol_id: SYM-const-proof-test-report-outcomes
        members:
          - passed
          - failed
          - timed_out
          - errored
          - interrupted
      results:
        - member: passed
          outcome: passed
        - member: failed
          outcome: passed
        - member: timed_out
          outcome: passed
        - member: errored
          outcome: passed
        - member: interrupted
          outcome: passed
    certificate_digest: c264cfdc72c86efcc2cab1d054a01406e835628fd72ff58d3f498116fcf40c27
    claim_bindings:
      - claim_key: CLAIM-C11CA176D75C6530
        requirement_id: REQ-kibi-proof-step-settings
        fact_id: FACT-proof-test-report-outcomes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - errored
            - failed
            - interrupted
            - passed
            - timed_out
---
Proves that a per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted, against the code Kibi reads at ingest.