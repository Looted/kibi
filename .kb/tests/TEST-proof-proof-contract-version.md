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
    receipt_id: PR-6d720a2c92dad78b9f5fe3d7
    test_id: TEST-proof-proof-contract-version
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: df4d7c89a0a63d35dbce47bd4bbd0cbc054f7dc49f645c7eb28576ce3822c0de
    binding_hash: 63208718b41f461de11aab403871c9f4fb36e83834f226c673cc136f4d10f080
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