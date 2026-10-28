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
    receipt_id: PR-75a25e40d3888e56356aa8c9
    test_id: TEST-proof-lock-takeover-visible
    scope: unit
    outcome: passed
    code_snapshot: 6c1d4b48c8c790bbc509e46899ccd457757c7db5641cef07df4b567f347481bf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:45:28.753Z'
    finished_at: '2026-10-28T20:45:28.876Z'
    artifact_digest: 13b6868c2a1995a2813385d3d594c45039ba4933fb615cdea082ef8d6c92fb9d
    contract_hash: c2448f55ef62b1ea5c882e5204e30275a9e069c558f87582b9cd2bcc08ce92eb
    binding_hash: 5871901843fcc0ffedc5a9d6c890b3073869158873ce00fbfceb5f4517278a28
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