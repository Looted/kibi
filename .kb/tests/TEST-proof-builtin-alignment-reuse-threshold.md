---
title: The built-in aligner reuse threshold shall be 0.4, by an arithmetic proof
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
    - symbol_id: SYM-proof-builtin-alignment-reuse-threshold
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-builtin-subject-reuse-threshold
  proves:
    - CLAIM-B60C7E27A934B7C2
origin:
  kind: agent
  recorded_at: '2026-10-29T16:54:44.501Z'
id: TEST-proof-builtin-alignment-reuse-threshold
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bb9d2cd86d6df28627cd1996
    test_id: TEST-proof-builtin-alignment-reuse-threshold
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: fa74556934cdadcad26874f97d00cd642c5cde2ba1d737187f81f0341a9709bb
    binding_hash: e5fca44d3b737f69ac754933536fe5da92b2c2f17da91b6f9c42216b956ba09d
    fingerprint: cb214c91d29c106afeb10e45ed19cec54ed3079328a739735feda79e0ff27ce4
    fingerprint_components:
      contract: fa74556934cdadcad26874f97d00cd642c5cde2ba1d737187f81f0341a9709bb
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
      - symbol_id: SYM-proof-builtin-alignment-reuse-threshold
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
      test_id: TEST-proof-builtin-alignment-reuse-threshold
      variable: reuse_threshold
      value_type: real
      assumptions:
        - operator: eq
          value: 0.4
      claim:
        operator: eq
        value: 0.4
    certificate_digest: 038bf183925dfef183af3d60f9b0b5eff6f2d17fdff21b9f17c17f167873abcf
    claim_bindings:
      - claim_key: CLAIM-B60C7E27A934B7C2
        requirement_id: REQ-kibi-vocabulary-alignment-limits
        fact_id: FACT-builtin-alignment-reuse-threshold
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.4
          value_type: real
          variable: reuse_threshold
---
Proves that the built-in aligner reuse threshold shall be 0.4, against the code Kibi reads at ingest.