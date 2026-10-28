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
    receipt_id: PR-836cf334311899fa2a12d50c
    test_id: TEST-proof-repair-plan-version
    scope: unit
    outcome: passed
    code_snapshot: 56eee1707caa78737f9751c722c36d97d6b93523f57a8b6aef7f7bcada87ac9a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:46:56.459Z'
    finished_at: '2026-10-28T17:46:56.656Z'
    artifact_digest: 84340539d188078300acb08604c641ddff8da47b31e7ae40fdac376ef6114756
    contract_hash: 27ba975a6cc873da8318e3ed07fd4e780d43e3a3385ddc187e4d7081ce4b9a8e
    binding_hash: cd2937c3136826969749bc53c71364745e0cd4a9ea6e9abcd0aea957ae30cb6a
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