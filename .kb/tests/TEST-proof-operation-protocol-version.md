---
title: The Kibi operation protocol version shall be 1, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-operation-protocol-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-auto-B6653D50C50F
  proves:
    - CLAIM-F3C71A8D77F9F412
origin:
  kind: agent
  recorded_at: '2026-10-28T17:23:54.066Z'
id: TEST-proof-operation-protocol-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-da0134bf4e286039cdc838da
    test_id: TEST-proof-operation-protocol-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c0552d5323344aea3232cb26faa885a00eeff604ae6e61b4f0ce4105e3da8425
    binding_hash: 0b0e90c8b5b86e7499baed938070b8f5cd7b6fa86316342dec27cf164002ed3b
    fingerprint: 4fcd1d330d936f3a6b8d3cdacd8d20b471465841260ade7aa419e81ee9294dae
    fingerprint_components:
      contract: c0552d5323344aea3232cb26faa885a00eeff604ae6e61b4f0ce4105e3da8425
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
      - symbol_id: SYM-proof-operation-protocol-version
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-operation-protocol-version
      variable: protocol_version
      value_type: int
      assumptions:
        - operator: eq
          value: 1
      claim:
        operator: eq
        value: 1
    certificate_digest: cdcfdbd1878ae0c2dd1b859dd57b756c4d75141a1f0d4f9564448b49cdcc6f76
    claim_bindings:
      - claim_key: CLAIM-F3C71A8D77F9F412
        requirement_id: REQ-kibi-operation-page-sizes
        fact_id: FACT-operation-protocol-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 1
          value_type: int
          variable: protocol_version
---
Proves that the Kibi operation protocol version shall be 1, against the code Kibi reads at ingest.