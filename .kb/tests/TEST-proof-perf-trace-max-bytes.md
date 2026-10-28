---
title: A performance trace shall be at most 524288 bytes, by an arithmetic proof
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
    - symbol_id: SYM-proof-perf-trace-max-bytes
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-performance-trace-max-bytes
  proves:
    - CLAIM-3620E377E6B7BEAF
origin:
  kind: agent
  recorded_at: '2026-10-28T17:36:33.034Z'
id: TEST-proof-perf-trace-max-bytes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aafba2a1218cf89cfae8e3f5
    test_id: TEST-proof-perf-trace-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: c93413e20f2fbe933ea3d5bde3572c88e748564b4d879a842927b272b519ce50
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:39:59.444Z'
    finished_at: '2026-10-28T17:39:59.545Z'
    artifact_digest: bd9cd6b3e089c2c3eb9a85d394ac23fe5a928727f4e24698b9767bda01f09c36
    contract_hash: 8447726c08d9811a21e41698568d1cd1099ae0429f3916883843f6b251d9f230
    binding_hash: 97b6088e0a1965a8af0432c27d4d675df66178eaeae3d201a0d4b1d6e3172c93
    fingerprint: 87155b71f396406e62490651c517fc54c553c7a82ed8c2f3bb4e5d4b34f51986
    fingerprint_components:
      contract: 8447726c08d9811a21e41698568d1cd1099ae0429f3916883843f6b251d9f230
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
      - symbol_id: SYM-proof-perf-trace-max-bytes
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
      test_id: TEST-proof-perf-trace-max-bytes
      variable: max_bytes
      value_type: int
      assumptions:
        - operator: eq
          value: 524288
      claim:
        operator: eq
        value: 524288
    certificate_digest: 813cc3b83da3a0802a9043b79e9f2c6a6c35cef662d7eef0a517e4dfdd662be3
    claim_bindings:
      - claim_key: CLAIM-3620E377E6B7BEAF
        requirement_id: REQ-kibi-perf-trace-limits
        fact_id: FACT-perf-trace-max-bytes
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 524288
          value_type: int
          variable: max_bytes
---
Proves that a performance trace shall be at most 524288 bytes, against the code Kibi reads at ingest.