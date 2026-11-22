---
title: The performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR, by a regex proof
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
    - symbol_id: SYM-proof-perf-trace-dir-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-performance-trace-dir-env
  proves:
    - CLAIM-D236C7BC49421956
origin:
  kind: agent
  recorded_at: '2026-10-28T17:36:14.476Z'
id: TEST-proof-perf-trace-dir-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f7888bce0c38085156a5ee87
    test_id: TEST-proof-perf-trace-dir-env
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 34524aae3931d05b78f5a96d95a01af742dc154eb938e0e54b9787b74f207b2f
    binding_hash: ff8fb2522849e2cc934ab81331995d8ef9f8c1c62ee0bb14f75844ad3aa62e51
    fingerprint: ea7a504c4ca29ec8118676accc7eaabfa9297b273d7770eeb8f250cf420dce0c
    fingerprint_components:
      contract: 34524aae3931d05b78f5a96d95a01af742dc154eb938e0e54b9787b74f207b2f
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
      - symbol_id: SYM-proof-perf-trace-dir-env
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
      test_id: TEST-proof-perf-trace-dir-env
      pattern:
        symbol_id: SYM-performance-trace-dir-env
        type: string
        value: KIBI_PERF_TRACE_DIR
    certificate_digest: a9fa8a403cd1d7e4e3021805689a3779b43c773aade9d279ebda15d1b6473d03
    claim_bindings:
      - claim_key: CLAIM-D236C7BC49421956
        requirement_id: REQ-kibi-perf-trace-limits
        fact_id: FACT-perf-trace-dir-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_PERF_TRACE_DIR
---
Proves that the performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR, against the code Kibi reads at ingest.