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
    receipt_id: PR-74cba92f4a460b639ffe1ab4
    test_id: TEST-proof-contract-claims-pin-code
    scope: unit
    outcome: passed
    code_snapshot: fed4ebb783f2658a2b1a7673268d9b0ffcf80faa0d1f59c186900196eec682cc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:36:16.908Z'
    finished_at: '2026-10-28T20:36:17.067Z'
    artifact_digest: eb527f049a617505692b2783820f67221877b8e0d2ca702348b96a2e3da4c7e6
    contract_hash: ccd8f4eee37d67fd8f479f8a7ee09a316f2124ec09824450cdba4f13979d4cb2
    binding_hash: e61b1ba38cb63edde9af6967776a00a92cef9bf9f680dbcabc3b4f9c62bbc634
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
        requirement_id: REQ-cli-migration-pin-codes
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