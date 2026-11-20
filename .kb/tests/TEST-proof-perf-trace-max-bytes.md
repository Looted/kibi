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
    receipt_id: PR-b55663df7b84c788e668e3b0
    test_id: TEST-proof-perf-trace-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 8447726c08d9811a21e41698568d1cd1099ae0429f3916883843f6b251d9f230
    binding_hash: 8b75ffe559e63e37f7b8ece696bba8bcfae893fd467d1517128c588d0fdf7036
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