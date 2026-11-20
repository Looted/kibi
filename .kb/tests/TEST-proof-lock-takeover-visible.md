---
title: A store lock takeover shall stay visible for 86400000 milliseconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-lock-takeover-visible
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-store-lock-takeover-visible-ms
  proves:
    - CLAIM-68F4FC02E5AEE4E4
origin:
  kind: agent
  recorded_at: '2026-10-28T20:44:25.568Z'
id: TEST-proof-lock-takeover-visible
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-db787e6e05db4bdf456d8700
    test_id: TEST-proof-lock-takeover-visible
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: c2448f55ef62b1ea5c882e5204e30275a9e069c558f87582b9cd2bcc08ce92eb
    binding_hash: 96dc12e98b6615df18ec102df2b9707a5f744870ea9beea9bb78fd2e3fe02795
    fingerprint: 9df6db73a2f50fddb4901c97e48749b591592088d6e9a14365a587224b5bc692
    fingerprint_components:
      contract: c2448f55ef62b1ea5c882e5204e30275a9e069c558f87582b9cd2bcc08ce92eb
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
      - symbol_id: SYM-proof-lock-takeover-visible
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
      test_id: TEST-proof-lock-takeover-visible
      variable: takeover_visible_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 86400000
      claim:
        operator: eq
        value: 86400000
    certificate_digest: 319e59ca10d06a07ed8b385f9bf7073efc857abcd2d0dc6ad5ab307e872be058
    claim_bindings:
      - claim_key: CLAIM-68F4FC02E5AEE4E4
        requirement_id: REQ-branch-store-settings
        fact_id: FACT-lock-takeover-visible
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 86400000
          value_type: int
          variable: takeover_visible_ms
---
Proves that a store lock takeover shall stay visible for 86400000 milliseconds, against the code Kibi reads at ingest.