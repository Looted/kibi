---
title: The proof contract version shall be kibi.proof-contract.v1, by a regex proof
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
    - symbol_id: SYM-proof-proof-contract-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-contract-version
  proves:
    - CLAIM-C6F779A76BBB4581
origin:
  kind: agent
  recorded_at: '2026-10-28T10:54:11.658Z'
id: TEST-proof-proof-contract-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1722c7f4d1fe39fbbd625cd6
    test_id: TEST-proof-proof-contract-version
    scope: unit
    outcome: passed
    code_snapshot: 00789ad267505753ad3bd92ec08fa414afd96e416d456489296135f6623c9e09
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T12:06:19.060Z'
    finished_at: '2026-10-28T12:06:19.194Z'
    artifact_digest: b5e2afe74c081c002587663b9b29d690d9eb95fbe50ba80ca7c3aaac8c209ec3
    contract_hash: df4d7c89a0a63d35dbce47bd4bbd0cbc054f7dc49f645c7eb28576ce3822c0de
    binding_hash: 1dda013412fc0ce4f3bf1b3a7d2d1f9e21dc31480cab471f196f84f85d85735d
    fingerprint: e6e5932ee212aacaf13b4d940bdf2974409b8aeb1543f5b1cd2d42066c9b5a14
    fingerprint_components:
      contract: df4d7c89a0a63d35dbce47bd4bbd0cbc054f7dc49f645c7eb28576ce3822c0de
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
      - symbol_id: SYM-proof-proof-contract-version
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
      test_id: TEST-proof-proof-contract-version
      pattern:
        symbol_id: SYM-proof-contract-version
        type: string
        value: kibi.proof-contract.v1
    certificate_digest: 23b171c696a0e9c74ef731e650383f12cbf28619c62570c8b216a6f2759e5c12
    claim_bindings:
      - claim_key: CLAIM-C6F779A76BBB4581
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-contract-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-contract.v1
---
Proves that the proof contract version shall be kibi.proof-contract.v1, against the code Kibi reads at ingest.