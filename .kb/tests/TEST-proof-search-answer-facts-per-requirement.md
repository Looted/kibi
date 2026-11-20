---
title: A search answer shall list at most 8 linked facts per governing requirement, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-answer-facts-per-requirement
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-search-answer-limits
      export: SEARCH_ANSWER_LIMITS.factsPerRequirement
  proves:
    - CLAIM-197E0C9A37307398
origin:
  kind: agent
  recorded_at: '2026-10-28T11:11:37.432Z'
id: TEST-proof-search-answer-facts-per-requirement
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c70bb245d94d7c80f5d86727
    test_id: TEST-proof-search-answer-facts-per-requirement
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 8dc41c94ecf73b7da57c0de11fc9b8d57f081aa3cbbb772b38e2f03ab68a2c3d
    binding_hash: 09dc81715d4c3bdc1942401197b815f35bc14a6a2775722c5ed96a05c65810d3
    fingerprint: e3c405283497deeeaea4bcfcb8cf1feab3e2bd2b4b121f2f548daf6ce1c7aeb1
    fingerprint_components:
      contract: 8dc41c94ecf73b7da57c0de11fc9b8d57f081aa3cbbb772b38e2f03ab68a2c3d
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
      - symbol_id: SYM-proof-search-answer-facts-per-requirement
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
      test_id: TEST-proof-search-answer-facts-per-requirement
      variable: facts_per_requirement
      value_type: int
      assumptions:
        - operator: eq
          value: 8
      claim:
        operator: eq
        value: 8
    certificate_digest: dc2b36c8a75fdc74b1b0178f5054554e757e7c66180b91cff61391aa7d891e23
    claim_bindings:
      - claim_key: CLAIM-197E0C9A37307398
        requirement_id: REQ-kibi-search-answer-limits
        fact_id: FACT-search-answer-facts-per-requirement
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 8
          value_type: int
          variable: facts_per_requirement
---
Proves that a search answer shall list at most 8 linked facts per governing requirement, against the code Kibi reads at ingest.