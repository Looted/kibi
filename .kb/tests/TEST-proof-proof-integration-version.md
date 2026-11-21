---
title: The proof integration version shall be kibi.proof-integration.v1, by a regex proof
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
    - symbol_id: SYM-proof-proof-integration-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-integration-version
  proves:
    - CLAIM-4CAA4B4BC92F633B
origin:
  kind: agent
  recorded_at: '2026-10-28T10:55:08.108Z'
id: TEST-proof-proof-integration-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7cbfbf04cb31da5bee7c9377
    test_id: TEST-proof-proof-integration-version
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: 489c49da98667ca43b35686d1c453cba7cb53c6a9156db1acd46dc01c9c2bcb9
    binding_hash: 72d9411fd864f7a3d8f3a0326bdafbea228db2265d0ec11ff20a6ce9d43a8467
    fingerprint: 2ae18490f5cf4d83e8da0ec70f306b99f8c74cddc0eb46209893733794b917de
    fingerprint_components:
      contract: 489c49da98667ca43b35686d1c453cba7cb53c6a9156db1acd46dc01c9c2bcb9
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
      - symbol_id: SYM-proof-proof-integration-version
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
      test_id: TEST-proof-proof-integration-version
      pattern:
        symbol_id: SYM-proof-integration-version
        type: string
        value: kibi.proof-integration.v1
    certificate_digest: 728d89ba1ee277fd12219642231fa2ed8939a16f1644637e23060c2bad5740e1
    claim_bindings:
      - claim_key: CLAIM-4CAA4B4BC92F633B
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-integration-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-integration.v1
---
Proves that the proof integration version shall be kibi.proof-integration.v1, against the code Kibi reads at ingest.