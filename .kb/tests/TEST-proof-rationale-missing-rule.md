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
    receipt_id: PR-6964c270ddd8c2c840e143d1
    test_id: TEST-proof-rationale-missing-rule
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:31.148Z'
    finished_at: '2026-11-04T18:30:31.284Z'
    artifact_digest: 1b933c145f51c973df20b1df4f6b5af27a67a66a67bbbd8bcbca52c83011901e
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
        requirement_id: REQ-kibi-origin-review-rule-names
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