---
title: The symbol repair plan version shall be kibi.symbol-repair-plan.v1, by a regex proof
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
    - symbol_id: SYM-proof-symbol-repair-plan-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-symbol-repair-plan-version
  proves:
    - CLAIM-BC7A149A10F9A5EA
origin:
  kind: agent
  recorded_at: '2026-10-28T17:46:20.677Z'
id: TEST-proof-symbol-repair-plan-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bfc3726431da7b918668651b
    test_id: TEST-proof-symbol-repair-plan-version
    scope: unit
    outcome: passed
    code_snapshot: 56eee1707caa78737f9751c722c36d97d6b93523f57a8b6aef7f7bcada87ac9a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:47:02.597Z'
    finished_at: '2026-10-28T17:47:02.779Z'
    artifact_digest: 558a96d574225c88d485ce81409388c8e3bf4871ca1bbada366b6ab88fa2f8b2
    contract_hash: 7360ef11be87b0bfe9df8ffb8428d80b0f6b50ce466941a2262c0217fed86a7f
    binding_hash: a5d26a5884ae6c16469a7c26aa4e85937a9afa9af283a17d5b612426775fae72
    fingerprint: 796d29fe1e5f0ad50312339c3a465e9cd00bef455ed4707feb89d6a9355d1cda
    fingerprint_components:
      contract: 7360ef11be87b0bfe9df8ffb8428d80b0f6b50ce466941a2262c0217fed86a7f
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
      - symbol_id: SYM-proof-symbol-repair-plan-version
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
      test_id: TEST-proof-symbol-repair-plan-version
      pattern:
        symbol_id: SYM-symbol-repair-plan-version
        type: string
        value: kibi.symbol-repair-plan.v1
    certificate_digest: e0260fbccf1b0a2253c2224c2df292df734e1552ea527f44da95dab41fc38e77
    claim_bindings:
      - claim_key: CLAIM-BC7A149A10F9A5EA
        requirement_id: REQ-kibi-plan-document-versions
        fact_id: FACT-symbol-repair-plan-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.symbol-repair-plan.v1
---
Proves that the symbol repair plan version shall be kibi.symbol-repair-plan.v1, against the code Kibi reads at ingest.