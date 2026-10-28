---
title: The missing requirement rationale rule shall be requirement-rationale-missing, by a regex proof
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
    - symbol_id: SYM-proof-rationale-missing-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-requirement-rationale-missing-rule
  proves:
    - CLAIM-6A0DF299ADF1444D
origin:
  kind: agent
  recorded_at: '2026-10-28T20:21:47.275Z'
id: TEST-proof-rationale-missing-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-27ea6a52957000fe0659ce2b
    test_id: TEST-proof-rationale-missing-rule
    scope: unit
    outcome: passed
    code_snapshot: 1527b4cbcc3ade2f38aa86a1134590cb549c79eb8db739cb67bcdea1f5054201
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:24:39.785Z'
    finished_at: '2026-10-28T20:24:39.950Z'
    artifact_digest: 5c81562c7163baf355f869269abdb58e6717832a73315eca73d9d0dbc57b42ba
    contract_hash: 5aac1ecbd699f527142fefc22d7b5021cbc177723d966a386ae45f1489b480dc
    binding_hash: 4dac84ac42127a18668eac40476d4babbbfdd09e3d81604b91793079d2b1be65
    fingerprint: 7e1e15cbc33ccd56f0de1852b361aec7b8920fabb7b45295e2f469e68ba0db0c
    fingerprint_components:
      contract: 5aac1ecbd699f527142fefc22d7b5021cbc177723d966a386ae45f1489b480dc
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
      - symbol_id: SYM-proof-rationale-missing-rule
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
      test_id: TEST-proof-rationale-missing-rule
      pattern:
        symbol_id: SYM-const-requirement-rationale-missing-rule
        type: string
        value: requirement-rationale-missing
    certificate_digest: 32944a5cbb990080af9112b3e3eb69cc6fb5ef7eff6a44a4cad5de8300662b30
    claim_bindings:
      - claim_key: CLAIM-6A0DF299ADF1444D
        requirement_id: REQ-kibi-check-rule-names
        fact_id: FACT-rationale-missing-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: requirement-rationale-missing
---
Proves that the missing requirement rationale rule shall be requirement-rationale-missing, against the code Kibi reads at ingest.