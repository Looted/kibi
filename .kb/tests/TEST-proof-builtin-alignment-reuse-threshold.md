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
    receipt_id: PR-6463779a26c4e784aa33266d
    test_id: TEST-proof-builtin-alignment-reuse-threshold
    scope: unit
    outcome: passed
    code_snapshot: 4015792e45e163c9ef221115c30a79374921664a5f8d7ef4db0f94d2f35e6043
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:58:20.733Z'
    finished_at: '2026-10-29T16:58:20.924Z'
    artifact_digest: 417a62d99b64f4a2b40c90d86e0bf2f41ec20c026e5b1460f1c376cb2c55c5dc
    contract_hash: fa74556934cdadcad26874f97d00cd642c5cde2ba1d737187f81f0341a9709bb
    binding_hash: 63a8102e9014846e44f58b2824255b45df7bf9aa56ba528c2a066ad7ec88120c
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