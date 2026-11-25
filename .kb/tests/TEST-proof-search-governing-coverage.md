---
title: The kb_search governing coverage is 0.5, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-governing-coverage
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-governing-coverage
  proves:
    - CLAIM-68AA9A329F41C36B
origin:
  kind: agent
  recorded_at: '2026-11-25T19:27:25.383Z'
id: TEST-proof-search-governing-coverage
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a072b796c7d05eea1814484c
    test_id: TEST-proof-search-governing-coverage
    scope: unit
    outcome: passed
    code_snapshot: 6e77aa8491803349200bf000f91038c8e3ce1969155ba14cb5bad5a774bd6c1e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T20:07:07.720Z'
    finished_at: '2026-11-25T20:07:07.872Z'
    artifact_digest: 2bd917e035d1edd864a491a42c047cb4b8fcdf5d2596e1ae29b05f2875765c83
    contract_hash: 30c8d8df4456cc2c15a3e0184c1cb76fd15089e13f349e914c0c359f48d544dd
    binding_hash: 2f068b82041d871059b388b3e4109d277c19eccbea02a26ea4042baf73dbddbd
    fingerprint: f81d71c96f3dffcc0537fcbda1b052f36e4613eec57a592f6e60cf9c04fe9fa7
    fingerprint_components:
      contract: 30c8d8df4456cc2c15a3e0184c1cb76fd15089e13f349e914c0c359f48d544dd
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
      - symbol_id: SYM-proof-search-governing-coverage
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
      test_id: TEST-proof-search-governing-coverage
      variable: governing_coverage
      value_type: real
      assumptions:
        - operator: eq
          value: 0.5
      claim:
        operator: eq
        value: 0.5
    certificate_digest: 5bee49061bc2bbc14d36b1e1f516d2a57e750581bc912e63675cbdf7b333e52d
    claim_bindings:
      - claim_key: CLAIM-68AA9A329F41C36B
        requirement_id: REQ-search-meaning-limits
        fact_id: FACT-search-meaning-limits-governing-coverage
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.5
          value_type: real
          variable: governing_coverage
---
Writes the arithmetic certificate weakCoverageCertificate in packages/cli/tests/proofs/claims/search-meaning-limits.proof.test.ts: it assumes the value SYM-const-governing-coverage holds and claims the bound of FACT-search-meaning-limits-governing-coverage. Kibi reads the constant again at ingest and re-checks the certificate.