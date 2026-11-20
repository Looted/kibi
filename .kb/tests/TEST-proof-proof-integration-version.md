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
    receipt_id: PR-53e1aa90fe6b7e0882cea955
    test_id: TEST-proof-proof-integration-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 489c49da98667ca43b35686d1c453cba7cb53c6a9156db1acd46dc01c9c2bcb9
    binding_hash: 1d4c293995461006d590d7649674dc3116c861c0fa662ca0ff8dadc4309bcb73
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