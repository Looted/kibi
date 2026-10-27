---
title: The applicability threshold is 0.62, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T08:05:21.517Z'
id: TEST-proof-applicability-threshold
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-applicability-threshold
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: 3ddd3dd671e3f236
  proves:
    - CLAIM-DF5F85EFF9599777
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bfb25d7cf0c30ee57b028c85
    test_id: TEST-proof-applicability-threshold
    scope: unit
    outcome: passed
    code_snapshot: 1930b6bde491fcbbc77f67b0d5f56d1e187b3c4225271c211189a107ec098307
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T08:06:33.248Z'
    finished_at: '2026-10-27T08:06:33.426Z'
    artifact_digest: 6d8c0a3c9a245507acd242b36a55c586029382e5b9cf88f3883481ad0e8d0af4
    contract_hash: c7b40c30e9cee4452993c3ccd10b4a956664968189d140573062446441c2aee0
    binding_hash: d160e3feb448dde184f1705a5c9889d7f84be5fea55bf3d5757db989db424efa
    fingerprint: 619eb06a8fc08587bfa5d23aff35296804b14352aaeaa75b0320d44428782942
    fingerprint_components:
      contract: c7b40c30e9cee4452993c3ccd10b4a956664968189d140573062446441c2aee0
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
      - symbol_id: SYM-proof-applicability-threshold
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
      test_id: TEST-proof-applicability-threshold
      variable: applicability_threshold
      value_type: real
      assumptions:
        - operator: eq
          value: 0.62
      claim:
        operator: eq
        value: 0.62
    certificate_digest: 1ad0e24fade6e3bc66613e5cd08121e050cdd228f2118e52fa1e4bbecb1c9585
    claim_bindings:
      - claim_key: CLAIM-DF5F85EFF9599777
        requirement_id: REQ-kibi-predicate-suggestion-thresholds
        fact_id: FACT-PROP-6CB6EAF6F48DC108
        binding: derived
        scope: intent
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.62
          value_type: real
          variable: applicability_threshold
---
Reads MIN_APPLICABILITY_SCORE from the applicability scorer and proves it equals the threshold the requirement states.