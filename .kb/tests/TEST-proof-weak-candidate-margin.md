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
    receipt_id: PR-045937c1e579053d7aaa246b
    test_id: TEST-proof-weak-candidate-margin
    scope: unit
    outcome: passed
    code_snapshot: 1930b6bde491fcbbc77f67b0d5f56d1e187b3c4225271c211189a107ec098307
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T08:06:42.726Z'
    finished_at: '2026-10-27T08:06:42.909Z'
    artifact_digest: dd9d8a143afcd46e1cacf7e1b9d97a9e0ee43a0853d85c420e6eb09daed7c9a1
    contract_hash: 1f5c9ae8600fc0bbf337f3a4c337da59e573fd814b2f71dcbeb0817f0114d1b4
    binding_hash: 22ebc2bc30c5b74589f0acdc027f6fe573d7c414005d50b475e8c53b032d1529
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
    evidence_level: tested
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
        scope: intent
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.06
          value_type: real
          variable: weak_candidate_margin
---
Reads WEAK_CANDIDATE_MARGIN from the applicability scorer and proves it equals the margin the requirement states.