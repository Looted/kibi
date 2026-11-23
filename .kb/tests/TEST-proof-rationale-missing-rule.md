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
    receipt_id: PR-001a81efb07045bf18981bee
    test_id: TEST-proof-rationale-missing-rule
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 5aac1ecbd699f527142fefc22d7b5021cbc177723d966a386ae45f1489b480dc
    binding_hash: 8380fc9a3b60e4a41a905aa2cd812a1cc11f3c27795bf691573360349b635e6d
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