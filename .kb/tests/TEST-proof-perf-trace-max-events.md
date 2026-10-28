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
    receipt_id: PR-3dea12e0e305effa77f47c83
    test_id: TEST-proof-perf-trace-max-events
    scope: unit
    outcome: passed
    code_snapshot: c93413e20f2fbe933ea3d5bde3572c88e748564b4d879a842927b272b519ce50
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:40:06.025Z'
    finished_at: '2026-10-28T17:40:06.151Z'
    artifact_digest: face7dcc5df3e8dd91ff1847d6b865dcf8ffff72719553f5a4cdb699b1b9d062
    contract_hash: c63225cfa69fbb99574fff7f536ddbfe8f0cbff5338fe63f4e1338dab031a8b2
    binding_hash: 1604ca70eb540288d097a70e1013fc4a1fb82f4ef7e8b216134608362ef1d431
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