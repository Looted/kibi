---
title: The proof contract claims pin code shall be proof_contract_claims_pin, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-contract-claims-pin-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-contract-claims-pin-code
  proves:
    - CLAIM-B00B92DBDAF79B88
origin:
  kind: agent
  recorded_at: '2026-10-28T20:31:22.882Z'
id: TEST-proof-contract-claims-pin-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c951ff3d545a173e1d6e6f3c
    test_id: TEST-proof-contract-claims-pin-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: ccd8f4eee37d67fd8f479f8a7ee09a316f2124ec09824450cdba4f13979d4cb2
    binding_hash: 80f9ad418b9cf46eb57a986c957f9f4ac0203155cde408b04e38e184831506a3
    fingerprint: 0c28e520c005901990192d5768f9307b5ef8ec5f963994c40b58aff2350f4057
    fingerprint_components:
      contract: ccd8f4eee37d67fd8f479f8a7ee09a316f2124ec09824450cdba4f13979d4cb2
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
      - symbol_id: SYM-proof-contract-claims-pin-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-contract-claims-pin-code
      pattern:
        symbol_id: SYM-const-proof-contract-claims-pin-code
        type: string
        value: proof_contract_claims_pin
    certificate_digest: 285a1daf193ed9e95bc00710d7264915d9e140fe27ebe269c5dd2be4e1bc53ba
    claim_bindings:
      - claim_key: CLAIM-B00B92DBDAF79B88
        requirement_id: REQ-cli-migration-proof-codes
        fact_id: FACT-contract-claims-pin-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: proof_contract_claims_pin
---
Proves that the proof contract claims pin code shall be proof_contract_claims_pin, against the code Kibi reads at ingest.