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
    receipt_id: PR-eadd4984ed67211bddd60fbe
    test_id: TEST-proof-rationale-missing-rule
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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