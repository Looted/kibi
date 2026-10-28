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
    receipt_id: PR-fb7a1377c0ba0e52585349ec
    test_id: TEST-proof-perf-trace-dir-env
    scope: unit
    outcome: passed
    code_snapshot: c93413e20f2fbe933ea3d5bde3572c88e748564b4d879a842927b272b519ce50
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:39:53.117Z'
    finished_at: '2026-10-28T17:39:53.219Z'
    artifact_digest: f4f546a7f75587b843e75a7a0fb07d44a2ed796b9383571f21ff417200a0f0a1
    contract_hash: 34524aae3931d05b78f5a96d95a01af742dc154eb938e0e54b9787b74f207b2f
    binding_hash: 9c9f30a8a20cb0f3a32dd5175eeca9ba9c652f079cd0a47a4bc714b17188c608
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