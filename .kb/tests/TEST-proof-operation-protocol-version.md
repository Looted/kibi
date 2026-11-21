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
    receipt_id: PR-d1da8f56a41c8a2031cd2163
    test_id: TEST-proof-operation-protocol-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
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