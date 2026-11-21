---
title: The repair plan version shall be kibi.repair-plan.v1, by a regex proof
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
    - symbol_id: SYM-proof-repair-plan-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-reqcompiler-repair-plan-version
  proves:
    - CLAIM-159F17EBC799D9E8
origin:
  kind: agent
  recorded_at: '2026-10-28T17:46:00.956Z'
id: TEST-proof-repair-plan-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3464648b3b60c77e9b6d050e
    test_id: TEST-proof-repair-plan-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 27ba975a6cc873da8318e3ed07fd4e780d43e3a3385ddc187e4d7081ce4b9a8e
    binding_hash: ccd19725e82d7fa120d739b750c965625bdba3b6b7ae321ed8d941afa0339f64
    fingerprint: 28eec9e213d0358d1d6c87399acf4c1aad968fee2ee0d787299dfc99d0e27663
    fingerprint_components:
      contract: 27ba975a6cc873da8318e3ed07fd4e780d43e3a3385ddc187e4d7081ce4b9a8e
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
      - symbol_id: SYM-proof-repair-plan-version
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
      test_id: TEST-proof-repair-plan-version
      pattern:
        symbol_id: SYM-reqcompiler-repair-plan-version
        type: string
        value: kibi.repair-plan.v1
    certificate_digest: c45e86698fef4914e9c99610fa65accd7012caa86ca6cc224dd654458ec2321c
    claim_bindings:
      - claim_key: CLAIM-159F17EBC799D9E8
        requirement_id: REQ-kibi-plan-document-versions
        fact_id: FACT-repair-plan-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.repair-plan.v1
---
Proves that the repair plan version shall be kibi.repair-plan.v1, against the code Kibi reads at ingest.