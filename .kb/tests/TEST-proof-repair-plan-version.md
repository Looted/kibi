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
    receipt_id: PR-6db159b9071aee40060c52e2
    test_id: TEST-proof-repair-plan-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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