---
title: A performance trace shall hold at most 5000 events, by an arithmetic proof
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
    - symbol_id: SYM-proof-perf-trace-max-events
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-performance-trace-max-events
  proves:
    - CLAIM-55F3786ECA1A6DD0
origin:
  kind: agent
  recorded_at: '2026-10-28T17:36:52.242Z'
id: TEST-proof-perf-trace-max-events
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b635b854e10fadf95233ddfb
    test_id: TEST-proof-perf-trace-max-events
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: c63225cfa69fbb99574fff7f536ddbfe8f0cbff5338fe63f4e1338dab031a8b2
    binding_hash: 3a8648f5ceb1431b107ba7eacde70f3ecd5aca28ea715434463146d487e96159
    fingerprint: 6931a6377dba14fbf92c6bb8f94125dfaf69c624a21c0308adf3a0ac52a378ed
    fingerprint_components:
      contract: c63225cfa69fbb99574fff7f536ddbfe8f0cbff5338fe63f4e1338dab031a8b2
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
      - symbol_id: SYM-proof-perf-trace-max-events
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
      test_id: TEST-proof-perf-trace-max-events
      variable: max_events
      value_type: int
      assumptions:
        - operator: eq
          value: 5000
      claim:
        operator: eq
        value: 5000
    certificate_digest: 14bb671923d5ce71bc3a5e780587db574c9b5122e06f5ebdde10117a9fde62c3
    claim_bindings:
      - claim_key: CLAIM-55F3786ECA1A6DD0
        requirement_id: REQ-kibi-perf-trace-limits
        fact_id: FACT-perf-trace-max-events
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5000
          value_type: int
          variable: max_events
---
Proves that a performance trace shall hold at most 5000 events, against the code Kibi reads at ingest.