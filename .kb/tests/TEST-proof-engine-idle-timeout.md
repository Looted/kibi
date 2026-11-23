---
title: The engine daemon shall stop after 600000 milliseconds idle, by an arithmetic proof
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
    - symbol_id: SYM-proof-engine-idle-timeout
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-engine-idle-timeout
  proves:
    - CLAIM-28EA5B8DC7DE84A7
origin:
  kind: agent
  recorded_at: '2026-10-28T19:04:07.259Z'
id: TEST-proof-engine-idle-timeout
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cbcc1c5370e5377867a187a6
    test_id: TEST-proof-engine-idle-timeout
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 9f37298380941ec51e3ca25e61f3fd621abf710a6b0a1c498eb7005912ef0996
    binding_hash: 8b7fbbf6199dd1df750587f0cd162f528be29f9de8a3443bf3d21e318c7e1f5c
    fingerprint: 7be78d348899fe306d2562eeaab3cc1874e9c56ed9e15edc7d8349758a61a393
    fingerprint_components:
      contract: 9f37298380941ec51e3ca25e61f3fd621abf710a6b0a1c498eb7005912ef0996
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
      - symbol_id: SYM-proof-engine-idle-timeout
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
      test_id: TEST-proof-engine-idle-timeout
      variable: idle_timeout_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 600000
      claim:
        operator: eq
        value: 600000
    certificate_digest: 6fc4363e1c6693dfa94d2275f7d6bb0c2ea6b8ecd87ec0d196bf647676d51a9b
    claim_bindings:
      - claim_key: CLAIM-28EA5B8DC7DE84A7
        requirement_id: REQ-engine-protocol-settings
        fact_id: FACT-engine-idle-timeout
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 600000
          value_type: int
          variable: idle_timeout_ms
---
Proves that the engine daemon shall stop after 600000 milliseconds idle, against the code Kibi reads at ingest.