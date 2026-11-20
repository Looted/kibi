---
title: The weak-candidate margin is 0.06, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T08:05:31.246Z'
id: TEST-proof-weak-candidate-margin
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-weak-candidate-margin
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: 7657f944663e9895
  proves:
    - CLAIM-85F4539DE7FF58E8
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-74bb7ca3c02dc58f1aaa353f
    test_id: TEST-proof-weak-candidate-margin
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1f5c9ae8600fc0bbf337f3a4c337da59e573fd814b2f71dcbeb0817f0114d1b4
    binding_hash: 19ae2e27dc2696dbcb16bf6c66341b88e0d92be0cf2d94f5852db7185c195e46
    fingerprint: e16356d1d5c3a4f4ce5cc40009ad7f8968e00f0f323a48979635b5ba6f90b0f3
    fingerprint_components:
      contract: 1f5c9ae8600fc0bbf337f3a4c337da59e573fd814b2f71dcbeb0817f0114d1b4
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
      - symbol_id: SYM-proof-weak-candidate-margin
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
      test_id: TEST-proof-weak-candidate-margin
      variable: weak_candidate_margin
      value_type: real
      assumptions:
        - operator: eq
          value: 0.06
      claim:
        operator: eq
        value: 0.06
    certificate_digest: bc222dd4766fb383fc7bb13671692e9406848d29ac7731f134bdef647770e9b8
    claim_bindings:
      - claim_key: CLAIM-85F4539DE7FF58E8
        requirement_id: REQ-kibi-predicate-suggestion-thresholds
        fact_id: FACT-PROP-60F32F10D6BCB433
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.06
          value_type: real
          variable: weak_candidate_margin
---
Reads WEAK_CANDIDATE_MARGIN from the applicability scorer and proves it equals the margin the requirement states.