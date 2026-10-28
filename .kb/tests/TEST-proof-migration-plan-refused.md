---
title: A refused migration plan shall return the code MIGRATION_PLAN_REFUSED, by a regex proof
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
    - symbol_id: SYM-proof-migration-plan-refused
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-migration-plan-refused
  proves:
    - CLAIM-250EDD12651935F1
origin:
  kind: agent
  recorded_at: '2026-10-28T20:56:13.455Z'
id: TEST-proof-migration-plan-refused
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-348868203984d8d2e2c84c5e
    test_id: TEST-proof-migration-plan-refused
    scope: unit
    outcome: passed
    code_snapshot: 45723d09ccc2f66812136995f1e9ff533e86cd9788676661b6338c4073cf1090
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:58:08.676Z'
    finished_at: '2026-10-28T20:58:08.892Z'
    artifact_digest: 34bd5eaf0d160c793f2b9d4595595bae134d0261f3ea8ac2e648ef375d875697
    contract_hash: 75a20bc079bca249d5e4a92fdf44528d68faf626dea7180b93754f2b09f304c0
    binding_hash: af0462f7f09d25589ae0f665dc639ef800c7ddf7544bad4952c31d91d967e9ea
    fingerprint: 72f0ad1e23d51f8cd2fb69f000176fc8df2546441d98b7eaa8005d59eb7d211c
    fingerprint_components:
      contract: 75a20bc079bca249d5e4a92fdf44528d68faf626dea7180b93754f2b09f304c0
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
      - symbol_id: SYM-proof-migration-plan-refused
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
      test_id: TEST-proof-migration-plan-refused
      pattern:
        symbol_id: SYM-const-migration-plan-refused
        type: string
        value: MIGRATION_PLAN_REFUSED
    certificate_digest: 6e336eac0b96cd95fa4dc64a00be09521fb417f8dac9fe6afffa6193204b183e
    claim_bindings:
      - claim_key: CLAIM-250EDD12651935F1
        requirement_id: REQ-agent-migration-plan-versions
        fact_id: FACT-migration-plan-refused
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: MIGRATION_PLAN_REFUSED
---
Proves that a refused migration plan shall return the code MIGRATION_PLAN_REFUSED, against the code Kibi reads at ingest.